import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { graphql } from 'graphql';
import { kinder } from '../../db/schema';
import { schema } from '../../schema';
import { createTestDb, type TestDb } from '../helpers/testDb';

const UPDATE_KIND = /* GraphQL */ `
  mutation UpdateKind($id: ID!, $input: KindInput!) {
    updateKind(id: $id, input: $input) {
      id
      vorname
      nachname
      geburtsdatum
      strasse
      hausnummer
      plz
      stadt
      aktenzeichen
    }
  }
`;

const seedInput = {
  vorname: 'Anna',
  nachname: 'Musterfrau',
  geburtsdatum: new Date('2018-03-14T00:00:00.000Z'),
  strasse: 'Hauptstr.',
  hausnummer: '12',
  plz: '50667',
  stadt: 'Köln',
  aktenzeichen: 'K-2026-001',
};

const inputShape = {
  vorname: 'Anna',
  nachname: 'Musterfrau',
  geburtsdatum: '2018-03-14',
  strasse: 'Hauptstr.',
  hausnummer: '12',
  plz: '50667',
  stadt: 'Köln',
  aktenzeichen: 'K-2026-001',
};

describe('updateKind mutation (PRD §2.1, AC-KIND-03)', () => {
  let ctx: TestDb;
  let kindId: number;

  beforeEach(() => {
    ctx = createTestDb();
    const rows = ctx.db.insert(kinder).values(seedInput).returning().all();
    kindId = rows[0]?.id ?? -1;
  });

  afterEach(() => {
    ctx.cleanup();
  });

  async function runUpdate(
    id: number,
    input: Record<string, unknown>,
  ): Promise<Awaited<ReturnType<typeof graphql>>> {
    return graphql({
      schema,
      source: UPDATE_KIND,
      variableValues: { id: String(id), input },
      contextValue: { db: ctx.db, requestId: 'test' },
    });
  }

  it('updates a single field and persists the new value', async () => {
    const result = await runUpdate(kindId, { ...inputShape, nachname: 'Beispiel' });
    expect(result.errors).toBeUndefined();
    const updated = (result.data as { updateKind: Record<string, unknown> } | null)?.updateKind;
    expect(updated?.nachname).toBe('Beispiel');

    const rows = ctx.db.select().from(kinder).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.nachname).toBe('Beispiel');
    expect(rows[0]?.vorname).toBe('Anna');
  });

  it('rejects an update with invalid plz', async () => {
    const result = await runUpdate(kindId, { ...inputShape, plz: 'ABCDE' });
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0]?.message).toBe('PLZ muss fünf Ziffern enthalten');
    expect(result.errors?.[0]?.extensions?.code).toBe('VALIDATION_ERROR');

    const rows = ctx.db.select().from(kinder).all();
    expect(rows[0]?.plz).toBe('50667');
  });

  it('errors with NOT_FOUND for an unknown id', async () => {
    const result = await runUpdate(999, inputShape);
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
  });
});
