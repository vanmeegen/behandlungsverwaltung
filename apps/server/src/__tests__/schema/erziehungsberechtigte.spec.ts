import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { graphql } from 'graphql';
import { kinder } from '../../db/schema';
import { schema } from '../../schema';
import { createTestDb, type TestDb } from '../helpers/testDb';

const CREATE_EZB = /* GraphQL */ `
  mutation CreateEzb($input: ErziehungsberechtigterInput!) {
    createErziehungsberechtigter(input: $input) {
      id
      kindId
      slot
      vorname
      nachname
    }
  }
`;

const KIND_WITH_EZB = /* GraphQL */ `
  query KindWithEzb($id: ID!) {
    kind(id: $id) {
      id
      erziehungsberechtigte {
        id
        slot
        vorname
        nachname
      }
    }
  }
`;

describe('Erziehungsberechtigte mutations (AC-EZB-01, AC-EZB-02)', () => {
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

  async function run(
    source: string,
    variables?: Record<string, unknown>,
  ): Promise<Awaited<ReturnType<typeof graphql>>> {
    return graphql({
      schema,
      source,
      variableValues: variables,
      contextValue: { db: ctx.db, requestId: 'test' },
    });
  }

  it('creates EZB slot 1 and returns id + fields', async () => {
    const result = await run(CREATE_EZB, {
      input: { kindId: String(kindId), slot: 1, vorname: 'Maria', nachname: 'Musterfrau' },
    });
    expect(result.errors).toBeUndefined();
    const ezb = (result.data as { createErziehungsberechtigter: Record<string, unknown> })
      .createErziehungsberechtigter;
    expect(ezb?.vorname).toBe('Maria');
    expect(ezb?.slot).toBe(1);
    expect(ezb?.kindId).toBe(String(kindId));
  });

  it('rejects second slot 1 for the same Kind with EZB_SLOT_BELEGT', async () => {
    await run(CREATE_EZB, {
      input: { kindId: String(kindId), slot: 1, vorname: 'Maria', nachname: 'Musterfrau' },
    });
    const result = await run(CREATE_EZB, {
      input: { kindId: String(kindId), slot: 1, vorname: 'Petra', nachname: 'Andere' },
    });
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0]?.extensions?.code).toBe('EZB_SLOT_BELEGT');
  });

  it('Kind query returns erziehungsberechtigte sorted by slot', async () => {
    await run(CREATE_EZB, {
      input: { kindId: String(kindId), slot: 2, vorname: 'Petra', nachname: 'Zweite' },
    });
    await run(CREATE_EZB, {
      input: { kindId: String(kindId), slot: 1, vorname: 'Maria', nachname: 'Erste' },
    });
    const result = await run(KIND_WITH_EZB, { id: String(kindId) });
    expect(result.errors).toBeUndefined();
    const ezbs = (
      result.data as { kind: { erziehungsberechtigte: Array<{ slot: number; vorname: string }> } }
    ).kind.erziehungsberechtigte;
    expect(ezbs).toHaveLength(2);
    expect(ezbs[0]?.slot).toBe(1);
    expect(ezbs[1]?.slot).toBe(2);
  });
});
