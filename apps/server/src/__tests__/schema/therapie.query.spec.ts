import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { graphql } from 'graphql';
import { auftraggeber, kinder, therapien } from '../../db/schema';
import { schema } from '../../schema';
import { createTestDb, type TestDb } from '../helpers/testDb';

const THERAPIEN_QUERY = /* GraphQL */ `
  query Therapien {
    therapien {
      id
      form
      geleisteteBe
    }
  }
`;

const GELEISTETE_BE_QUERY = /* GraphQL */ `
  query TherapieGeleisteteBe($kindId: ID!) {
    therapienByKind(kindId: $kindId) {
      id
      geleisteteBe
    }
  }
`;

const BY_KIND_QUERY = /* GraphQL */ `
  query TherapienByKind($kindId: ID!) {
    therapienByKind(kindId: $kindId) {
      id
      kindId
      form
    }
  }
`;

const BY_AG_QUERY = /* GraphQL */ `
  query TherapienByAg($auftraggeberId: ID!) {
    therapienByAuftraggeber(auftraggeberId: $auftraggeberId) {
      id
      auftraggeberId
      form
    }
  }
`;

describe('therapien queries (PRD §3.7)', () => {
  let ctx: TestDb;
  let kindAId: number;
  let kindBId: number;
  let agXId: number;
  let agYId: number;

  beforeEach(() => {
    ctx = createTestDb();
    const [kA] = ctx.db
      .insert(kinder)
      .values({
        vorname: 'Anna',
        nachname: 'Musterfrau',
        geburtsdatum: new Date('2018-03-14T00:00:00.000Z'),
        strasse: 'Hauptstr.',
        hausnummer: '12',
        plz: '50667',
        stadt: 'Köln',
        aktenzeichen: 'K-2026-001',
      })
      .returning()
      .all();
    kindAId = kA!.id;
    const [kB] = ctx.db
      .insert(kinder)
      .values({
        vorname: 'Ben',
        nachname: 'Beispiel',
        geburtsdatum: new Date('2019-05-10T00:00:00.000Z'),
        strasse: 'Weg',
        hausnummer: '1',
        plz: '51103',
        stadt: 'Köln',
        aktenzeichen: 'K-2026-002',
      })
      .returning()
      .all();
    kindBId = kB!.id;
    const [aX] = ctx.db
      .insert(auftraggeber)
      .values({
        typ: 'firma',
        firmenname: 'Jugendamt Köln',
        strasse: 'Str',
        hausnummer: '1',
        plz: '51103',
        stadt: 'Köln',
        stundensatzCents: 4500,
        rechnungskopfText: 'Mein Honorar …:',
      })
      .returning()
      .all();
    agXId = aX!.id;
    const [aY] = ctx.db
      .insert(auftraggeber)
      .values({
        typ: 'firma',
        firmenname: 'Anderes Amt',
        strasse: 'Str',
        hausnummer: '2',
        plz: '10000',
        stadt: 'Berlin',
        stundensatzCents: 5000,
        rechnungskopfText: 'Mein Honorar …:',
      })
      .returning()
      .all();
    agYId = aY!.id;
    ctx.db
      .insert(therapien)
      .values([
        { kindId: kindAId, auftraggeberId: agXId, form: 'lerntherapie', bewilligteBe: 60 },
        { kindId: kindAId, auftraggeberId: agYId, form: 'heilpaedagogik', bewilligteBe: 40 },
        { kindId: kindBId, auftraggeberId: agXId, form: 'dyskalkulie', bewilligteBe: 30 },
      ])
      .run();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  async function runQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const result = await graphql({
      schema,
      source: query,
      variableValues: variables,
      contextValue: { db: ctx.db, requestId: 'test' },
    });
    expect(result.errors).toBeUndefined();
    return result.data as T;
  }

  it('therapien returns all rows', async () => {
    const data = await runQuery<{ therapien: unknown[] }>(THERAPIEN_QUERY);
    expect(data.therapien).toHaveLength(3);
  });

  it('therapienByKind returns only rows for that Kind', async () => {
    const data = await runQuery<{ therapienByKind: Array<{ kindId: string; form: string }> }>(
      BY_KIND_QUERY,
      { kindId: String(kindAId) },
    );
    expect(data.therapienByKind).toHaveLength(2);
    for (const r of data.therapienByKind) {
      expect(r.kindId).toBe(String(kindAId));
    }
  });

  it('therapienByAuftraggeber returns only rows for that Auftraggeber', async () => {
    const data = await runQuery<{
      therapienByAuftraggeber: Array<{ auftraggeberId: string; form: string }>;
    }>(BY_AG_QUERY, { auftraggeberId: String(agXId) });
    expect(data.therapienByAuftraggeber).toHaveLength(2);
    for (const r of data.therapienByAuftraggeber) {
      expect(r.auftraggeberId).toBe(String(agXId));
    }
  });
});

describe('therapie.geleisteteBe (AC-TH-06)', () => {
  let ctx: TestDb;
  let kindId: number;
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
    kindId = k!.id;
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
      .values({ kindId, auftraggeberId: a!.id, form: 'lerntherapie', bewilligteBe: 60 })
      .returning()
      .all();
    therapieId = t!.id;
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it('returns 0 for a Therapie with no Behandlungen', async () => {
    const result = await graphql({
      schema,
      source: GELEISTETE_BE_QUERY,
      variableValues: { kindId: String(kindId) },
      contextValue: { db: ctx.db, requestId: 'test' },
    });
    expect(result.errors).toBeUndefined();
    const rows = (result.data as { therapienByKind: Array<{ id: string; geleisteteBe: number }> })
      .therapienByKind;
    const t = rows.find((r) => r.id === String(therapieId));
    expect(t?.geleisteteBe).toBe(0);
  });

  it('returns sum of BE across three Behandlungen (3×2=6)', async () => {
    const { behandlungen: behandlungenTbl } = await import('../../db/schema');
    for (const d of ['2026-04-01', '2026-04-15', '2026-04-29']) {
      ctx.db
        .insert(behandlungenTbl)
        .values({ therapieId, datum: new Date(d), be: 2 })
        .run();
    }
    const result = await graphql({
      schema,
      source: GELEISTETE_BE_QUERY,
      variableValues: { kindId: String(kindId) },
      contextValue: { db: ctx.db, requestId: 'test' },
    });
    expect(result.errors).toBeUndefined();
    const rows = (result.data as { therapienByKind: Array<{ id: string; geleisteteBe: number }> })
      .therapienByKind;
    const t = rows.find((r) => r.id === String(therapieId));
    expect(t?.geleisteteBe).toBe(6);
  });
});

describe('therapie.verfuegbareBe (AC-BEH-10)', () => {
  const VERFUEGBARE_BE_QUERY = /* GraphQL */ `
    query TherapieVerfuegbareBe($kindId: ID!) {
      therapienByKind(kindId: $kindId) {
        id
        bewilligteBe
        geleisteteBe
        verfuegbareBe
      }
    }
  `;

  let ctx: TestDb;
  let kindId: number;
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
    kindId = k!.id;
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
      .values({ kindId, auftraggeberId: a!.id, form: 'lerntherapie', bewilligteBe: 60 })
      .returning()
      .all();
    therapieId = t!.id;
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it('verfuegbareBe = bewilligteBe when no Behandlungen', async () => {
    const result = await graphql({
      schema,
      source: VERFUEGBARE_BE_QUERY,
      variableValues: { kindId: String(kindId) },
      contextValue: { db: ctx.db, requestId: 'test' },
    });
    expect(result.errors).toBeUndefined();
    const t = (
      result.data as { therapienByKind: Array<{ id: string; verfuegbareBe: number }> }
    ).therapienByKind.find((r) => r.id === String(therapieId));
    expect(t?.verfuegbareBe).toBe(60);
  });

  it('verfuegbareBe = bewilligteBe - geleisteteBe', async () => {
    const { behandlungen: btbl } = await import('../../db/schema');
    ctx.db
      .insert(btbl)
      .values({ therapieId, datum: new Date('2026-04-01'), be: 8 })
      .run();
    const result = await graphql({
      schema,
      source: VERFUEGBARE_BE_QUERY,
      variableValues: { kindId: String(kindId) },
      contextValue: { db: ctx.db, requestId: 'test' },
    });
    const t = (
      result.data as { therapienByKind: Array<{ id: string; verfuegbareBe: number }> }
    ).therapienByKind.find((r) => r.id === String(therapieId));
    expect(t?.verfuegbareBe).toBe(52);
  });
});
