import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { auftraggeber, behandlungen, kinder, therapien } from '../../db/schema';
import { createTestDb, type TestDb } from '../helpers/testDb';

describe('behandlungen — sonstiges_text column (AC-BEH-08)', () => {
  let ctx: TestDb;
  let therapieId: number;

  beforeEach(() => {
    ctx = createTestDb();
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
    const [t] = ctx.db
      .insert(therapien)
      .values({ kindId: k!.id, auftraggeberId: a!.id, form: 'sonstiges', bewilligteBe: 30 })
      .returning()
      .all();
    therapieId = t!.id;
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it('stores and retrieves sonstigesText', () => {
    const [row] = ctx.db
      .insert(behandlungen)
      .values({
        therapieId,
        datum: new Date('2026-04-15'),
        be: 2,
        sonstigesText: 'Hospitation Schule',
      })
      .returning()
      .all();

    expect(row).toBeDefined();
    const loaded = ctx.db.select().from(behandlungen).where(eq(behandlungen.id, row!.id)).get();
    expect(loaded?.sonstigesText).toBe('Hospitation Schule');
  });

  it('sonstigesText is nullable — omitting it leaves null', () => {
    const [row] = ctx.db
      .insert(behandlungen)
      .values({ therapieId, datum: new Date('2026-04-15'), be: 2 })
      .returning()
      .all();
    expect(row?.sonstigesText).toBeNull();
  });
});
