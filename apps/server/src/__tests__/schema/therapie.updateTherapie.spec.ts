import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { graphql } from 'graphql';
import { auftraggeber, kinder, therapien } from '../../db/schema';
import { schema } from '../../schema';
import { createTestDb, type TestDb } from '../helpers/testDb';

const UPDATE_THERAPIE = /* GraphQL */ `
  mutation UpdateTherapie($id: ID!, $input: TherapieInput!) {
    updateTherapie(id: $id, input: $input) {
      id
      form
      kommentar
      bewilligteBe
      taetigkeit
    }
  }
`;

describe('updateTherapie mutation (PRD §2.3)', () => {
  let ctx: TestDb;
  let therapieId: number;
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
    const [t] = ctx.db
      .insert(therapien)
      .values({
        kindId,
        auftraggeberId,
        form: 'lerntherapie',
        kommentar: null,
        bewilligteBe: 60,
        taetigkeit: 'lerntherapie',
      })
      .returning()
      .all();
    therapieId = t!.id;
  });

  afterEach(() => {
    ctx.cleanup();
  });

  async function runUpdate(
    id: number,
    input: Record<string, unknown>,
  ): Promise<Awaited<ReturnType<typeof graphql>>> {
    return graphql({
      schema,
      source: UPDATE_THERAPIE,
      variableValues: { id: String(id), input },
      contextValue: { db: ctx.db, requestId: 'test' },
    });
  }

  it('updates bewilligteBe and taetigkeit', async () => {
    const result = await runUpdate(therapieId, {
      kindId: String(kindId),
      auftraggeberId: String(auftraggeberId),
      form: 'lerntherapie',
      kommentar: null,
      bewilligteBe: 80,
      taetigkeit: 'dyskalkulie',
    });
    expect(result.errors).toBeUndefined();
    const row = ctx.db.select().from(therapien).all()[0];
    expect(row?.bewilligteBe).toBe(80);
    expect(row?.taetigkeit).toBe('dyskalkulie');
  });

  it('returns NOT_FOUND for unknown id', async () => {
    const result = await runUpdate(999, {
      kindId: String(kindId),
      auftraggeberId: String(auftraggeberId),
      form: 'lerntherapie',
      bewilligteBe: 60,
    });
    expect(result.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
  });
});
