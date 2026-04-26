import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq, sql } from 'drizzle-orm';
import { graphql } from 'graphql';
import { auftraggeber, behandlungen, kinder, therapien } from '../../db/schema';
import { schema } from '../../schema';
import { createTestDb, type TestDb } from '../helpers/testDb';

const UPDATE_BEHANDLUNG = /* GraphQL */ `
  mutation UpdateBehandlung($id: ID!, $input: BehandlungInput!) {
    updateBehandlung(id: $id, input: $input) {
      id
      therapieId
      datum
      be
      taetigkeit
      gruppentherapie
    }
  }
`;

interface Seeded {
  kindId: number;
  auftraggeberId: number;
  therapieId: number;
  behandlungId: number;
}

// PHASE C TEMP: bis Phase B `therapien.gruppentherapie` ins Drizzle-Schema
// einträgt, setzen wir den Wert via raw SQL.
function setTherapieGruppentherapie(ctx: TestDb, therapieId: number, value: boolean): void {
  ctx.db.run(sql`UPDATE therapien SET gruppentherapie = ${value ? 1 : 0} WHERE id = ${therapieId}`);
}

function seed(ctx: TestDb): Seeded {
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
      rechnungskopfText: 'Mein Honorar:',
    })
    .returning()
    .all();
  const [t] = ctx.db
    .insert(therapien)
    .values({
      kindId: k!.id,
      auftraggeberId: a!.id,
      form: 'lerntherapie',
      bewilligteBe: 60,
      taetigkeit: 'lerntherapie',
      startdatum: new Date('2026-01-01'),
    })
    .returning()
    .all();
  const [b] = ctx.db
    .insert(behandlungen)
    .values({
      therapieId: t!.id,
      datum: new Date('2026-04-15T00:00:00.000Z'),
      be: 1,
      taetigkeit: 'lerntherapie',
      gruppentherapie: false,
    })
    .returning()
    .all();
  return {
    kindId: k!.id,
    auftraggeberId: a!.id,
    therapieId: t!.id,
    behandlungId: b!.id,
  };
}

describe('updateBehandlung mutation (PRD §2.4, AC-BEH-06, UC-3.9)', () => {
  let ctx: TestDb;
  let seeded: Seeded;

  beforeEach(() => {
    ctx = createTestDb();
    seeded = seed(ctx);
  });

  afterEach(() => {
    ctx.cleanup();
  });

  async function run(
    id: number,
    input: Record<string, unknown>,
  ): Promise<Awaited<ReturnType<typeof graphql>>> {
    return graphql({
      schema,
      source: UPDATE_BEHANDLUNG,
      variableValues: { id: String(id), input },
      contextValue: { db: ctx.db, requestId: 'test' },
    });
  }

  it('inherits gruppentherapie from Therapie when input is absent (AC-BEH-06)', async () => {
    setTherapieGruppentherapie(ctx, seeded.therapieId, true);
    const result = await run(seeded.behandlungId, {
      therapieId: String(seeded.therapieId),
      datum: '2026-04-20',
      be: 2,
    });
    expect(result.errors).toBeUndefined();
    const rows = ctx.db
      .select()
      .from(behandlungen)
      .where(eq(behandlungen.id, seeded.behandlungId))
      .all();
    expect(rows[0]?.gruppentherapie).toBe(true);
  });

  it('honors explicit gruppentherapie override (AC-BEH-06)', async () => {
    setTherapieGruppentherapie(ctx, seeded.therapieId, true);
    const result = await run(seeded.behandlungId, {
      therapieId: String(seeded.therapieId),
      datum: '2026-04-20',
      be: 2,
      gruppentherapie: false,
    });
    expect(result.errors).toBeUndefined();
    const rows = ctx.db
      .select()
      .from(behandlungen)
      .where(eq(behandlungen.id, seeded.behandlungId))
      .all();
    expect(rows[0]?.gruppentherapie).toBe(false);
  });
});
