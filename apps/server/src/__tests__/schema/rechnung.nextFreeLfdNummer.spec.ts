import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { graphql } from 'graphql';
import { auftraggeber, kinder, rechnungen } from '../../db/schema';
import { schema } from '../../schema';
import { createTestDb, type TestDb } from '../helpers/testDb';

const QUERY = /* GraphQL */ `
  query Next($year: Int!) {
    nextFreeRechnungsLfdNummer(year: $year)
  }
`;

async function runQuery(ctx: TestDb, year: number): Promise<number | undefined> {
  const result = await graphql({
    schema,
    source: QUERY,
    variableValues: { year },
    contextValue: { db: ctx.db, paths: ctx.paths, requestId: 'test' },
  });
  expect(result.errors).toBeUndefined();
  return (result.data as { nextFreeRechnungsLfdNummer: number } | null)?.nextFreeRechnungsLfdNummer;
}

async function seedRechnung(
  ctx: TestDb,
  index: number,
  nummer: string,
  jahr: number,
  monat: number,
): Promise<void> {
  const [a] = ctx.db
    .insert(auftraggeber)
    .values({
      typ: 'firma',
      firmenname: `Auftraggeber ${index}`,
      strasse: 'Str',
      hausnummer: '1',
      plz: '51103',
      stadt: 'Köln',
      stundensatzCents: 4500,
    })
    .returning()
    .all();
  const [k] = ctx.db
    .insert(kinder)
    .values({
      vorname: `Kind${index}`,
      nachname: `Nach${index}`,
      geburtsdatum: new Date('2018-03-14T00:00:00.000Z'),
      strasse: 'Hauptstr.',
      hausnummer: '12',
      plz: '50667',
      stadt: 'Köln',
      aktenzeichen: `K-${index}`,
    })
    .returning()
    .all();
  ctx.db
    .insert(rechnungen)
    .values({
      nummer,
      jahr,
      monat,
      kindId: k!.id,
      auftraggeberId: a!.id,
      stundensatzCentsSnapshot: 4500,
      gesamtCents: 9000,
      dateiname: `${nummer}.pdf`,
    })
    .run();
}

describe('nextFreeRechnungsLfdNummer query (PRD §3.2 / AC-RECH-15)', () => {
  let ctx: TestDb;

  beforeEach(() => {
    ctx = createTestDb();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it('returns 1 when no Rechnung exists', async () => {
    expect(await runQuery(ctx, 2026)).toBe(1);
  });

  it('returns max(NNNN)+1 in the given year', async () => {
    await seedRechnung(ctx, 1, 'RE-2026-03-0005', 2026, 3);
    await seedRechnung(ctx, 2, 'RE-2026-04-0007', 2026, 4);
    expect(await runQuery(ctx, 2026)).toBe(8);
  });

  it('ignores rechnungen of other years', async () => {
    await seedRechnung(ctx, 1, 'RE-2025-12-0099', 2025, 12);
    expect(await runQuery(ctx, 2026)).toBe(1);
  });

  it('rejects an invalid year with VALIDATION_ERROR', async () => {
    const result = await graphql({
      schema,
      source: QUERY,
      variableValues: { year: 99 },
      contextValue: { db: ctx.db, paths: ctx.paths, requestId: 'test' },
    });
    expect(result.errors?.[0]?.extensions?.code).toBe('VALIDATION_ERROR');
  });
});
