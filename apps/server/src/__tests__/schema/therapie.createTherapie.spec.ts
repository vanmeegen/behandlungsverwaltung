import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { graphql } from 'graphql';
import { auftraggeber, kinder, therapien } from '../../db/schema';
import { schema } from '../../schema';
import { createTestDb, type TestDb } from '../helpers/testDb';

const CREATE_THERAPIE = /* GraphQL */ `
  mutation CreateTherapie($input: TherapieInput!) {
    createTherapie(input: $input) {
      id
      kindId
      auftraggeberId
      form
      kommentar
      bewilligteBe
      taetigkeit
      gruppentherapie
    }
  }
`;

describe('createTherapie mutation (PRD §2.3, AC-TH-01)', () => {
  let ctx: TestDb;
  let kindId: number;
  let auftraggeberId: number;

  beforeEach(() => {
    ctx = createTestDb();
    const [k] = ctx.db
      .insert(kinder)
      .values({
        vorname: 'Anna',
        nachname: 'Musterfrau',
        geburtsdatum: new Date('2018-03-14T00:00:00.000Z'),
        strasse: 'Hauptstr.',
        hausnummer: '12',
        plz: '50667',
        stadt: 'Köln',
        aktenzeichen: 'K-2026-001',
      })
      .returning()
      .all();
    kindId = k!.id;
    const [a] = ctx.db
      .insert(auftraggeber)
      .values({
        typ: 'firma',
        firmenname: 'Jugendamt Köln',
        strasse: 'Kalker Hauptstr.',
        hausnummer: '247-273',
        plz: '51103',
        stadt: 'Köln',
        stundensatzCents: 4500,
        rechnungskopfText: 'Mein Honorar …:',
      })
      .returning()
      .all();
    auftraggeberId = a!.id;
  });

  afterEach(() => {
    ctx.cleanup();
  });

  async function run(input: Record<string, unknown>): Promise<Awaited<ReturnType<typeof graphql>>> {
    return graphql({
      schema,
      source: CREATE_THERAPIE,
      variableValues: { input },
      contextValue: { db: ctx.db, requestId: 'test' },
    });
  }

  function validInput(override: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
    return {
      kindId: String(kindId),
      auftraggeberId: String(auftraggeberId),
      form: 'lerntherapie',
      kommentar: null,
      bewilligteBe: 60,
      taetigkeit: 'lerntherapie',
      ...override,
    };
  }

  it('persists every column of a fully valid Therapie', async () => {
    const result = await run(validInput());
    expect(result.errors).toBeUndefined();
    const rows = ctx.db.select().from(therapien).all();
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.kindId).toBe(kindId);
    expect(row.auftraggeberId).toBe(auftraggeberId);
    expect(row.form).toBe('lerntherapie');
    expect(row.kommentar).toBeNull();
    expect(row.bewilligteBe).toBe(60);
    expect(row.taetigkeit).toBe('lerntherapie');
  });

  it('rejects form=sonstiges without kommentar with "Kommentar ist Pflicht bei Sonstiges" (AC-TH-01)', async () => {
    const result = await run(validInput({ form: 'sonstiges', kommentar: null }));
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0]?.message).toBe('Kommentar ist Pflicht bei Sonstiges');
    expect(result.errors?.[0]?.extensions?.code).toBe('VALIDATION_ERROR');
    expect(ctx.db.select().from(therapien).all()).toHaveLength(0);
  });

  it('persists form=sonstiges with a kommentar', async () => {
    const result = await run(
      validInput({ form: 'sonstiges', kommentar: 'Individuell abgestimmte Förderung' }),
    );
    expect(result.errors).toBeUndefined();
    const rows = ctx.db.select().from(therapien).all();
    expect(rows[0]?.form).toBe('sonstiges');
    expect(rows[0]?.kommentar).toBe('Individuell abgestimmte Förderung');
  });

  it('rejects bewilligteBe = 0', async () => {
    const result = await run(validInput({ bewilligteBe: 0 }));
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0]?.message).toBe('Bewilligte Behandlungseinheiten müssen > 0 sein');
  });

  it('rejects unknown therapie form', async () => {
    const result = await run(validInput({ form: 'logopaedie' }));
    expect(result.errors).toBeDefined();
  });

  it('persists null taetigkeit when absent', async () => {
    const result = await run(validInput({ taetigkeit: null }));
    expect(result.errors).toBeUndefined();
    const row = ctx.db.select().from(therapien).all()[0];
    expect(row?.taetigkeit).toBeNull();
  });

  it('rejects a non-enum taetigkeit string (GraphQL enum validation)', async () => {
    const result = await run(validInput({ taetigkeit: 'Mathe-Grundlagen' }));
    expect(result.errors).toBeDefined();
  });

  it('errors when kindId points at non-existent Kind (FK)', async () => {
    const result = await run(validInput({ kindId: '99999' }));
    expect(result.errors).toBeDefined();
  });

  it('stores gruppentherapie=false when omitted from input (AC-TH-04)', async () => {
    const input = validInput();
    delete input.gruppentherapie;
    const result = await run(input);
    expect(result.errors).toBeUndefined();
    const row = ctx.db.select().from(therapien).all()[0];
    expect(row?.gruppentherapie).toBe(false);
    const data = result.data as { createTherapie: { gruppentherapie: boolean } } | null;
    expect(data?.createTherapie.gruppentherapie).toBe(false);
  });

  it('stores gruppentherapie=true when explicitly set (AC-TH-04)', async () => {
    const result = await run(validInput({ gruppentherapie: true }));
    expect(result.errors).toBeUndefined();
    const row = ctx.db.select().from(therapien).all()[0];
    expect(row?.gruppentherapie).toBe(true);
    const data = result.data as { createTherapie: { gruppentherapie: boolean } } | null;
    expect(data?.createTherapie.gruppentherapie).toBe(true);
  });
});
