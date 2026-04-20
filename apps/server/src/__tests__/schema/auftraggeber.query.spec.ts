import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { graphql } from 'graphql';
import { auftraggeber } from '../../db/schema';
import { schema } from '../../schema';
import { createTestDb, type TestDb } from '../helpers/testDb';

const AUFTRAGGEBER_QUERY = /* GraphQL */ `
  query Auftraggeber {
    auftraggeber {
      id
      typ
      firmenname
      vorname
      nachname
      plz
    }
  }
`;

interface Row {
  id: string;
  typ: string;
  firmenname: string | null;
  vorname: string | null;
  nachname: string | null;
  plz: string;
}

describe('auftraggeber query (PRD §2.2, §3.6)', () => {
  let ctx: TestDb;

  beforeEach(() => {
    ctx = createTestDb();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  async function runQuery(): Promise<Row[]> {
    const result = await graphql({
      schema,
      source: AUFTRAGGEBER_QUERY,
      contextValue: { db: ctx.db, requestId: 'test' },
    });
    expect(result.errors).toBeUndefined();
    return (result.data as { auftraggeber: Row[] } | null)?.auftraggeber ?? [];
  }

  it('returns an empty list on a fresh database', async () => {
    expect(await runQuery()).toEqual([]);
  });

  it('returns seeded Auftraggeber ordered by sort key ascending', async () => {
    ctx.db
      .insert(auftraggeber)
      .values([
        {
          typ: 'firma',
          firmenname: 'Zuletzt GmbH',
          strasse: 'Weg',
          hausnummer: '1',
          plz: '10000',
          stadt: 'Berlin',
          stundensatzCents: 4500,
        },
        {
          typ: 'person',
          vorname: 'Petra',
          nachname: 'Meier',
          strasse: 'Pfad',
          hausnummer: '2',
          plz: '20000',
          stadt: 'Hamburg',
          stundensatzCents: 6000,
        },
        {
          typ: 'firma',
          firmenname: 'Jugendamt Köln',
          strasse: 'Str',
          hausnummer: '3',
          plz: '51103',
          stadt: 'Köln',
          stundensatzCents: 4500,
        },
      ])
      .run();

    const list = await runQuery();
    // sort key = firmenname ?? nachname (Person uses nachname)
    expect(list.map((r) => r.firmenname ?? r.nachname)).toEqual([
      'Jugendamt Köln',
      'Meier',
      'Zuletzt GmbH',
    ]);
  });
});
