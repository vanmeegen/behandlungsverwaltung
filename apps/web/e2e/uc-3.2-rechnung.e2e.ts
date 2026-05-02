import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFParse } from 'pdf-parse';
import { BILLS_DIR } from './helpers/paths';
import {
  readRechnungen,
  resetDb,
  seedAuftraggeber,
  seedBehandlung,
  seedKind,
  seedTherapie,
  uploadFixtureTemplate,
} from './helpers/seed';
import { RechnungCreatePage } from './pages/RechnungCreatePage';

const FIXTURE_PATH = resolve(
  fileURLToPath(import.meta.url),
  '..',
  'fixtures',
  'template-rechnung.pdf',
);

const RECHNUNGSKOPF = 'Mein Honorar für die Teilmaßnahme Lern-Therapie betrug im Monat April 2026:';

async function seedHappyPath(): Promise<{ kindId: string; auftraggeberId: string }> {
  const kind = await seedKind({
    vorname: 'Anna',
    nachname: 'Musterfrau',
    geburtsdatum: '2018-03-14',
    strasse: 'Hauptstr.',
    hausnummer: '12',
    plz: '50667',
    stadt: 'Köln',
    aktenzeichen: 'K-2026-001',
  });
  const ag = await seedAuftraggeber({
    typ: 'firma',
    firmenname: 'Jugendamt Köln',
    abteilung: 'Wirtschaftliche Jugendhilfe',
    strasse: 'Kalker Hauptstr.',
    hausnummer: '247-273',
    plz: '51103',
    stadt: 'Köln',
    stundensatzCents: 4500,
    rechnungskopfText: RECHNUNGSKOPF,
  });
  const therapie = await seedTherapie({
    kindId: kind.id,
    auftraggeberId: ag.id,
    form: 'lerntherapie',
    bewilligteBe: 60,
    taetigkeit: 'lerntherapie',
  });
  for (const datum of ['2026-04-01', '2026-04-15', '2026-04-29']) {
    await seedBehandlung({
      therapieId: therapie.id,
      datum,
      be: 2,
      taetigkeit: 'lerntherapie',
    });
  }
  const fixtureBase64 = readFileSync(FIXTURE_PATH).toString('base64');
  await uploadFixtureTemplate({
    kind: 'rechnung',
    auftraggeberId: null,
    base64: fixtureBase64,
  });
  return { kindId: kind.id, auftraggeberId: ag.id };
}

test.describe('UC-3.2 Monatsrechnung erzeugen', () => {
  test.beforeEach(async () => {
    await resetDb();
  });

  test('erzeugen: Rechnungs-PDF enthält alle relevanten Bestandteile', async ({ page }) => {
    const { kindId, auftraggeberId } = await seedHappyPath();

    const formPage = new RechnungCreatePage(page);
    await formPage.goto();
    await formPage.setMonat(2026, 4);
    await formPage.setRechnungsdatum('2026-05-02');
    await formPage.chooseKind(kindId);
    await formPage.chooseAuftraggeber(auftraggeberId);

    // lfdNummer ist seit dem Number-Input-Refactor (Commit cda298c) eine
    // simple Zahl mit Default 1 — Präfix wird im Helper-Text gerendert.
    await expect(formPage.nummerLfd).toHaveValue('1');

    await formPage.submitAndWait();
    await expect(formPage.successToast).toContainText('Rechnung erstellt: RE-2026-04-0001');

    // DB-Persistenz
    const rows = await readRechnungen();
    expect(rows).toHaveLength(1);
    const r = rows[0]!;
    expect(r.nummer).toBe('RE-2026-04-0001');
    expect(r.gesamtCents).toBe(27000);
    expect(r.stundensatzCentsSnapshot).toBe(4500);
    expect(r.dateiname).toBe('RE-2026-04-0001-Anna_Musterfrau.pdf');

    // PDF-Datei + semantischer Inhalts-Check (deckt den einleitungstext-Bug ab,
    // siehe fix(rechnung): Rechnungskopf bei langen Texten nicht mehr verschluckt)
    const pdfPath = join(BILLS_DIR, r.dateiname);
    expect(existsSync(pdfPath)).toBe(true);
    const text = (
      (await new PDFParse({ data: new Uint8Array(readFileSync(pdfPath)) }).getText()) as {
        text: string;
      }
    ).text;

    // Rechnungsnummer + Datum + Leistungszeitraum
    expect(text).toContain('RE-2026-04-0001');
    expect(text).toContain('02.05.2026');
    expect(text).toContain('270,00');

    // Empfänger-Adresse (Auftraggeber). Die Test-Fixture-Vorlage hat engere
    // Feld-Breiten als die Produktiv-Vorlage, daher prüfen wir auf Marker-
    // Wörter statt auf vollständige Adresszeilen.
    expect(text).toContain('Jugendamt Köln');
    expect(text).toContain('Wirtschaftliche');
    expect(text).toContain('247-273');
    expect(text).toContain('51103');

    // Auftraggeber-Rechnungskopf (PRD §2.2 / AC-RECH-17)
    expect(text).toContain('Honorar');
    expect(text).toContain('Teilmaßnahme');
    expect(text).toContain('Lern-Therapie');

    // Kind-Titelzeile + Aktenzeichen
    expect(text).toContain('Anna Musterfrau');
    expect(text).toContain('K-2026-001');

    // Eine Tabellen-Zeile pro Behandlung (AC-RECH-10)
    expect(text).toContain('01.04.2026 · Lern-Therapie');
    expect(text).toContain('15.04.2026 · Lern-Therapie');
    expect(text).toContain('29.04.2026 · Lern-Therapie');
  });

  test('Duplikat-Confirm-Dialog beim erneuten Erzeugen für selben Monat (AC-RECH-05)', async ({
    page,
  }) => {
    const { kindId, auftraggeberId } = await seedHappyPath();

    const formPage = new RechnungCreatePage(page);
    await formPage.goto();
    await formPage.setMonat(2026, 4);
    await formPage.setRechnungsdatum('2026-05-02');
    await formPage.chooseKind(kindId);
    await formPage.chooseAuftraggeber(auftraggeberId);
    await formPage.submitAndWait();
    await expect(formPage.successToast).toBeVisible();

    // Erneut versuchen → Confirm-Dialog
    await formPage.submitAndWait();
    await expect(formPage.duplicateDialog).toBeVisible();
    await expect(formPage.duplicateDialog).toContainText(
      'Für diesen Monat wurde bereits eine Rechnung erzeugt',
    );

    // Abbrechen → Dialog weg, weiterhin nur eine Rechnung in der DB.
    await formPage.duplicateDismiss.click();
    await expect(formPage.duplicateDialog).toBeHidden();
    const rows = await readRechnungen();
    expect(rows).toHaveLength(1);
  });
});
