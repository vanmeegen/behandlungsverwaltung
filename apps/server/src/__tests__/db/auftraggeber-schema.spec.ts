import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { auftraggeber } from '../../db/schema';
import { createTestDb, type TestDb } from '../helpers/testDb';

describe('auftraggeber — Gruppentherapie-Stundensätze columns (AC-AG-06)', () => {
  let ctx: TestDb;

  beforeEach(() => {
    ctx = createTestDb();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it('stores and retrieves all 8 group fields', () => {
    const [row] = ctx.db
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
        gruppe1Prozent: 80,
        gruppe1StundensatzCents: 3600,
        gruppe2Prozent: 75,
        gruppe2StundensatzCents: 3375,
        gruppe3Prozent: 70,
        gruppe3StundensatzCents: 3150,
        gruppe4Prozent: 60,
        gruppe4StundensatzCents: 2700,
      })
      .returning()
      .all();

    expect(row).toBeDefined();
    const loaded = ctx.db.select().from(auftraggeber).where(eq(auftraggeber.id, row!.id)).get();

    expect(loaded?.gruppe1Prozent).toBe(80);
    expect(loaded?.gruppe1StundensatzCents).toBe(3600);
    expect(loaded?.gruppe2Prozent).toBe(75);
    expect(loaded?.gruppe2StundensatzCents).toBe(3375);
    expect(loaded?.gruppe3Prozent).toBe(70);
    expect(loaded?.gruppe3StundensatzCents).toBe(3150);
    expect(loaded?.gruppe4Prozent).toBe(60);
    expect(loaded?.gruppe4StundensatzCents).toBe(2700);
  });

  it('all 8 fields are nullable — omitting them leaves null', () => {
    const [row] = ctx.db
      .insert(auftraggeber)
      .values({
        typ: 'person',
        vorname: 'Petra',
        nachname: 'Test',
        strasse: 'Lindenallee',
        hausnummer: '7',
        plz: '50667',
        stadt: 'Köln',
        stundensatzCents: 6000,
        rechnungskopfText: 'Honorar:',
      })
      .returning()
      .all();

    expect(row?.gruppe1Prozent).toBeNull();
    expect(row?.gruppe1StundensatzCents).toBeNull();
    expect(row?.gruppe2Prozent).toBeNull();
    expect(row?.gruppe2StundensatzCents).toBeNull();
    expect(row?.gruppe3Prozent).toBeNull();
    expect(row?.gruppe3StundensatzCents).toBeNull();
    expect(row?.gruppe4Prozent).toBeNull();
    expect(row?.gruppe4StundensatzCents).toBeNull();
  });
});
