import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { auftraggeber, kinder, rechnungen } from '../../db/schema';
import {
  allocateNummer,
  allocateOrUseNummer,
  RechnungsnummerDuplicateError,
} from '../../services/nummer';
import { createTestDb, type TestDb } from '../helpers/testDb';

async function seedRechnungen(
  ctx: TestDb,
  nummern: Array<{ nummer: string; jahr: number; monat: number }>,
): Promise<void> {
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
  // One distinct Kind per row to avoid the unique (jahr, monat, kindId, auftraggeberId) index.
  for (let i = 0; i < nummern.length; i++) {
    const row = nummern[i]!;
    const [k] = ctx.db
      .insert(kinder)
      .values({
        vorname: `Kind${i}`,
        nachname: `Nach${i}`,
        geburtsdatum: new Date('2018-03-14T00:00:00.000Z'),
        strasse: 'Hauptstr.',
        hausnummer: '12',
        plz: '50667',
        stadt: 'Köln',
        aktenzeichen: `K-${i}`,
      })
      .returning()
      .all();
    ctx.db
      .insert(rechnungen)
      .values({
        nummer: row.nummer,
        jahr: row.jahr,
        monat: row.monat,
        kindId: k!.id,
        auftraggeberId: a!.id,
        stundensatzCentsSnapshot: 4500,
        gesamtCents: 9000,
        dateiname: `${row.nummer}.pdf`,
      })
      .run();
  }
}

describe('allocateNummer (PRD §4)', () => {
  let ctx: TestDb;

  beforeEach(() => {
    ctx = createTestDb();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it('returns 2026-04-0001 on an empty DB for April 2026 (AC-RECH-03)', async () => {
    expect(allocateNummer(ctx.db, 2026, 4)).toBe('RE-2026-04-0001');
  });

  it('continues the yearly counter across months (AC-RECH-04)', async () => {
    await seedRechnungen(ctx, [
      { nummer: 'RE-2026-04-0001', jahr: 2026, monat: 4 },
      { nummer: 'RE-2026-04-0002', jahr: 2026, monat: 4 },
    ]);
    expect(allocateNummer(ctx.db, 2026, 5)).toBe('RE-2026-05-0003');
  });

  it('resets the counter on a new year', async () => {
    await seedRechnungen(ctx, [{ nummer: 'RE-2025-12-0099', jahr: 2025, monat: 12 }]);
    expect(allocateNummer(ctx.db, 2026, 1)).toBe('RE-2026-01-0001');
  });

  it('ignores invoices from other years when computing the next lfd', async () => {
    await seedRechnungen(ctx, [
      { nummer: 'RE-2025-11-0050', jahr: 2025, monat: 11 },
      { nummer: 'RE-2026-02-0001', jahr: 2026, monat: 2 },
    ]);
    expect(allocateNummer(ctx.db, 2026, 3)).toBe('RE-2026-03-0002');
  });
});

describe('allocateOrUseNummer (PRD §3.2 / AC-RECH-15)', () => {
  let ctx: TestDb;

  beforeEach(() => {
    ctx = createTestDb();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it('falls back to max+1 when no lfdNummer is supplied', () => {
    expect(allocateOrUseNummer(ctx.db, 2026, 4)).toBe('RE-2026-04-0001');
  });

  it('uses the supplied lfdNummer when free', async () => {
    expect(allocateOrUseNummer(ctx.db, 2026, 4, 7)).toBe('RE-2026-04-0007');
  });

  it('throws RechnungsnummerDuplicateError when the lfdNummer is already used in the year', async () => {
    await seedRechnungen(ctx, [{ nummer: 'RE-2026-03-0007', jahr: 2026, monat: 3 }]);
    expect(() => allocateOrUseNummer(ctx.db, 2026, 4, 7)).toThrow(RechnungsnummerDuplicateError);
  });

  it('allows the same lfdNummer in a different year', async () => {
    await seedRechnungen(ctx, [{ nummer: 'RE-2025-03-0007', jahr: 2025, monat: 3 }]);
    expect(allocateOrUseNummer(ctx.db, 2026, 4, 7)).toBe('RE-2026-04-0007');
  });
});
