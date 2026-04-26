import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { sql } from 'drizzle-orm';
import { graphql } from 'graphql';
import { auftraggeber, behandlungen, kinder, therapien } from '../../db/schema';
import { schema } from '../../schema';
import { createTestDb, type TestDb } from '../helpers/testDb';

const BY_THERAPIE_QUERY = /* GraphQL */ `
  query BehandlungenByTherapie($therapieId: ID!) {
    behandlungenByTherapie(therapieId: $therapieId) {
      id
      datum
      be
      taetigkeit
    }
  }
`;

describe('behandlungenByTherapie query (PRD §2.4)', () => {
  let ctx: TestDb;
  let therapieId: number;
  let otherTherapieId: number;

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
    const [a] = ctx.db
      .insert(auftraggeber)
      .values({
        typ: 'firma',
        firmenname: 'Jugendamt Köln',
        strasse: 'Str',
        hausnummer: '1',
        plz: '51103',
        stadt: 'Köln',
        stundensatzCents: 4500,
        rechnungskopfText: 'Mein Honorar …:',
      })
      .returning()
      .all();
    const [t1] = ctx.db
      .insert(therapien)
      .values({
        kindId: k!.id,
        auftraggeberId: a!.id,
        form: 'lerntherapie',
        bewilligteBe: 60,
      })
      .returning()
      .all();
    therapieId = t1!.id;
    const [t2] = ctx.db
      .insert(therapien)
      .values({
        kindId: k!.id,
        auftraggeberId: a!.id,
        form: 'heilpaedagogik',
        bewilligteBe: 20,
      })
      .returning()
      .all();
    otherTherapieId = t2!.id;
    ctx.db
      .insert(behandlungen)
      .values([
        { therapieId, datum: new Date('2026-04-01T00:00:00.000Z'), be: 1 },
        { therapieId, datum: new Date('2026-04-15T00:00:00.000Z'), be: 2 },
        { therapieId, datum: new Date('2026-04-08T00:00:00.000Z'), be: 3 },
        { therapieId: otherTherapieId, datum: new Date('2026-04-10T00:00:00.000Z'), be: 1 },
      ])
      .run();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it('returns taetigkeit=null for legacy label values that are not valid enum members', async () => {
    ctx.db
      .insert(behandlungen)
      .values({
        therapieId,
        datum: new Date('2026-04-20T00:00:00.000Z'),
        be: 1,
        taetigkeit: 'lerntherapie',
      })
      .run();
    // Simulate old arbeitsthema free-text value that bypasses Drizzle enum constraint
    ctx.db.run(
      sql`UPDATE behandlungen SET taetigkeit = 'Lerntherapie' WHERE taetigkeit = 'lerntherapie'`,
    );
    const result = await graphql({
      schema,
      source: BY_THERAPIE_QUERY,
      variableValues: { therapieId: String(therapieId) },
      contextValue: { db: ctx.db, requestId: 'test' },
    });
    expect(result.errors).toBeUndefined();
    const rows = (result.data as { behandlungenByTherapie: Array<{ taetigkeit: unknown }> })
      .behandlungenByTherapie;
    const legacy = rows.find((r) => r.taetigkeit !== null && r.taetigkeit !== undefined);
    expect(legacy).toBeUndefined();
  });

  it('returns only the given Therapie rows, ordered by datum desc', async () => {
    const result = await graphql({
      schema,
      source: BY_THERAPIE_QUERY,
      variableValues: { therapieId: String(therapieId) },
      contextValue: { db: ctx.db, requestId: 'test' },
    });
    expect(result.errors).toBeUndefined();
    const rows = (result.data as { behandlungenByTherapie: Array<{ datum: string; be: number }> })
      .behandlungenByTherapie;
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.datum.slice(0, 10))).toEqual([
      '2026-04-15',
      '2026-04-08',
      '2026-04-01',
    ]);
  });
});
