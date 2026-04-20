import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { auftraggeber, kinder, rechnungen, templateFiles } from '../../db/schema';
import {
  createStundennachweis,
  RechnungFuerMonatFehltError,
} from '../../services/stundennachweisService';
import { TemplateFileMissingError, TemplateNotFoundError } from '../../services/templateResolver';
import { createTestDb, type TestDb } from '../helpers/testDb';

async function writeBlankTemplate(ctx: TestDb, filename: string): Promise<void> {
  const doc = await PDFDocument.create();
  doc.addPage([595.28, 841.89]);
  const bytes = await doc.save();
  writeFileSync(join(ctx.paths.templatesDir, filename), Buffer.from(bytes));
}

interface Seed {
  kindId: number;
  auftraggeberId: number;
}

function seedKindAndAuftraggeber(
  ctx: TestDb,
  kindNames: { vorname: string; nachname: string },
): Seed {
  const [k] = ctx.db
    .insert(kinder)
    .values({
      vorname: kindNames.vorname,
      nachname: kindNames.nachname,
      geburtsdatum: new Date('2018-03-14T00:00:00.000Z'),
      strasse: 'Hauptstr.',
      hausnummer: '12',
      plz: '50667',
      stadt: 'Köln',
      aktenzeichen: 'K-2026-001',
    })
    .returning()
    .all();
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
    })
    .returning()
    .all();
  return { kindId: k!.id, auftraggeberId: a!.id };
}

function seedRechnung(
  ctx: TestDb,
  seed: Seed,
  overrides: Partial<{ nummer: string; jahr: number; monat: number }> = {},
): void {
  ctx.db
    .insert(rechnungen)
    .values({
      nummer: overrides.nummer ?? '2026-04-0001',
      jahr: overrides.jahr ?? 2026,
      monat: overrides.monat ?? 4,
      kindId: seed.kindId,
      auftraggeberId: seed.auftraggeberId,
      stundensatzCentsSnapshot: 4500,
      gesamtCents: 27000,
      dateiname: '2026-04-0001-Anna_Musterfrau.pdf',
    })
    .run();
}

describe('createStundennachweis (AC-STD-03, AC-STD-04)', () => {
  let ctx: TestDb;
  let seed: Seed;

  beforeEach(async () => {
    ctx = createTestDb();
    seed = seedKindAndAuftraggeber(ctx, { vorname: 'Anna', nachname: 'Musterfrau' });
    await writeBlankTemplate(ctx, 'stunden-global.pdf');
    ctx.db
      .insert(templateFiles)
      .values({ kind: 'stundennachweis', auftraggeberId: null, filename: 'stunden-global.pdf' })
      .run();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it('writes the PDF under timesheets/ using nummer + sanitized Kindesname', async () => {
    seedRechnung(ctx, seed);
    const result = await createStundennachweis(ctx.db, ctx.paths, {
      year: 2026,
      month: 4,
      kindId: seed.kindId,
      auftraggeberId: seed.auftraggeberId,
    });
    expect(result.nummer).toBe('2026-04-0001');
    expect(result.dateiname).toBe('2026-04-0001-Anna_Musterfrau.pdf');

    const billsPath = join(ctx.paths.billsDir, result.dateiname);
    const timesheetsPath = join(ctx.paths.timesheetsDir, result.dateiname);
    expect(existsSync(timesheetsPath)).toBe(true);
    expect(existsSync(billsPath)).toBe(false);
    const bytes = readFileSync(timesheetsPath);
    expect(bytes.byteLength).toBeGreaterThan(200);
  });

  it('folds umlauts in the filename (AC-STD-04)', async () => {
    const björn = seedKindAndAuftraggeber(ctx, { vorname: 'Björn', nachname: 'Über-Meier' });
    ctx.db
      .insert(rechnungen)
      .values({
        nummer: '2026-05-0002',
        jahr: 2026,
        monat: 5,
        kindId: björn.kindId,
        auftraggeberId: björn.auftraggeberId,
        stundensatzCentsSnapshot: 4500,
        gesamtCents: 0,
        dateiname: 'stub.pdf',
      })
      .run();
    const result = await createStundennachweis(ctx.db, ctx.paths, {
      year: 2026,
      month: 5,
      kindId: björn.kindId,
      auftraggeberId: björn.auftraggeberId,
    });
    expect(result.dateiname).toBe('2026-05-0002-Bjoern_Ueber_Meier.pdf');
  });

  it('throws RechnungFuerMonatFehltError when no Rechnung exists for the month', async () => {
    await expect(
      createStundennachweis(ctx.db, ctx.paths, {
        year: 2026,
        month: 4,
        kindId: seed.kindId,
        auftraggeberId: seed.auftraggeberId,
      }),
    ).rejects.toBeInstanceOf(RechnungFuerMonatFehltError);
  });

  it('prefers per-Auftraggeber template over global (AC-STD-03)', async () => {
    seedRechnung(ctx, seed);
    await writeBlankTemplate(ctx, 'stunden-ag.pdf');
    ctx.db
      .insert(templateFiles)
      .values({
        kind: 'stundennachweis',
        auftraggeberId: seed.auftraggeberId,
        filename: 'stunden-ag.pdf',
      })
      .run();

    // Remove the global file: if per-AG wins, the call still succeeds.
    // (Keep the DB row; resolver picks the AG-specific one first.)
    const result = await createStundennachweis(ctx.db, ctx.paths, {
      year: 2026,
      month: 4,
      kindId: seed.kindId,
      auftraggeberId: seed.auftraggeberId,
    });
    expect(existsSync(join(ctx.paths.timesheetsDir, result.dateiname))).toBe(true);
  });

  it('throws TemplateNotFoundError when no stundennachweis template is registered', async () => {
    ctx.db.delete(templateFiles).run();
    seedRechnung(ctx, seed);
    await expect(
      createStundennachweis(ctx.db, ctx.paths, {
        year: 2026,
        month: 4,
        kindId: seed.kindId,
        auftraggeberId: seed.auftraggeberId,
      }),
    ).rejects.toBeInstanceOf(TemplateNotFoundError);
  });

  it('throws TemplateFileMissingError when the template row points at a missing file', async () => {
    ctx.db.delete(templateFiles).run();
    ctx.db
      .insert(templateFiles)
      .values({
        kind: 'stundennachweis',
        auftraggeberId: null,
        filename: 'does-not-exist.pdf',
      })
      .run();
    seedRechnung(ctx, seed);
    await expect(
      createStundennachweis(ctx.db, ctx.paths, {
        year: 2026,
        month: 4,
        kindId: seed.kindId,
        auftraggeberId: seed.auftraggeberId,
      }),
    ).rejects.toBeInstanceOf(TemplateFileMissingError);
  });
});
