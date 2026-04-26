import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { graphql } from 'graphql';
import { auftraggeber } from '../../db/schema';
import { schema } from '../../schema';
import { createTestDb, type TestDb } from '../helpers/testDb';

const CREATE_AUFTRAGGEBER = /* GraphQL */ `
  mutation CreateAuftraggeber($input: AuftraggeberInput!) {
    createAuftraggeber(input: $input) {
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
      gruppe1Prozent
      gruppe1StundensatzCents
      gruppe2Prozent
      gruppe2StundensatzCents
      gruppe3Prozent
      gruppe3StundensatzCents
      gruppe4Prozent
      gruppe4StundensatzCents
    }
  }
`;

const validFirma = {
  typ: 'firma',
  firmenname: 'Jugendamt Köln',
  strasse: 'Kalker Hauptstr.',
  hausnummer: '247-273',
  plz: '51103',
  stadt: 'Köln',
  stundensatzCents: 4500,
  rechnungskopfText: 'Mein Honorar für die Teilmaßnahme … betrug im Monat …:',
};

const validPerson = {
  typ: 'person',
  vorname: 'Petra',
  nachname: 'Privatzahlerin',
  strasse: 'Lindenallee',
  hausnummer: '7',
  plz: '50667',
  stadt: 'Köln',
  stundensatzCents: 6000,
  rechnungskopfText: 'Mein Honorar für die Teilmaßnahme … betrug im Monat …:',
};

describe('createAuftraggeber mutation (PRD §2.2, AC-AG-01/02/03)', () => {
  let ctx: TestDb;

  beforeEach(() => {
    ctx = createTestDb();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  async function run(input: Record<string, unknown>): Promise<Awaited<ReturnType<typeof graphql>>> {
    return graphql({
      schema,
      source: CREATE_AUFTRAGGEBER,
      variableValues: { input },
      contextValue: { db: ctx.db, requestId: 'test' },
    });
  }

  describe('validation errors (every field required by §2.2)', () => {
    const cases: Array<{
      name: string;
      input: Record<string, unknown>;
      message: string;
    }> = [
      {
        name: 'Firma without firmenname',
        input: { ...validFirma, firmenname: '' },
        message: 'Firmenname Pflicht',
      },
      {
        name: 'Person without vorname',
        input: { ...validPerson, vorname: '' },
        message: 'Vor- und Nachname Pflicht',
      },
      {
        name: 'Person without nachname',
        input: { ...validPerson, nachname: '' },
        message: 'Vor- und Nachname Pflicht',
      },
      {
        name: 'empty PLZ',
        input: { ...validFirma, plz: '' },
        message: 'PLZ ist Pflicht',
      },
      {
        name: 'non-digit PLZ',
        input: { ...validFirma, plz: 'ABCDE' },
        message: 'PLZ muss fünf Ziffern enthalten',
      },
      {
        name: 'empty Straße',
        input: { ...validFirma, strasse: '' },
        message: 'Straße ist Pflicht',
      },
      {
        name: 'empty Hausnummer',
        input: { ...validFirma, hausnummer: '' },
        message: 'Hausnummer ist Pflicht',
      },
      {
        name: 'empty Stadt',
        input: { ...validFirma, stadt: '' },
        message: 'Stadt ist Pflicht',
      },
      {
        name: 'stundensatzCents = 0',
        input: { ...validFirma, stundensatzCents: 0 },
        message: 'Stundensatz muss > 0 sein',
      },
      {
        name: 'negative stundensatzCents',
        input: { ...validFirma, stundensatzCents: -1 },
        message: 'Stundensatz muss > 0 sein',
      },
    ];

    for (const { name, input, message } of cases) {
      it(`rejects ${name} with "${message}"`, async () => {
        const result = await run(input);
        expect(result.errors).toBeDefined();
        expect(result.errors?.[0]?.message).toBe(message);
        expect(result.errors?.[0]?.extensions?.code).toBe('VALIDATION_ERROR');

        const rows = ctx.db.select().from(auftraggeber).all();
        expect(rows).toHaveLength(0);
      });
    }
  });

  describe('happy paths', () => {
    it('creates a Firma with firmenname only (no vorname/nachname)', async () => {
      const result = await run(validFirma);
      expect(result.errors).toBeUndefined();
      const created = (result.data as { createAuftraggeber: Record<string, unknown> } | null)
        ?.createAuftraggeber;
      expect(created?.typ).toBe('firma');
      expect(created?.firmenname).toBe('Jugendamt Köln');
      expect(created?.vorname).toBeNull();
      expect(created?.nachname).toBeNull();

      const rows = ctx.db.select().from(auftraggeber).all();
      expect(rows).toHaveLength(1);
      const row = rows[0];
      expect(row?.typ).toBe('firma');
      expect(row?.firmenname).toBe('Jugendamt Köln');
      expect(row?.vorname).toBeNull();
      expect(row?.nachname).toBeNull();
      expect(row?.strasse).toBe('Kalker Hauptstr.');
      expect(row?.hausnummer).toBe('247-273');
      expect(row?.plz).toBe('51103');
      expect(row?.stadt).toBe('Köln');
      expect(row?.stundensatzCents).toBe(4500);
    });

    it('creates a Firma with abteilung and rechnungskopfText (AC-AG-04, AC-AG-05)', async () => {
      const result = await run({
        ...validFirma,
        abteilung: 'Wirtschaftliche Jugendhilfe',
        rechnungskopfText: 'Mein Honorar für …:',
      });
      expect(result.errors).toBeUndefined();
      const created = (result.data as { createAuftraggeber: Record<string, unknown> } | null)
        ?.createAuftraggeber;
      expect(created?.abteilung).toBe('Wirtschaftliche Jugendhilfe');
      expect(created?.rechnungskopfText).toBe('Mein Honorar für …:');

      const rows = ctx.db.select().from(auftraggeber).all();
      expect(rows[0]?.abteilung).toBe('Wirtschaftliche Jugendhilfe');
      expect(rows[0]?.rechnungskopfText).toBe('Mein Honorar für …:');
    });

    it('persists abteilung=null when omitted on Firma (AC-AG-04)', async () => {
      const result = await run(validFirma);
      expect(result.errors).toBeUndefined();
      const rows = ctx.db.select().from(auftraggeber).all();
      expect(rows[0]?.abteilung).toBeNull();
    });

    it('rejects creating an Auftraggeber with empty rechnungskopfText (AC-AG-05)', async () => {
      const result = await run({ ...validFirma, rechnungskopfText: '' });
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.message).toBe('Rechnungskopf-Text ist Pflicht');
      expect(result.errors?.[0]?.extensions?.code).toBe('VALIDATION_ERROR');
      const rows = ctx.db.select().from(auftraggeber).all();
      expect(rows).toHaveLength(0);
    });

    it('rejects a whitespace-only rechnungskopfText (AC-AG-05)', async () => {
      const result = await run({ ...validFirma, rechnungskopfText: '   ' });
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.message).toBe('Rechnungskopf-Text ist Pflicht');
    });

    it('creates a Person with rechnungskopfText (AC-AG-05)', async () => {
      const result = await run(validPerson);
      expect(result.errors).toBeUndefined();
      const rows = ctx.db.select().from(auftraggeber).all();
      expect(rows[0]?.rechnungskopfText).toBe(
        'Mein Honorar für die Teilmaßnahme … betrug im Monat …:',
      );
      expect(rows[0]?.abteilung).toBeNull();
    });

    it('creates a Person with vorname+nachname (no firmenname)', async () => {
      const result = await run(validPerson);
      expect(result.errors).toBeUndefined();
      const created = (result.data as { createAuftraggeber: Record<string, unknown> } | null)
        ?.createAuftraggeber;
      expect(created?.typ).toBe('person');
      expect(created?.vorname).toBe('Petra');
      expect(created?.nachname).toBe('Privatzahlerin');
      expect(created?.firmenname).toBeNull();

      const rows = ctx.db.select().from(auftraggeber).all();
      expect(rows).toHaveLength(1);
      const row = rows[0];
      expect(row?.typ).toBe('person');
      expect(row?.vorname).toBe('Petra');
      expect(row?.nachname).toBe('Privatzahlerin');
      expect(row?.firmenname).toBeNull();
      expect(row?.strasse).toBe('Lindenallee');
      expect(row?.hausnummer).toBe('7');
      expect(row?.plz).toBe('50667');
      expect(row?.stadt).toBe('Köln');
      expect(row?.stundensatzCents).toBe(6000);
    });

    it('round-trips all 8 Gruppen-Stundensatz fields (AC-AG-06)', async () => {
      const result = await run({
        ...validFirma,
        gruppe1Prozent: 80,
        gruppe1StundensatzCents: 3600,
        gruppe2Prozent: 75,
        gruppe2StundensatzCents: 3375,
        gruppe3Prozent: 70,
        gruppe3StundensatzCents: 3150,
        gruppe4Prozent: 60,
        gruppe4StundensatzCents: 2700,
      });
      expect(result.errors).toBeUndefined();
      const created = (result.data as { createAuftraggeber: Record<string, unknown> } | null)
        ?.createAuftraggeber;
      expect(created?.gruppe1Prozent).toBe(80);
      expect(created?.gruppe1StundensatzCents).toBe(3600);
      expect(created?.gruppe2Prozent).toBe(75);
      expect(created?.gruppe2StundensatzCents).toBe(3375);
      expect(created?.gruppe3Prozent).toBe(70);
      expect(created?.gruppe3StundensatzCents).toBe(3150);
      expect(created?.gruppe4Prozent).toBe(60);
      expect(created?.gruppe4StundensatzCents).toBe(2700);
    });

    it('all 8 Gruppe fields default to null when omitted (AC-AG-06)', async () => {
      const result = await run(validFirma);
      expect(result.errors).toBeUndefined();
      const created = (result.data as { createAuftraggeber: Record<string, unknown> } | null)
        ?.createAuftraggeber;
      expect(created?.gruppe1Prozent).toBeNull();
      expect(created?.gruppe1StundensatzCents).toBeNull();
      expect(created?.gruppe4StundensatzCents).toBeNull();
    });
  });
});
