import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { graphql } from 'graphql';
import { kinder } from '../../db/schema';
import { schema } from '../../schema';
import { createTestDb, type TestDb } from '../helpers/testDb';

const CREATE_KIND = /* GraphQL */ `
  mutation CreateKind($input: KindInput!) {
    createKind(input: $input) {
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

const validInput = {
  vorname: 'Anna',
  nachname: 'Musterfrau',
  geburtsdatum: '2018-03-14',
  strasse: 'Hauptstr.',
  hausnummer: '12',
  plz: '50667',
  stadt: 'Köln',
  aktenzeichen: 'K-2026-001',
};

describe('createKind mutation (PRD §2.1, AC-KIND-02)', () => {
  let ctx: TestDb;

  beforeEach(() => {
    ctx = createTestDb();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  async function runCreate(
    input: Record<string, unknown>,
  ): Promise<Awaited<ReturnType<typeof graphql>>> {
    return graphql({
      schema,
      source: CREATE_KIND,
      variableValues: { input },
      contextValue: { db: ctx.db, requestId: 'test' },
    });
  }

  describe('validation errors (every field required by §2.1)', () => {
    const cases: Array<{
      name: string;
      override: Partial<typeof validInput>;
      message: string;
    }> = [
      { name: 'empty PLZ', override: { plz: '' }, message: 'PLZ ist Pflicht' },
      {
        name: 'non-digit PLZ',
        override: { plz: 'ABCDE' },
        message: 'PLZ muss fünf Ziffern enthalten',
      },
      {
        name: '4-digit PLZ',
        override: { plz: '1234' },
        message: 'PLZ muss fünf Ziffern enthalten',
      },
      { name: 'empty Vorname', override: { vorname: '' }, message: 'Vorname ist Pflicht' },
      { name: 'empty Nachname', override: { nachname: '' }, message: 'Nachname ist Pflicht' },
      {
        name: 'empty Geburtsdatum',
        override: { geburtsdatum: '' },
        message: 'Geburtsdatum ist Pflicht',
      },
      {
        name: 'malformed Geburtsdatum',
        override: { geburtsdatum: '14.03.2018' },
        message: 'Geburtsdatum ist ungültig',
      },
      {
        name: 'future Geburtsdatum',
        override: { geburtsdatum: '2999-12-31' },
        message: 'Geburtsdatum darf nicht in der Zukunft liegen',
      },
      { name: 'empty Straße', override: { strasse: '' }, message: 'Straße ist Pflicht' },
      {
        name: 'empty Hausnummer',
        override: { hausnummer: '' },
        message: 'Hausnummer ist Pflicht',
      },
      { name: 'empty Stadt', override: { stadt: '' }, message: 'Stadt ist Pflicht' },
      {
        name: 'empty Aktenzeichen',
        override: { aktenzeichen: '' },
        message: 'Aktenzeichen ist Pflicht',
      },
    ];

    for (const { name, override, message } of cases) {
      it(`rejects ${name} with "${message}"`, async () => {
        const result = await runCreate({ ...validInput, ...override });
        expect(result.errors).toBeDefined();
        expect(result.errors?.[0]?.message).toBe(message);
        expect(result.errors?.[0]?.extensions?.code).toBe('VALIDATION_ERROR');

        const rows = ctx.db.select().from(kinder).all();
        expect(rows).toHaveLength(0);
      });
    }
  });

  describe('happy path (all 8 fields, byte-for-byte persistence)', () => {
    it('returns the created Kind via GraphQL', async () => {
      const result = await runCreate(validInput);
      expect(result.errors).toBeUndefined();
      const created = (result.data as { createKind: Record<string, unknown> } | null)?.createKind;
      expect(created).toBeDefined();
      expect(created?.vorname).toBe('Anna');
      expect(created?.nachname).toBe('Musterfrau');
      expect(created?.strasse).toBe('Hauptstr.');
      expect(created?.hausnummer).toBe('12');
      expect(created?.plz).toBe('50667');
      expect(created?.stadt).toBe('Köln');
      expect(created?.aktenzeichen).toBe('K-2026-001');
      expect(typeof created?.geburtsdatum).toBe('string');
      expect((created?.geburtsdatum as string).startsWith('2018-03-14')).toBe(true);
    });

    it('persists every column of kinder byte-for-byte', async () => {
      await runCreate(validInput);
      const rows = ctx.db.select().from(kinder).all();
      expect(rows).toHaveLength(1);
      const row = rows[0];
      expect(row?.vorname).toBe('Anna');
      expect(row?.nachname).toBe('Musterfrau');
      expect(row?.geburtsdatum.toISOString().slice(0, 10)).toBe('2018-03-14');
      expect(row?.strasse).toBe('Hauptstr.');
      expect(row?.hausnummer).toBe('12');
      expect(row?.plz).toBe('50667');
      expect(row?.stadt).toBe('Köln');
      expect(row?.aktenzeichen).toBe('K-2026-001');
    });
  });
});
