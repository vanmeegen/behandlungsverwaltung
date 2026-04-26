import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { graphql } from 'graphql';
import { auftraggeber, kinder, rechnungen } from '../../db/schema';
import { schema } from '../../schema';
import { createTestDb, type TestDb } from '../helpers/testDb';

const RECHNUNGEN_QUERY = /* GraphQL */ `
  query Rechnungen($year: Int, $month: Int, $kindId: ID, $auftraggeberId: ID) {
    rechnungen(year: $year, month: $month, kindId: $kindId, auftraggeberId: $auftraggeberId) {
      id
      nummer
      jahr
      monat
      kindId
      auftraggeberId
      gesamtCents
      dateiname
    }
  }
`;

interface RechnungRow {
  id: string;
  nummer: string;
  jahr: number;
  monat: number;
  kindId: string;
  auftraggeberId: string;
  gesamtCents: number;
  dateiname: string;
}

describe('rechnungen query (PRD §3.4, UC-3.4)', () => {
  let ctx: TestDb;
  let annaId: number;
  let benId: number;
  let jugendamtId: number;
  let elternId: number;

  beforeEach(() => {
    ctx = createTestDb();

    const [anna, ben] = ctx.db
      .insert(kinder)
      .values([
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
        {
          vorname: 'Ben',
          nachname: 'Beispiel',
          geburtsdatum: new Date('2019-05-10T00:00:00.000Z'),
          strasse: 'Lindenallee',
          hausnummer: '7',
          plz: '51103',
          stadt: 'Köln',
          aktenzeichen: 'K-2026-002',
        },
      ])
      .returning()
      .all();
    annaId = anna!.id;
    benId = ben!.id;

    const [ja, eltern] = ctx.db
      .insert(auftraggeber)
      .values([
        {
          typ: 'firma',
          firmenname: 'Jugendamt Köln',
          strasse: 'Kalker Hauptstr.',
          hausnummer: '247-273',
          plz: '51103',
          stadt: 'Köln',
          stundensatzCents: 4500,
          rechnungskopfText: 'Mein Honorar …:',
        },
        {
          typ: 'person',
          vorname: 'Elke',
          nachname: 'Eltern',
          strasse: 'Privat',
          hausnummer: '1',
          plz: '50667',
          stadt: 'Köln',
          stundensatzCents: 5000,
          rechnungskopfText: 'Mein Honorar …:',
        },
      ])
      .returning()
      .all();
    jugendamtId = ja!.id;
    elternId = eltern!.id;

    ctx.db
      .insert(rechnungen)
      .values([
        {
          nummer: 'RE-2026-04-0001',
          jahr: 2026,
          monat: 4,
          kindId: annaId,
          auftraggeberId: jugendamtId,
          stundensatzCentsSnapshot: 4500,
          gesamtCents: 27000,
          dateiname: '2026-04-0001-Anna_Musterfrau.pdf',
        },
        {
          nummer: 'RE-2026-04-0002',
          jahr: 2026,
          monat: 4,
          kindId: benId,
          auftraggeberId: elternId,
          stundensatzCentsSnapshot: 5000,
          gesamtCents: 9000,
          dateiname: '2026-04-0002-Ben_Beispiel.pdf',
        },
        {
          nummer: 'RE-2026-05-0003',
          jahr: 2026,
          monat: 5,
          kindId: annaId,
          auftraggeberId: jugendamtId,
          stundensatzCentsSnapshot: 4500,
          gesamtCents: 18000,
          dateiname: '2026-05-0003-Anna_Musterfrau.pdf',
        },
      ])
      .run();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  async function runQuery(variables: Record<string, unknown> = {}): Promise<RechnungRow[]> {
    const result = await graphql({
      schema,
      source: RECHNUNGEN_QUERY,
      variableValues: variables,
      contextValue: { db: ctx.db, paths: ctx.paths, requestId: 'test' },
    });
    expect(result.errors).toBeUndefined();
    return (result.data as { rechnungen: RechnungRow[] } | null)?.rechnungen ?? [];
  }

  it('returns all Rechnungen ordered by nummer desc when unfiltered', async () => {
    const rows = await runQuery();
    expect(rows.map((r) => r.nummer)).toEqual([
      'RE-2026-05-0003',
      'RE-2026-04-0002',
      'RE-2026-04-0001',
    ]);
    expect(rows[0]?.gesamtCents).toBe(18000);
    expect(rows[0]?.dateiname).toBe('2026-05-0003-Anna_Musterfrau.pdf');
  });

  it('filters by Kind', async () => {
    const rows = await runQuery({ kindId: String(annaId) });
    expect(rows.map((r) => r.nummer)).toEqual(['RE-2026-05-0003', 'RE-2026-04-0001']);
  });

  it('filters by Auftraggeber', async () => {
    const rows = await runQuery({ auftraggeberId: String(elternId) });
    expect(rows.map((r) => r.nummer)).toEqual(['RE-2026-04-0002']);
  });

  it('filters by year + month', async () => {
    const rows = await runQuery({ year: 2026, month: 4 });
    expect(rows.map((r) => r.nummer)).toEqual(['RE-2026-04-0002', 'RE-2026-04-0001']);
  });

  it('combines filters (year + kind)', async () => {
    const rows = await runQuery({ year: 2026, month: 4, kindId: String(annaId) });
    expect(rows.map((r) => r.nummer)).toEqual(['RE-2026-04-0001']);
  });

  it('returns an empty list when no Rechnung matches', async () => {
    const rows = await runQuery({ year: 2027 });
    expect(rows).toEqual([]);
  });
});
