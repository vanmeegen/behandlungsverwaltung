import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFParse } from 'pdf-parse';
import { renderRechnungPdf, type RechnungPdfInput } from '../../pdf/rechnungPdf';

async function parsePdfText(bytes: Uint8Array): Promise<{ text: string; numpages: number }> {
  const parser = new PDFParse({ data: bytes });
  const textResult = (await parser.getText()) as { text: string; pages?: unknown[] };
  const info = (await parser.getInfo()) as unknown as { numPages?: number };
  const numpages =
    typeof info.numPages === 'number'
      ? info.numPages
      : Array.isArray(textResult.pages)
        ? textResult.pages.length
        : 0;
  return { text: textResult.text, numpages };
}

const __dirname_ = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(__dirname_, '../../../../web/e2e/fixtures/template-rechnung.pdf');

// The fixture is a minimal handcrafted PDF that pdf-lib can still load
// (valid header/trailer). If the real fixture ever fails to parse, swap in
// a proper blank A4 PDF here.
function makeTemplateBytes(): Uint8Array {
  // Standard A4 blank page produced by pdf-lib itself at spec runtime.
  // This keeps the test independent of the on-disk fixture's quirks.
  return new Uint8Array();
}

async function makeBlankA4Template(): Promise<Uint8Array> {
  const { PDFDocument } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  doc.addPage([595.28, 841.89]);
  return doc.save();
}

const DEFAULT_INPUT: Omit<RechnungPdfInput, 'templateBytes'> = {
  nummer: 'RE-2026-04-0001',
  year: 2026,
  month: 4,
  kind: {
    vorname: 'Anna',
    nachname: 'Musterfrau',
    strasse: 'Hauptstr.',
    hausnummer: '12',
    plz: '50667',
    stadt: 'Köln',
  },
  auftraggeber: {
    typ: 'firma',
    firmenname: 'Jugendamt Köln',
    vorname: null,
    nachname: null,
    strasse: 'Kalker Hauptstr.',
    hausnummer: '247-273',
    plz: '51103',
    stadt: 'Köln',
  },
  stundensatzCents: 4500,
  lines: [
    {
      datum: new Date('2026-04-01T00:00:00.000Z'),
      arbeitsthema: 'Mathe-Grundlagen',
      be: 2,
      zeilenbetragCents: 9000,
    },
    {
      datum: new Date('2026-04-15T00:00:00.000Z'),
      arbeitsthema: 'Mathe-Grundlagen',
      be: 2,
      zeilenbetragCents: 9000,
    },
    {
      datum: new Date('2026-04-29T00:00:00.000Z'),
      arbeitsthema: 'Mathe-Grundlagen',
      be: 2,
      zeilenbetragCents: 9000,
    },
  ],
  gesamtCents: 27000,
};

async function renderText(): Promise<string> {
  const templateBytes = await makeBlankA4Template();
  void makeTemplateBytes; // silence linter for the scaffolding helper
  const bytes = await renderRechnungPdf({ ...DEFAULT_INPUT, templateBytes });
  const { text } = await parsePdfText(bytes);
  return text;
}

describe('renderRechnungPdf (PRD §3.2, §5, AC-RECH-08)', () => {
  it('includes the Rechnungsnummer', async () => {
    const text = await renderText();
    expect(text).toContain('RE-2026-04-0001');
  });

  it('includes the Abrechnungsmonat (04/2026)', async () => {
    const text = await renderText();
    expect(text).toContain('04/2026');
  });

  it('includes each Behandlung datum formatted dd.MM.yyyy', async () => {
    const text = await renderText();
    expect(text).toContain('01.04.2026');
    expect(text).toContain('15.04.2026');
    expect(text).toContain('29.04.2026');
  });

  it('includes the Arbeitsthema for every line', async () => {
    const text = await renderText();
    const occurrences = text.split('Mathe-Grundlagen').length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(3);
  });

  it('includes the Gesamtsumme 270,00 €', async () => {
    const text = await renderText();
    expect(text).toContain('270,00');
  });

  it('includes the § 4 UStG exemption hint (AC-RECH-08)', async () => {
    const text = await renderText();
    expect(text).toContain('§ 4 Nr. 14 UStG umsatzsteuerfrei');
  });

  it('mentions no USt-Ausweis keywords except the exemption sentence', async () => {
    const text = await renderText();
    expect(text).not.toMatch(/19\s*%/);
    expect(text).not.toContain('MwSt');
    // "USt" appears only once, inside the exemption sentence.
    const ustCount = text.split('USt').length - 1;
    expect(ustCount).toBe(1);
  });

  it('renders on template with the expected page count (page 0 is preserved)', async () => {
    const templateBytes = await makeBlankA4Template();
    const bytes = await renderRechnungPdf({ ...DEFAULT_INPUT, templateBytes });
    const parsed = await parsePdfText(bytes);
    expect(parsed.numpages).toBe(1);
  });

  it('loads an on-disk pdf template (e2e/fixtures/template-rechnung.pdf) as well', async () => {
    // Sanity: if this ever regresses we know the fixture file broke.
    const templateBytes = readFileSync(FIXTURE);
    const bytes = await renderRechnungPdf({
      ...DEFAULT_INPUT,
      templateBytes: new Uint8Array(templateBytes),
    });
    expect(bytes.byteLength).toBeGreaterThan(100);
  });
});
