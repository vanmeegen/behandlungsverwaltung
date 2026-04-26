import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { auftraggeber, kinder, therapien } from '../../db/schema';
import { createTestDb, type TestDb } from '../helpers/testDb';

describe('therapien — startdatum column (AC-TH-05)', () => {
  let ctx: TestDb;

  beforeEach(() => {
    ctx = createTestDb();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it('stores and retrieves startdatum as ISO date string', () => {
    const [k] = ctx.db
      .insert(kinder)
      .values({
        vorname: 'Anna',
        nachname: 'Musterfrau',
        geburtsdatum: new Date('2018-03-14'),
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
        rechnungskopfText: 'Mein Honorar …:',
      })
      .returning()
      .all();

    const startDate = new Date('2026-04-01');
    const [row] = ctx.db
      .insert(therapien)
      .values({
        kindId: k!.id,
        auftraggeberId: a!.id,
        form: 'lerntherapie',
        bewilligteBe: 60,
        startdatum: startDate,
      })
      .returning()
      .all();

    expect(row).toBeDefined();
    const loaded = ctx.db.select().from(therapien).where(eq(therapien.id, row!.id)).get();
    expect(loaded?.startdatum?.toISOString()).toMatch(/^2026-04-01/);
  });
});
