import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { auftraggeber, templateFiles } from '../../db/schema';
import {
  resolveTemplate,
  TemplateFileMissingError,
  TemplateNotFoundError,
} from '../../services/templateResolver';
import { createTestDb, type TestDb } from '../helpers/testDb';

const PDF_GLOBAL = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x47]); // %PDF-G
const PDF_PER_AG = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x41]); // %PDF-A
const PDF_PER_AG_V2 = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x42]); // %PDF-B

describe('resolveTemplate (PRD §5, AC-RECH-06 / AC-RECH-07, AC-TPL-02)', () => {
  let ctx: TestDb;
  let agId: number;

  beforeEach(() => {
    ctx = createTestDb();
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
  });

  afterEach(() => {
    ctx.cleanup();
  });

  function writeTemplate(filename: string, bytes: Uint8Array): void {
    writeFileSync(join(ctx.paths.templatesDir, filename), bytes);
  }

  it('returns the per-Auftraggeber file when one exists (AC-RECH-06)', () => {
    const filename = 'rechnung-' + agId + '.pdf';
    writeTemplate(filename, PDF_PER_AG);
    ctx.db.insert(templateFiles).values({ kind: 'rechnung', auftraggeberId: agId, filename }).run();

    const path = resolveTemplate(ctx.db, ctx.paths, 'rechnung', agId);
    expect(readFileSync(path).equals(Buffer.from(PDF_PER_AG))).toBe(true);
  });

  it('falls back to the global file when Auftraggeber has none (AC-RECH-07)', () => {
    writeTemplate('rechnung-global.pdf', PDF_GLOBAL);
    ctx.db
      .insert(templateFiles)
      .values({ kind: 'rechnung', auftraggeberId: null, filename: 'rechnung-global.pdf' })
      .run();

    const path = resolveTemplate(ctx.db, ctx.paths, 'rechnung', agId);
    expect(readFileSync(path).equals(Buffer.from(PDF_GLOBAL))).toBe(true);
  });

  it('throws TemplateNotFoundError when neither per-Auftraggeber nor global exists', () => {
    expect(() => resolveTemplate(ctx.db, ctx.paths, 'rechnung', agId)).toThrow(
      TemplateNotFoundError,
    );
  });

  it('throws TemplateFileMissingError when the row exists but the file is missing', () => {
    ctx.db
      .insert(templateFiles)
      .values({ kind: 'rechnung', auftraggeberId: null, filename: 'rechnung-global.pdf' })
      .run();
    expect(() => resolveTemplate(ctx.db, ctx.paths, 'rechnung', agId)).toThrow(
      TemplateFileMissingError,
    );
  });

  it('re-reads the file contents each call (AC-TPL-02 — no caching)', () => {
    const filename = 'rechnung-' + agId + '.pdf';
    writeTemplate(filename, PDF_PER_AG);
    ctx.db.insert(templateFiles).values({ kind: 'rechnung', auftraggeberId: agId, filename }).run();
    const firstPath = resolveTemplate(ctx.db, ctx.paths, 'rechnung', agId);
    expect(readFileSync(firstPath).equals(Buffer.from(PDF_PER_AG))).toBe(true);

    unlinkSync(firstPath);
    writeTemplate(filename, PDF_PER_AG_V2);

    const secondPath = resolveTemplate(ctx.db, ctx.paths, 'rechnung', agId);
    expect(readFileSync(secondPath).equals(Buffer.from(PDF_PER_AG_V2))).toBe(true);
  });
});
