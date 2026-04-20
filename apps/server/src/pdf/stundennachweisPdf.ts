import { PDFDocument, StandardFonts } from 'pdf-lib';
import { LAYOUT } from './layout';

export interface StundennachweisPdfInput {
  templateBytes: Uint8Array;
  nummer: string;
  year: number;
  month: number;
  kindDisplayName: string;
  auftraggeberDisplayName: string;
  rowCount?: number;
}

const DEFAULT_ROW_COUNT = 20;

// Column x-coordinates for the Stundennachweis table (Datum · BE · Leistung · Unterschrift).
const COL_DATUM_X = 56;
const COL_BE_X = 140;
const COL_LEISTUNG_X = 190;
const COL_UNTERSCHRIFT_X = 400;
const ROW_HEIGHT = 18;

export async function renderStundennachweisPdf(
  input: StundennachweisPdfInput,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(input.templateBytes);
  const page = doc.getPages()[0];
  if (!page) throw new Error('Template-PDF hat keine Seiten');
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Title
  page.drawText(`Stundennachweis ${input.nummer}`, {
    x: LAYOUT.marginLeft,
    y: LAYOUT.bodyTop + 80,
    size: LAYOUT.titleFontSize,
    font: fontBold,
  });

  // Prefilled head: Kind, Auftraggeber, Monat
  const headY = LAYOUT.bodyTop + 50;
  page.drawText(`Kind: ${input.kindDisplayName}`, {
    x: LAYOUT.marginLeft,
    y: headY,
    size: LAYOUT.tableHeaderFontSize,
    font,
  });
  page.drawText(`Auftraggeber: ${input.auftraggeberDisplayName}`, {
    x: LAYOUT.marginLeft,
    y: headY - 14,
    size: LAYOUT.tableHeaderFontSize,
    font,
  });
  page.drawText(`Monat: ${String(input.month).padStart(2, '0')}/${input.year}`, {
    x: LAYOUT.marginLeft,
    y: headY - 28,
    size: LAYOUT.tableHeaderFontSize,
    font,
  });

  // Table header (AC-STD-02 order: Datum · BE · Leistung · Unterschrift)
  let y = LAYOUT.bodyTop;
  page.drawText('Datum', {
    x: COL_DATUM_X,
    y,
    size: LAYOUT.tableHeaderFontSize,
    font: fontBold,
  });
  page.drawText('BE', {
    x: COL_BE_X,
    y,
    size: LAYOUT.tableHeaderFontSize,
    font: fontBold,
  });
  page.drawText('Leistung', {
    x: COL_LEISTUNG_X,
    y,
    size: LAYOUT.tableHeaderFontSize,
    font: fontBold,
  });
  page.drawText('Unterschrift', {
    x: COL_UNTERSCHRIFT_X,
    y,
    size: LAYOUT.tableHeaderFontSize,
    font: fontBold,
  });

  // Blank rows — draw separator lines only; no cell content.
  const rowCount = input.rowCount ?? DEFAULT_ROW_COUNT;
  const tableWidth = 500;
  y -= 6;
  for (let i = 0; i < rowCount; i++) {
    y -= ROW_HEIGHT;
    page.drawLine({
      start: { x: COL_DATUM_X, y },
      end: { x: COL_DATUM_X + tableWidth, y },
      thickness: 0.5,
    });
  }

  return doc.save();
}
