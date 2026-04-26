import { describe, expect, it } from 'bun:test';
import { PDFDocument } from 'pdf-lib';
import { PDFParse } from 'pdf-parse';
import {
  renderRechnungPdf,
  TooManyBehandlungenError,
  type RechnungPdfInput,
} from '../../pdf/rechnungPdf';

async function parsePdfText(bytes: Uint8Array): Promise<string> {
  const parser = new PDFParse({ data: bytes });
  const textResult = (await parser.getText()) as { text: string };
  return textResult.text;
}

/**
 * Erzeugt eine minimale A4-Vorlage mit AcroForm-Feldern, wie sie die
 * briefvorlage.pdf in der Produktion hat. Reproduzierbar, damit der
 * Test nicht von einer on-disk-Fixture abhängt.
 */
async function makeAcroFormTemplate(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const form = doc.getForm();

  const fields: Array<[string, number, number, number, number]> = [
    ['empfaengerAdresse', 50, 700, 250, 60],
    ['rechnungsnummer', 350, 750, 200, 20],
    ['rechnungsdatum', 350, 720, 200, 20],
    ['leistungszeitraum', 350, 690, 200, 20],
    ['einleitungstext', 50, 620, 500, 40],
    ['kindTitel', 50, 570, 500, 20],
    ['gesamtsumme', 450, 150, 100, 20],
    ['unterschriftName', 50, 80, 200, 20],
  ];
  for (const [name, x, y, w, h] of fields) {
    const tf = form.createTextField(name);
    tf.addToPage(page, { x, y, width: w, height: h });
  }
  return doc.save();
}

const BASE_INPUT: Omit<RechnungPdfInput, 'templateBytes'> = {
  nummer: 'RE-2026-04-0001',
  rechnungsdatum: new Date(Date.UTC(2026, 4, 2)),
  year: 2026,
  month: 4,
  kind: {
    vorname: 'Anna',
    nachname: 'Musterfrau',
    geburtsdatum: new Date(Date.UTC(2018, 2, 14)),
    aktenzeichen: 'K-2026-001',
    strasse: 'Hauptstr.',
    hausnummer: '12',
    plz: '50667',
    stadt: 'Köln',
  },
  auftraggeber: {
    typ: 'firma',
    firmenname: 'Jugendamt Köln',
    abteilung: null,
    vorname: null,
    nachname: null,
    strasse: 'Kalker Hauptstr.',
    hausnummer: '247-273',
    plz: '51103',
    stadt: 'Köln',
  },
  auftraggeberRechnungskopfText:
    'Mein Honorar für die Lern-Therapie von Anna berechne ich Ihnen wie folgt:',
  therapieForm: 'lerntherapie',
  stundensatzCents: 4500,
  lines: [
    {
      datum: new Date(Date.UTC(2026, 3, 1)),
      taetigkeit: 'lerntherapie',
      taetigkeitLabel: 'Lern-Therapie',
      be: 2,
      zeilenbetragCents: 9000,
    },
    {
      datum: new Date(Date.UTC(2026, 3, 15)),
      taetigkeit: 'lerntherapie',
      taetigkeitLabel: 'Lern-Therapie',
      be: 2,
      zeilenbetragCents: 9000,
    },
    {
      datum: new Date(Date.UTC(2026, 3, 29)),
      taetigkeit: 'lerntherapie',
      taetigkeitLabel: 'Lern-Therapie',
      be: 2,
      zeilenbetragCents: 9000,
    },
  ],
  gesamtCents: 27000,
};

async function renderAndExtract(
  override: Partial<RechnungPdfInput> = {},
): Promise<{ bytes: Uint8Array; text: string }> {
  const templateBytes = await makeAcroFormTemplate();
  const bytes = await renderRechnungPdf({ ...BASE_INPUT, ...override, templateBytes });
  const text = await parsePdfText(bytes);
  return { bytes, text };
}

describe('renderRechnungPdf (AcroForm pipeline)', () => {
  it('writes the Rechnungsnummer into the acro-form field', async () => {
    const { text } = await renderAndExtract();
    expect(text).toContain('RE-2026-04-0001');
  });

  it('writes the Rechnungsdatum formatted as DD.MM.YYYY (AC-RECH-09)', async () => {
    const { text } = await renderAndExtract({
      rechnungsdatum: new Date(Date.UTC(2026, 4, 15)),
    });
    expect(text).toContain('15.05.2026');
  });

  it('writes the Leistungszeitraum 01.04.2026 – 30.04.2026', async () => {
    const { text } = await renderAndExtract();
    expect(text).toContain('01.04.2026 – 30.04.2026');
  });

  it('writes Kindesname, Geburtsdatum and Aktenzeichen titel above the table without month/year (AC-RECH-16, Bug C)', async () => {
    const { text } = await renderAndExtract();
    expect(text).toContain('Anna Musterfrau');
    expect(text).toContain('geb. 14.03.2018');
    expect(text).toContain('K-2026-001');
    // Bug C: nur Kind-Infos, kein „im April 2026"-Suffix mehr
    expect(text).not.toContain('· im April 2026');
    expect(text).not.toContain('im April 2026');
  });

  it('writes the Auftraggeber-Rechnungskopf-Text wortgetreu in einleitungstext (AC-RECH-17)', async () => {
    // Marker-Wörter lassen sich auch nach dem AcroForm-Word-Wrap im
    // pdf-parse-Output zuverlässig per `toContain` nachweisen.
    const custom = 'KOPFMARKER beim Auftraggeber gesetzt.';
    const { text } = await renderAndExtract({ auftraggeberRechnungskopfText: custom });
    expect(text).toContain('KOPFMARKER');
    expect(text).toContain('Auftraggeber');
    expect(text).toContain('gesetzt');
    // Sicherstellen, dass NICHT mehr der alte fest verdrahtete Satz gerendert wird.
    expect(text).not.toContain('Teilmaßnahme');
    expect(text).not.toContain('betrug im Monat');
  });

  it('renders Abteilung as second line under Firmenname when set (AC-RECH-18)', async () => {
    const { text } = await renderAndExtract({
      auftraggeber: {
        ...BASE_INPUT.auftraggeber,
        abteilung: 'WJH-Abt',
      },
    });
    expect(text).toContain('Jugendamt Köln');
    expect(text).toContain('WJH-Abt');
    // Anschriftsblock-Reihenfolge: Firmenname → Abteilung → Straße → PLZ Stadt.
    const firmennameIdx = text.indexOf('Jugendamt Köln');
    const abteilungIdx = text.indexOf('WJH-Abt');
    const strasseIdx = text.indexOf('Kalker');
    expect(firmennameIdx).toBeLessThan(abteilungIdx);
    expect(abteilungIdx).toBeLessThan(strasseIdx);
  });

  it('omits the Abteilung line when not set', async () => {
    const { text } = await renderAndExtract({
      auftraggeber: {
        ...BASE_INPUT.auftraggeber,
        abteilung: null,
      },
    });
    expect(text).toContain('Jugendamt Köln');
    expect(text).not.toContain('WJH-Abt');
  });

  it('renders one table row per Behandlung with date and Taetigkeit label (AC-RECH-10)', async () => {
    const { text } = await renderAndExtract();
    expect(text).toContain('01.04.2026 · Lern-Therapie');
    expect(text).toContain('15.04.2026 · Lern-Therapie');
    expect(text).toContain('29.04.2026 · Lern-Therapie');
  });

  it('falls back to the therapy form label when taetigkeit is null', async () => {
    const { text } = await renderAndExtract({
      lines: [
        {
          datum: new Date(Date.UTC(2026, 3, 1)),
          taetigkeit: null,
          taetigkeitLabel: null,
          be: 2,
          zeilenbetragCents: 9000,
        },
      ],
      gesamtCents: 9000,
    });
    expect(text).toContain('01.04.2026 · Lern-Therapie');
  });

  it('writes the Gesamtsumme into the acro-form field', async () => {
    const { text } = await renderAndExtract();
    expect(text).toContain('270,00');
  });

  it('flattens the form after rendering — the result has no fillable fields', async () => {
    // Render fresh bytes (don't reuse the buffer that pdf-parse touched
    // earlier — it consumes the underlying Uint8Array in some paths).
    const templateBytes = await makeAcroFormTemplate();
    const bytes = await renderRechnungPdf({ ...BASE_INPUT, templateBytes });
    const reopened = await PDFDocument.load(new Uint8Array(bytes));
    expect(reopened.getForm().getFields()).toHaveLength(0);
  });

  it('throws TooManyBehandlungenError when rows exceed the table zone', async () => {
    const many = Array.from({ length: 50 }, (_, i) => ({
      datum: new Date(Date.UTC(2026, 3, (i % 28) + 1)),
      taetigkeit: 'lerntherapie',
      taetigkeitLabel: 'Lern-Therapie',
      be: 1,
      zeilenbetragCents: 4500,
    }));
    const templateBytes = await makeAcroFormTemplate();
    await expect(
      renderRechnungPdf({ ...BASE_INPUT, lines: many, gesamtCents: 50 * 4500, templateBytes }),
    ).rejects.toBeInstanceOf(TooManyBehandlungenError);
  });

  it('tolerates a template that does not declare every optional field', async () => {
    // Create a minimal template with only the mandatory fields.
    const doc = await PDFDocument.create();
    const page = doc.addPage([595.28, 841.89]);
    const form = doc.getForm();
    const tf = form.createTextField('rechnungsnummer');
    tf.addToPage(page, { x: 100, y: 700, width: 200, height: 20 });
    const templateBytes = await doc.save();
    const bytes = await renderRechnungPdf({ ...BASE_INPUT, templateBytes });
    const text = await parsePdfText(bytes);
    expect(text).toContain('RE-2026-04-0001');
    expect(text).toContain('Lern-Therapie');
  });
});
