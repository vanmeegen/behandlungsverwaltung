import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { graphql } from 'graphql';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import {
  auftraggeber,
  behandlungen,
  kinder,
  rechnungen,
  templateFiles,
  therapien,
} from '../../db/schema';
import { schema } from '../../schema';
import { createTestDb, type TestDb } from '../helpers/testDb';

const CREATE = /* GraphQL */ `
  mutation Create($input: CreateMonatsrechnungInput!) {
    createMonatsrechnung(input: $input) {
      id
      nummer
      gesamtCents
      dateiname
    }
  }
`;

async function writeBlank(ctx: TestDb, filename: string): Promise<void> {
  const doc = await PDFDocument.create();
  doc.addPage([595.28, 841.89]);
  const bytes = await doc.save();
  writeFileSync(join(ctx.paths.templatesDir, filename), Buffer.from(bytes));
}

async function runCreate(
  ctx: TestDb,
  input: Record<string, unknown>,
): Promise<Awaited<ReturnType<typeof graphql>>> {
  return graphql({
    schema,
    source: CREATE,
    variableValues: { input },
    contextValue: { db: ctx.db, paths: ctx.paths, requestId: 'test' },
  });
}

describe('createMonatsrechnung mutation (AC-RECH-01, AC-RECH-05)', () => {
  let ctx: TestDb;
  let kindId: number;
  let agId: number;

  beforeEach(async () => {
    ctx = createTestDb();
    const [k] = ctx.db
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
    kindId = k!.id;
    const [a] = ctx.db
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
    agId = a!.id;
    const [t] = ctx.db
      .insert(therapien)
      .values({ kindId, auftraggeberId: agId, form: 'lerntherapie', bewilligteBe: 60 })
      .returning()
      .all();
    ctx.db
      .insert(behandlungen)
      .values([
        {
          therapieId: t!.id,
          datum: new Date('2026-04-15T00:00:00.000Z'),
          be: 2,
          taetigkeit: 'lerntherapie',
        },
      ])
      .run();
    await writeBlank(ctx, 'rechnung-global.pdf');
    ctx.db
      .insert(templateFiles)
      .values({ kind: 'rechnung', auftraggeberId: null, filename: 'rechnung-global.pdf' })
      .run();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it('returns the created Rechnung on the happy path', async () => {
    const result = await runCreate(ctx, {
      year: 2026,
      month: 4,
      kindId: String(kindId),
      auftraggeberId: String(agId),
      rechnungsdatum: '2026-05-02',
    });
    expect(result.errors).toBeUndefined();
    const created = (result.data as { createMonatsrechnung: Record<string, unknown> })
      .createMonatsrechnung;
    expect(created.nummer).toBe('RE-2026-04-0001');
    expect(created.gesamtCents).toBe(9000);
    expect(created.dateiname).toBe('RE-2026-04-0001-Anna_Musterfrau.pdf');
  });

  it('rejects a duplicate with code DUPLICATE_RECHNUNG (AC-RECH-05)', async () => {
    await runCreate(ctx, {
      year: 2026,
      month: 4,
      kindId: String(kindId),
      auftraggeberId: String(agId),
      rechnungsdatum: '2026-05-02',
    });
    const dup = await runCreate(ctx, {
      year: 2026,
      month: 4,
      kindId: String(kindId),
      auftraggeberId: String(agId),
      rechnungsdatum: '2026-05-02',
    });
    expect(dup.errors?.[0]?.extensions?.code).toBe('DUPLICATE_RECHNUNG');
    expect(dup.errors?.[0]?.message).toBe('Für diesen Monat wurde bereits eine Rechnung erzeugt.');
    expect(ctx.db.select().from(rechnungen).all()).toHaveLength(1);
  });

  it('rejects an empty month with KEINE_BEHANDLUNGEN', async () => {
    const res = await runCreate(ctx, {
      year: 2026,
      month: 3,
      kindId: String(kindId),
      auftraggeberId: String(agId),
      rechnungsdatum: '2026-05-02',
    });
    expect(res.errors?.[0]?.extensions?.code).toBe('KEINE_BEHANDLUNGEN');
  });

  it('rejects an invalid rechnungsdatum with VALIDATION_ERROR', async () => {
    const res = await runCreate(ctx, {
      year: 2026,
      month: 4,
      kindId: String(kindId),
      auftraggeberId: String(agId),
      rechnungsdatum: 'nicht-ein-datum',
    });
    expect(res.errors?.[0]?.extensions?.code).toBe('VALIDATION_ERROR');
  });

  it('uses an explicit lfdNummer when supplied (AC-RECH-15)', async () => {
    const result = await runCreate(ctx, {
      year: 2026,
      month: 4,
      kindId: String(kindId),
      auftraggeberId: String(agId),
      rechnungsdatum: '2026-05-02',
      lfdNummer: 7,
    });
    expect(result.errors).toBeUndefined();
    const created = (result.data as { createMonatsrechnung: Record<string, unknown> })
      .createMonatsrechnung;
    expect(created.nummer).toBe('RE-2026-04-0007');
    expect(created.dateiname).toBe('RE-2026-04-0007-Anna_Musterfrau.pdf');
  });

  it('rejects an out-of-range lfdNummer with VALIDATION_ERROR', async () => {
    const res = await runCreate(ctx, {
      year: 2026,
      month: 4,
      kindId: String(kindId),
      auftraggeberId: String(agId),
      rechnungsdatum: '2026-05-02',
      lfdNummer: 0,
    });
    expect(res.errors?.[0]?.extensions?.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a duplicate lfdNummer in the same year with DUPLICATE_RECHNUNGSNUMMER', async () => {
    await runCreate(ctx, {
      year: 2026,
      month: 4,
      kindId: String(kindId),
      auftraggeberId: String(agId),
      rechnungsdatum: '2026-05-02',
      lfdNummer: 7,
    });
    // Add a second Kind + Therapie + Behandlung to dodge the per-month
    // unique constraint and reach the lfd duplicate guard.
    const [k2] = ctx.db
      .insert(kinder)
      .values({
        vorname: 'Ben',
        nachname: 'Beispiel',
        geburtsdatum: new Date('2019-05-10T00:00:00.000Z'),
        strasse: 'Lindenallee',
        hausnummer: '7',
        plz: '51103',
        stadt: 'Köln',
        aktenzeichen: 'K-2026-002',
      })
      .returning()
      .all();
    const [t2] = ctx.db
      .insert(therapien)
      .values({ kindId: k2!.id, auftraggeberId: agId, form: 'lerntherapie', bewilligteBe: 60 })
      .returning()
      .all();
    ctx.db
      .insert(behandlungen)
      .values([
        {
          therapieId: t2!.id,
          datum: new Date('2026-05-04T00:00:00.000Z'),
          be: 2,
          taetigkeit: 'lerntherapie',
        },
      ])
      .run();

    const dup = await runCreate(ctx, {
      year: 2026,
      month: 5,
      kindId: String(k2!.id),
      auftraggeberId: String(agId),
      rechnungsdatum: '2026-06-01',
      lfdNummer: 7,
    });
    expect(dup.errors?.[0]?.extensions?.code).toBe('DUPLICATE_RECHNUNGSNUMMER');
    expect(dup.errors?.[0]?.message).toMatch(/2026.*bereits vergeben/);
  });
});
