import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { kinder } from '../../db/schema';
import { erziehungsberechtigte } from '../../db/schema/erziehungsberechtigte';
import { createTestDb, type TestDb } from '../helpers/testDb';

describe('erziehungsberechtigte table (AC-EZB-01, AC-EZB-02)', () => {
  let ctx: TestDb;
  let kindId: number;

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
    kindId = k!.id;
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it('stores and retrieves an EZB with all fields', () => {
    const [row] = ctx.db
      .insert(erziehungsberechtigte)
      .values({
        kindId,
        slot: 1,
        vorname: 'Maria',
        nachname: 'Musterfrau',
        strasse: 'Hauptstr.',
        hausnummer: '12',
        plz: '50667',
        stadt: 'Köln',
        email1: 'maria@example.com',
        telefon1: '0221-123456',
      })
      .returning()
      .all();

    expect(row).toBeDefined();
    expect(row?.vorname).toBe('Maria');
    expect(row?.nachname).toBe('Musterfrau');
    expect(row?.slot).toBe(1);
    expect(row?.kindId).toBe(kindId);
  });

  it('UNIQUE(kind_id, slot) rejects two EZB in the same slot', () => {
    ctx.db
      .insert(erziehungsberechtigte)
      .values({ kindId, slot: 1, vorname: 'Maria', nachname: 'Musterfrau' })
      .run();
    expect(() => {
      ctx.db
        .insert(erziehungsberechtigte)
        .values({ kindId, slot: 1, vorname: 'Petra', nachname: 'Andere' })
        .run();
    }).toThrow();
  });
});
