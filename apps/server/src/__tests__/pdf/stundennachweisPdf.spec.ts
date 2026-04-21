import { describe, expect, it } from 'bun:test';
import { PDFDocument } from 'pdf-lib';
import { PDFParse } from 'pdf-parse';
import { renderStundennachweisPdf } from '../../pdf/stundennachweisPdf';

async function makeBlankA4(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([595.28, 841.89]);
  return doc.save();
}

async function parsePdfText(bytes: Uint8Array): Promise<string> {
  const parser = new PDFParse({ data: bytes });
  const r = (await parser.getText()) as { text: string };
  return r.text;
}

describe('renderStundennachweisPdf (AC-STD-02)', () => {
  it('prefills the header with Kind, Auftraggeber and Monat', async () => {
    const template = await makeBlankA4();
    const bytes = await renderStundennachweisPdf({
      templateBytes: template,
      nummer: 'RE-2026-04-0001',
      year: 2026,
      month: 4,
      kindDisplayName: 'Anna Musterfrau',
      auftraggeberDisplayName: 'Jugendamt Köln',
    });
    const text = await parsePdfText(bytes);
    expect(text).toContain('Stundennachweis RE-2026-04-0001');
    expect(text).toContain('Kind: Anna Musterfrau');
    expect(text).toContain('Auftraggeber: Jugendamt Köln');
    expect(text).toContain('Monat: 04/2026');
  });

  it('emits the table header in order Datum · BE · Leistung · Unterschrift (AC-STD-02)', async () => {
    const template = await makeBlankA4();
    const bytes = await renderStundennachweisPdf({
      templateBytes: template,
      nummer: 'RE-2026-04-0001',
      year: 2026,
      month: 4,
      kindDisplayName: 'Anna Musterfrau',
      auftraggeberDisplayName: 'Jugendamt Köln',
    });
    const text = await parsePdfText(bytes);
    const iDatum = text.indexOf('Datum');
    const iBe = text.indexOf('BE', iDatum);
    const iLeistung = text.indexOf('Leistung', iBe);
    const iUnterschrift = text.indexOf('Unterschrift', iLeistung);
    expect(iDatum).toBeGreaterThanOrEqual(0);
    expect(iBe).toBeGreaterThan(iDatum);
    expect(iLeistung).toBeGreaterThan(iBe);
    expect(iUnterschrift).toBeGreaterThan(iLeistung);
  });

  it('body rows are blank (no cell content beyond header)', async () => {
    const template = await makeBlankA4();
    const bytes = await renderStundennachweisPdf({
      templateBytes: template,
      nummer: 'RE-2026-04-0001',
      year: 2026,
      month: 4,
      kindDisplayName: 'Anna Musterfrau',
      auftraggeberDisplayName: 'Jugendamt Köln',
    });
    const text = await parsePdfText(bytes);
    // No cell contents ⇒ neither "01.04." nor digit columns should appear beyond what's in header.
    expect(text).not.toMatch(/01\.04\./);
    expect(text).not.toMatch(/Leistung:/);
  });
});
