import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { graphql } from 'graphql';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { auftraggeber, templateFiles } from '../../db/schema';
import { schema } from '../../schema';
import { createTestDb, type TestDb } from '../helpers/testDb';

const UPLOAD_TEMPLATE = /* GraphQL */ `
  mutation UploadTemplate($input: UploadTemplateInput!) {
    uploadTemplate(input: $input) {
      id
      kind
      auftraggeberId
      filename
    }
  }
`;

const FAKE_PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a]); // "%PDF-1.4\n"
const NOT_A_PDF = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // ZIP magic

function b64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

describe('uploadTemplate mutation (PRD §5, AC-TPL-01)', () => {
  let ctx: TestDb;
  let auftraggeberId: number;

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
    auftraggeberId = a!.id;
  });

  afterEach(() => {
    ctx.cleanup();
  });

  async function run(input: Record<string, unknown>): Promise<Awaited<ReturnType<typeof graphql>>> {
    return graphql({
      schema,
      source: UPLOAD_TEMPLATE,
      variableValues: { input },
      contextValue: { db: ctx.db, paths: ctx.paths, requestId: 'test' },
    });
  }

  it('writes a global rechnung template to disk and inserts the row', async () => {
    const result = await run({
      kind: 'rechnung',
      auftraggeberId: null,
      base64: b64(FAKE_PDF_BYTES),
    });
    expect(result.errors).toBeUndefined();
    const uploaded = (result.data as { uploadTemplate: { filename: string; kind: string } })
      .uploadTemplate;
    expect(uploaded.kind).toBe('rechnung');

    const path = join(ctx.paths.templatesDir, uploaded.filename);
    expect(existsSync(path)).toBe(true);
    const bytes = readFileSync(path);
    expect(bytes.equals(Buffer.from(FAKE_PDF_BYTES))).toBe(true);

    const rows = ctx.db.select().from(templateFiles).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.kind).toBe('rechnung');
    expect(rows[0]?.auftraggeberId).toBeNull();
  });

  it('writes a per-Auftraggeber stundennachweis template', async () => {
    const result = await run({
      kind: 'stundennachweis',
      auftraggeberId: String(auftraggeberId),
      base64: b64(FAKE_PDF_BYTES),
    });
    expect(result.errors).toBeUndefined();
    const rows = ctx.db.select().from(templateFiles).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.kind).toBe('stundennachweis');
    expect(rows[0]?.auftraggeberId).toBe(auftraggeberId);
  });

  it('replaces the existing row on re-upload for the same (kind, auftraggeberId)', async () => {
    await run({ kind: 'rechnung', auftraggeberId: null, base64: b64(FAKE_PDF_BYTES) });
    const first = ctx.db.select().from(templateFiles).all();
    expect(first).toHaveLength(1);

    const other = new Uint8Array([...FAKE_PDF_BYTES, 0x41]);
    await run({ kind: 'rechnung', auftraggeberId: null, base64: b64(other) });

    const rows = ctx.db.select().from(templateFiles).all();
    expect(rows).toHaveLength(1);
    const bytes = readFileSync(join(ctx.paths.templatesDir, rows[0]!.filename));
    expect(bytes.equals(Buffer.from(other))).toBe(true);
  });

  it('rejects non-PDF bytes with "Datei ist keine PDF"', async () => {
    const result = await run({
      kind: 'rechnung',
      auftraggeberId: null,
      base64: b64(NOT_A_PDF),
    });
    expect(result.errors?.[0]?.message).toBe('Datei ist keine PDF');
    expect(ctx.db.select().from(templateFiles).all()).toHaveLength(0);
  });
});
