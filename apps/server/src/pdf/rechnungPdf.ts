import {
  formatDateDe,
  formatEuro,
  formatLeistungszeitraum,
  THERAPIE_FORM_LABELS,
  type TherapieFormValue,
} from '@behandlungsverwaltung/shared';
import { PDFDocument, StandardFonts, type PDFForm } from 'pdf-lib';
import { LAYOUT, MAX_ROWS_PER_PAGE } from './layout';

const RECHNUNG_LAYOUT = LAYOUT.rechnung;

export interface RechnungPdfLine {
  datum: Date;
  taetigkeit: string | null;
  taetigkeitLabel: string | null;
  be: number;
  zeilenbetragCents: number;
}

export interface KindForPdf {
  vorname: string;
  nachname: string;
  geburtsdatum: Date;
  aktenzeichen: string;
  strasse: string;
  hausnummer: string;
  plz: string;
  stadt: string;
}

export interface AuftraggeberForPdf {
  typ: 'firma' | 'person';
  firmenname: string | null;
  abteilung: string | null;
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
  rechnungsdatum: Date;
  year: number;
  month: number;
  kind: KindForPdf;
  auftraggeber: AuftraggeberForPdf;
  /** Wortgetreuer Einleitungstext aus dem Auftraggeber-Stammdatensatz (PRD §2.2 / AC-RECH-17). */
  auftraggeberRechnungskopfText: string;
  therapieForm: TherapieFormValue;
  stundensatzCents: number;
  lines: RechnungPdfLine[];
  gesamtCents: number;
}

export class TooManyBehandlungenError extends Error {
  constructor(count: number, max: number) {
    super(
      `Zu viele Behandlungen (${count}) — maximal ${max} pro Seite in Phase 1. Paginierung ist noch nicht implementiert.`,
    );
    this.name = 'TooManyBehandlungenError';
  }
}

// Intl.NumberFormat inserts a NBSP (U+00A0) between amount and €;
// replace it with a normal space so PDF viewers render consistently.
function formatEuroPlain(cents: number): string {
  return formatEuro(cents).replace(/\u00A0/g, ' ');
}

function auftraggeberAdresse(ag: AuftraggeberForPdf): string {
  const lines: string[] = [];
  if (ag.typ === 'firma') {
    if (ag.firmenname) lines.push(ag.firmenname);
    // PRD §2.2 / AC-RECH-18: Abteilung als zweite Zeile direkt unter dem
    // Firmennamen, sofern hinterlegt. Person-Adressen haben keine Abteilung.
    if (ag.abteilung) lines.push(ag.abteilung);
  } else {
    const name = `${ag.vorname ?? ''} ${ag.nachname ?? ''}`.trim();
    if (name) lines.push(name);
  }
  lines.push(`${ag.strasse} ${ag.hausnummer}`);
  lines.push(`${ag.plz} ${ag.stadt}`);
  return lines.join('\n');
}

function setField(form: PDFForm, name: string, value: string, multiline = false): void {
  // Vorlage ist autor-kontrolliert — fehlt ein Feld, soll die App still
  // überspringen, damit die Therapeutin auch ohne jedes Optionalfeld
  // (z. B. unterschriftName) eine Rechnung erzeugen kann.
  const field = form.getFieldMaybe(name);
  if (!field) return;
  try {
    const textField = form.getTextField(name);
    if (multiline) textField.enableMultiline();
    textField.setText(value);
  } catch {
    // Falsch konfiguriertes Feld (z. B. Checkbox statt Textfeld) — ignorieren.
  }
}

function einleitungstext(input: RechnungPdfInput): string {
  // PRD §2.2 / AC-RECH-17: wortgetreu aus dem Auftraggeber-Rechnungskopf-Text.
  return input.auftraggeberRechnungskopfText;
}

function kindTitel(input: RechnungPdfInput): string {
  const { vorname, nachname, geburtsdatum, aktenzeichen } = input.kind;
  // AC-RECH-16: Nur Kind-Infos. Bug C: kein Monat/Jahr-Suffix mehr —
  // Leistungszeitraum hat sein eigenes Feld.
  return `${vorname} ${nachname} · geb. ${formatDateDe(geburtsdatum)} · ${aktenzeichen}`;
}

export async function renderRechnungPdf(input: RechnungPdfInput): Promise<Uint8Array> {
  if (input.lines.length > MAX_ROWS_PER_PAGE) {
    throw new TooManyBehandlungenError(input.lines.length, MAX_ROWS_PER_PAGE);
  }

  const doc = await PDFDocument.load(input.templateBytes);
  const pages = doc.getPages();
  if (pages.length === 0) {
    throw new Error('Template-PDF hat keine Seiten');
  }
  const page = pages[0]!;
  const font = await doc.embedFont(StandardFonts.Helvetica);

  // AcroForm-Felder der Vorlage füllen.
  const form = doc.getForm();
  setField(form, 'empfaengerAdresse', auftraggeberAdresse(input.auftraggeber), true);
  setField(form, 'rechnungsnummer', input.nummer);
  // rechnungsvorlage.pdf hat zusätzlich ein zweites, prominentes
  // "Rechnung Nr."-Feld (`rechnungsnummer2`); fehlt es in einer
  // älteren Vorlage, ignoriert setField das still.
  setField(form, 'rechnungsnummer2', input.nummer);
  setField(form, 'rechnungsdatum', formatDateDe(input.rechnungsdatum));
  setField(form, 'leistungszeitraum', formatLeistungszeitraum(input.year, input.month));
  setField(form, 'einleitungstext', einleitungstext(input), true);
  setField(form, 'kindTitel', kindTitel(input));
  setField(form, 'gesamtsumme', formatEuroPlain(input.gesamtCents));
  setField(form, 'unterschriftName', `${input.kind.vorname} ${input.kind.nachname}`);

  // Tabellenzeilen pro Behandlung zeichnen.
  let y = RECHNUNG_LAYOUT.tableTopY;
  const { posX, mengeX, einheitX, bezeichnungX, einzelX, gesamtX } = RECHNUNG_LAYOUT.columns;
  for (let i = 0; i < input.lines.length; i++) {
    const line = input.lines[i]!;
    const bezeichnung = line.taetigkeitLabel ?? THERAPIE_FORM_LABELS[input.therapieForm];
    page.drawText(String(i + 1), { x: posX, y, size: RECHNUNG_LAYOUT.fontSize, font });
    page.drawText(String(line.be), { x: mengeX, y, size: RECHNUNG_LAYOUT.fontSize, font });
    page.drawText('BE', { x: einheitX, y, size: RECHNUNG_LAYOUT.fontSize, font });
    page.drawText(`${formatDateDe(line.datum)} · ${bezeichnung}`, {
      x: bezeichnungX,
      y,
      size: RECHNUNG_LAYOUT.fontSize,
      font,
    });
    page.drawText(formatEuroPlain(input.stundensatzCents), {
      x: einzelX,
      y,
      size: RECHNUNG_LAYOUT.fontSize,
      font,
    });
    page.drawText(formatEuroPlain(line.zeilenbetragCents), {
      x: gesamtX,
      y,
      size: RECHNUNG_LAYOUT.fontSize,
      font,
    });
    y -= RECHNUNG_LAYOUT.rowHeight;
  }

  // Felder in statischen Inhalt überführen — ergibt ein abgeschlossenes
  // Belegdokument, das in jedem PDF-Viewer gleich aussieht.
  form.flatten();

  return doc.save();
}
