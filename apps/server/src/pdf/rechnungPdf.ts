import { formatEuro } from '@behandlungsverwaltung/shared';
import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';
import { LAYOUT } from './layout';

export interface RechnungPdfLine {
  datum: Date;
  taetigkeit: string | null;
  be: number;
  zeilenbetragCents: number;
}

export interface KindForPdf {
  vorname: string;
  nachname: string;
  strasse: string;
  hausnummer: string;
  plz: string;
  stadt: string;
}

export interface AuftraggeberForPdf {
  typ: 'firma' | 'person';
  firmenname: string | null;
  vorname: string | null;
  nachname: string | null;
  strasse: string;
  hausnummer: string;
  plz: string;
  stadt: string;
}

export interface RechnungPdfInput {
  templateBytes: Uint8Array;
  nummer: string;
  year: number;
  month: number;
  kind: KindForPdf;
  auftraggeber: AuftraggeberForPdf;
  stundensatzCents: number;
  lines: RechnungPdfLine[];
  gesamtCents: number;
}

function formatDateDDMMYYYY(d: Date): string {
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}.${month}.${year}`;
}

function formatEuroPlain(cents: number): string {
  // Use the shared formatter, but strip the NBSP that Intl inserts before €.
  return formatEuro(cents).replace(/\u00A0/g, ' ');
}

function auftraggeberLines(ag: AuftraggeberForPdf): string[] {
  const lines: string[] = [];
  if (ag.typ === 'firma') {
    if (ag.firmenname) lines.push(ag.firmenname);
  } else {
    const name = `${ag.vorname ?? ''} ${ag.nachname ?? ''}`.trim();
    if (name) lines.push(name);
  }
  lines.push(`${ag.strasse} ${ag.hausnummer}`);
  lines.push(`${ag.plz} ${ag.stadt}`);
  return lines;
}

function drawLines(
  page: PDFPage,
  font: PDFFont,
  size: number,
  lines: string[],
  x: number,
  yTop: number,
): void {
  const lh = size + 4;
  let y = yTop;
  for (const line of lines) {
    page.drawText(line, { x, y, size, font });
    y -= lh;
  }
}

export async function renderRechnungPdf(input: RechnungPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.load(input.templateBytes);
  const pages = doc.getPages();
  if (pages.length === 0) {
    throw new Error('Template-PDF hat keine Seiten');
  }
  const page = pages[0]!;
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Anschrift (Auftraggeber)
  drawLines(
    page,
    font,
    11,
    auftraggeberLines(input.auftraggeber),
    LAYOUT.marginLeft,
    LAYOUT.anschriftTop,
  );

  // Rechnungs-Metadaten rechts oben
  const rightX = 400;
  drawLines(
    page,
    font,
    11,
    [
      `Rechnungsnummer: ${input.nummer}`,
      `Abrechnungsmonat: ${String(input.month).padStart(2, '0')}/${input.year}`,
      `Patient: ${input.kind.vorname} ${input.kind.nachname}`,
    ],
    rightX,
    LAYOUT.anschriftTop,
  );

  // Überschrift
  const titleY = LAYOUT.bodyTop + 40;
  page.drawText(`Rechnung ${input.nummer}`, {
    x: LAYOUT.marginLeft,
    y: titleY,
    size: LAYOUT.titleFontSize,
    font: fontBold,
  });

  // Tabellenkopf
  let y = LAYOUT.bodyTop;
  page.drawText('Datum', {
    x: LAYOUT.colDatumX,
    y,
    size: LAYOUT.tableHeaderFontSize,
    font: fontBold,
  });
  page.drawText('Arbeitsthema', {
    x: LAYOUT.colArbeitsthemaX,
    y,
    size: LAYOUT.tableHeaderFontSize,
    font: fontBold,
  });
  page.drawText('BE', { x: LAYOUT.colBeX, y, size: LAYOUT.tableHeaderFontSize, font: fontBold });
  page.drawText('Einzelpreis', {
    x: LAYOUT.colEinzelpreisX,
    y,
    size: LAYOUT.tableHeaderFontSize,
    font: fontBold,
  });
  page.drawText('Gesamt', {
    x: LAYOUT.colGesamtX,
    y,
    size: LAYOUT.tableHeaderFontSize,
    font: fontBold,
  });

  y -= LAYOUT.bodyLineHeight;

  for (const line of input.lines) {
    page.drawText(formatDateDDMMYYYY(line.datum), {
      x: LAYOUT.colDatumX,
      y,
      size: LAYOUT.tableRowFontSize,
      font,
    });
    page.drawText((line.taetigkeit ?? '').slice(0, 30), {
      x: LAYOUT.colArbeitsthemaX,
      y,
      size: LAYOUT.tableRowFontSize,
      font,
    });
    page.drawText(String(line.be), {
      x: LAYOUT.colBeX,
      y,
      size: LAYOUT.tableRowFontSize,
      font,
    });
    page.drawText(formatEuroPlain(input.stundensatzCents), {
      x: LAYOUT.colEinzelpreisX,
      y,
      size: LAYOUT.tableRowFontSize,
      font,
    });
    page.drawText(formatEuroPlain(line.zeilenbetragCents), {
      x: LAYOUT.colGesamtX,
      y,
      size: LAYOUT.tableRowFontSize,
      font,
    });
    y -= LAYOUT.bodyLineHeight;
  }

  // Gesamtsumme
  y -= LAYOUT.bodyLineHeight;
  page.drawText('Gesamtsumme', {
    x: LAYOUT.colEinzelpreisX,
    y,
    size: LAYOUT.tableHeaderFontSize,
    font: fontBold,
  });
  page.drawText(formatEuroPlain(input.gesamtCents), {
    x: LAYOUT.colGesamtX,
    y,
    size: LAYOUT.tableHeaderFontSize,
    font: fontBold,
  });

  // USt-Hinweis (AC-RECH-08)
  y -= LAYOUT.bodyLineHeight * 3;
  page.drawText('Gemäß § 4 Nr. 14 UStG umsatzsteuerfrei', {
    x: LAYOUT.marginLeft,
    y,
    size: LAYOUT.smallFontSize,
    font,
  });

  return doc.save();
}
