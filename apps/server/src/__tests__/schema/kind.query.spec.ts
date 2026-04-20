import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { graphql } from 'graphql';
import { kinder } from '../../db/schema';
import { schema } from '../../schema';
import { createTestDb, type TestDb } from '../helpers/testDb';

const KINDER_QUERY = /* GraphQL */ `
  query Kinder {
    kinder {
      id
      vorname
      nachname
      plz
    }
  }
`;

interface KindRow {
  id: string;
  vorname: string;
  nachname: string;
  plz: string;
}

describe('kinder query (PRD §2.1, §3.5)', () => {
  let ctx: TestDb;

  beforeEach(() => {
    ctx = createTestDb();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  async function runQuery(): Promise<KindRow[]> {
    const result = await graphql({
      schema,
      source: KINDER_QUERY,
      contextValue: { db: ctx.db, requestId: 'test' },
    });
    expect(result.errors).toBeUndefined();
    return (result.data as { kinder: KindRow[] } | null)?.kinder ?? [];
  }

  it('returns an empty list on a fresh database', async () => {
    const kinderList = await runQuery();
    expect(kinderList).toEqual([]);
  });

  it('returns seeded Kinder ordered by nachname ascending', async () => {
    ctx.db
      .insert(kinder)
      .values([
        {
          vorname: 'Ben',
          nachname: 'Zimmermann',
          geburtsdatum: new Date('2019-05-10T00:00:00.000Z'),
          strasse: 'Lindenallee',
          hausnummer: '7',
          plz: '51103',
          stadt: 'Köln',
          aktenzeichen: 'K-2026-002',
        },
        {
          vorname: 'Anna',
          nachname: 'Musterfrau',
          geburtsdatum: new Date('2018-03-14T00:00:00.000Z'),
          strasse: 'Hauptstr.',
          hausnummer: '12',
          plz: '50667',
          stadt: 'Köln',
          aktenzeichen: 'K-2026-001',
        },
      ])
      .run();

    const kinderList = await runQuery();
    expect(kinderList.map((k) => k.nachname)).toEqual(['Musterfrau', 'Zimmermann']);
    expect(kinderList[0]?.vorname).toBe('Anna');
    expect(kinderList[0]?.plz).toBe('50667');
    expect(kinderList[1]?.vorname).toBe('Ben');
    expect(kinderList[1]?.plz).toBe('51103');
  });

  it('breaks nachname ties by vorname ascending', async () => {
    ctx.db
      .insert(kinder)
      .values([
        {
          vorname: 'Clara',
          nachname: 'Musterfrau',
          geburtsdatum: new Date('2018-03-14T00:00:00.000Z'),
          strasse: 'Hauptstr.',
          hausnummer: '12',
          plz: '50667',
          stadt: 'Köln',
          aktenzeichen: 'K-2026-003',
        },
        {
          vorname: 'Anna',
          nachname: 'Musterfrau',
          geburtsdatum: new Date('2018-03-14T00:00:00.000Z'),
          strasse: 'Hauptstr.',
          hausnummer: '12',
          plz: '50667',
          stadt: 'Köln',
          aktenzeichen: 'K-2026-001',
        },
      ])
      .run();

    const kinderList = await runQuery();
    expect(kinderList.map((k) => k.vorname)).toEqual(['Anna', 'Clara']);
  });
});
