import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { graphql } from 'graphql';
import { auftraggeber } from '../../db/schema';
import { schema } from '../../schema';
import { createTestDb, type TestDb } from '../helpers/testDb';

const UPDATE_AUFTRAGGEBER = /* GraphQL */ `
  mutation UpdateAuftraggeber($id: ID!, $input: AuftraggeberInput!) {
    updateAuftraggeber(id: $id, input: $input) {
      id
      typ
      firmenname
      vorname
      nachname
      strasse
      hausnummer
      plz
      stadt
      stundensatzCents
      abteilung
      rechnungskopfText
    }
  }
`;

const seedFirma = {
  typ: 'firma' as const,
  firmenname: 'Jugendamt Köln',
  vorname: null,
  nachname: null,
  strasse: 'Kalker Hauptstr.',
  hausnummer: '247-273',
  plz: '51103',
  stadt: 'Köln',
  stundensatzCents: 4500,
  abteilung: null,
  rechnungskopfText: 'Mein Honorar für …:',
};

const inputShape = {
  typ: 'firma',
  firmenname: 'Jugendamt Köln',
  strasse: 'Kalker Hauptstr.',
  hausnummer: '247-273',
  plz: '51103',
  stadt: 'Köln',
  stundensatzCents: 4500,
  rechnungskopfText: 'Mein Honorar für …:',
};

describe('updateAuftraggeber mutation (PRD §2.2)', () => {
  let ctx: TestDb;
  let agId: number;

  beforeEach(() => {
    ctx = createTestDb();
    const rows = ctx.db.insert(auftraggeber).values(seedFirma).returning().all();
    agId = rows[0]?.id ?? -1;
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
      source: UPDATE_AUFTRAGGEBER,
      variableValues: { id: String(id), input },
      contextValue: { db: ctx.db, requestId: 'test' },
    });
  }

  it('updates a single field and persists the new value', async () => {
    const result = await runUpdate(agId, { ...inputShape, stundensatzCents: 5500 });
    expect(result.errors).toBeUndefined();
    const rows = ctx.db.select().from(auftraggeber).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.stundensatzCents).toBe(5500);
    expect(rows[0]?.firmenname).toBe('Jugendamt Köln');
  });

  it('switches typ from Firma to Person and clears firmenname', async () => {
    const result = await runUpdate(agId, {
      typ: 'person',
      vorname: 'Petra',
      nachname: 'Privatzahlerin',
      strasse: 'Lindenallee',
      hausnummer: '7',
      plz: '50667',
      stadt: 'Köln',
      stundensatzCents: 6000,
      rechnungskopfText: 'Mein Honorar …:',
    });
    expect(result.errors).toBeUndefined();
    const rows = ctx.db.select().from(auftraggeber).all();
    expect(rows[0]?.typ).toBe('person');
    expect(rows[0]?.vorname).toBe('Petra');
    expect(rows[0]?.nachname).toBe('Privatzahlerin');
    expect(rows[0]?.firmenname).toBeNull();
    expect(rows[0]?.abteilung).toBeNull();
  });

  it('updates abteilung and rechnungskopfText round-trip (AC-AG-04, AC-AG-05)', async () => {
    const result = await runUpdate(agId, {
      ...inputShape,
      abteilung: 'Abteilung X',
      rechnungskopfText: 'Neuer Kopftext',
    });
    expect(result.errors).toBeUndefined();
    const rows = ctx.db.select().from(auftraggeber).all();
    expect(rows[0]?.abteilung).toBe('Abteilung X');
    expect(rows[0]?.rechnungskopfText).toBe('Neuer Kopftext');
  });

  it('rejects update with empty rechnungskopfText (AC-AG-05)', async () => {
    const result = await runUpdate(agId, { ...inputShape, rechnungskopfText: '' });
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0]?.message).toBe('Rechnungskopf-Text ist Pflicht');
  });

  it('rejects an update with invalid plz', async () => {
    const result = await runUpdate(agId, { ...inputShape, plz: 'ABCDE' });
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0]?.message).toBe('PLZ muss fünf Ziffern enthalten');
    expect(result.errors?.[0]?.extensions?.code).toBe('VALIDATION_ERROR');

    const rows = ctx.db.select().from(auftraggeber).all();
    expect(rows[0]?.plz).toBe('51103');
  });

  it('errors with NOT_FOUND for an unknown id', async () => {
    const result = await runUpdate(999, inputShape);
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
  });
});
