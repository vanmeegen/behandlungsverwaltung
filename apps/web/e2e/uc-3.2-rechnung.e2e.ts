import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFParse } from 'pdf-parse';
import { BILLS_DIR } from './helpers/paths';
import {
  createMonatsrechnungApi,
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

async function seedHappyPath(): Promise<{
  kindId: string;
  auftraggeberId: string;
  therapieId: string;
}> {
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
    vorname: null,
    nachname: null,
    strasse: 'Kalker Hauptstr.',
    hausnummer: '247-273',
    plz: '51103',
    stadt: 'Köln',
    stundensatzCents: 4500,
  });
  const therapie = await seedTherapie({
    kindId: kind.id,
    auftraggeberId: ag.id,
    form: 'lerntherapie',
    kommentar: null,
    startdatum: '2026-01-01',
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
  return { kindId: kind.id, auftraggeberId: ag.id, therapieId: therapie.id };
}

test.describe('UC-3.2 Monatsrechnung erzeugen', () => {
  test.beforeEach(async () => {
    await resetDb();
  });

  test('Szenario 1: Rechnung für April 2026 erzeugen (AC-RECH-01, AC-RECH-09)', async ({
    page,
  }) => {
    const { kindId, auftraggeberId } = await seedHappyPath();

    const formPage = new RechnungCreatePage(page);
    await formPage.goto();
    await formPage.setMonat(2026, 4);
    await formPage.setRechnungsdatum('2026-05-02');
    await formPage.chooseKind(kindId);
    await formPage.chooseAuftraggeber(auftraggeberId);

    // AC-RECH-15: Präfix ist read-only und NNNN auf 0001 vorbelegt.
    await expect(formPage.nummerPrefix).toHaveText('RE-2026-04-');
    await expect(formPage.nummerLfd).toHaveValue('0001');

    await formPage.submitAndWait();

    await expect(formPage.successToast).toHaveText('Rechnung erstellt: RE-2026-04-0001');

    // DB field readback
    const rows = await readRechnungen();
    expect(rows).toHaveLength(1);
    const r = rows[0]!;
    expect(r.nummer).toBe('RE-2026-04-0001');
    expect(r.gesamtCents).toBe(27000);
    expect(r.stundensatzCentsSnapshot).toBe(4500);
    expect(r.dateiname).toBe('RE-2026-04-0001-Anna_Musterfrau.pdf');

    // File on disk
    const pdfPath = join(BILLS_DIR, r.dateiname);
    expect(existsSync(pdfPath)).toBe(true);

    const pdfBytes = readFileSync(pdfPath);
    const parser = new PDFParse({ data: new Uint8Array(pdfBytes) });
    const { text } = (await parser.getText()) as { text: string };
    expect(text).toContain('RE-2026-04-0001');
    expect(text).toContain('270,00');
    expect(text).toContain('Lern-Therapie');
    // AC-RECH-09: Rechnungsdatum from the form lands in the PDF.
    expect(text).toContain('02.05.2026');
    // Kindesname + Aktenzeichen as Titelzeile above the table.
    expect(text).toContain('Anna Musterfrau');
    expect(text).toContain('K-2026-001');
    // AC-RECH-10: one row per Behandlung, date + Taetigkeit-Label.
    expect(text).toContain('01.04.2026 · Lern-Therapie');
    expect(text).toContain('15.04.2026 · Lern-Therapie');
    expect(text).toContain('29.04.2026 · Lern-Therapie');
    // AC-RECH-08: USt-Befreiungshinweis kommt jetzt aus der Vorlage.
    expect(text).toContain('§ 4 Nr. 14 UStG umsatzsteuerfrei');
  });

  test('Szenario 2: Duplikat wird abgewiesen (AC-RECH-05)', async ({ page }) => {
    const { kindId, auftraggeberId } = await seedHappyPath();

    const formPage = new RechnungCreatePage(page);
    await formPage.goto();
    await formPage.setMonat(2026, 4);
    await formPage.setRechnungsdatum('2026-05-02');
    await formPage.chooseKind(kindId);
    await formPage.chooseAuftraggeber(auftraggeberId);
    await formPage.submitAndWait();
    await expect(formPage.successToast).toBeVisible();

    // Try again for the same month/Kind/Auftraggeber
    await formPage.submitAndWait();
    await expect(formPage.duplicateDialog).toBeVisible();
    await expect(formPage.duplicateDialog).toContainText(
      'Für diesen Monat wurde bereits eine Rechnung erzeugt',
    );

    // Still exactly one Rechnung in the DB.
    const rows = await readRechnungen();
    expect(rows).toHaveLength(1);

    // Dismiss returns focus to the form.
    await formPage.duplicateDismiss.click();
    await expect(formPage.duplicateDialog).toBeHidden();
  });

  test('Szenario 3: Nur die laufende Nummer NNNN ist editierbar (AC-RECH-15)', async ({ page }) => {
    const { kindId, auftraggeberId } = await seedHappyPath();

    const formPage = new RechnungCreatePage(page);
    await formPage.goto();
    await formPage.setMonat(2026, 4);
    await formPage.setRechnungsdatum('2026-05-02');
    await formPage.chooseKind(kindId);
    await formPage.chooseAuftraggeber(auftraggeberId);

    await expect(formPage.nummerPrefix).toHaveText('RE-2026-04-');
    await formPage.setLfdNummer('0007');
    await expect(formPage.nummerLfd).toHaveValue('0007');

    await formPage.submitAndWait();
    await expect(formPage.successToast).toHaveText('Rechnung erstellt: RE-2026-04-0007');

    const rows = await readRechnungen();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.nummer).toBe('RE-2026-04-0007');
    expect(rows[0]?.dateiname).toBe('RE-2026-04-0007-Anna_Musterfrau.pdf');
  });

  test('Szenario 4: Bereits vergebene NNNN im selben Jahr → Fehler-Alert (AC-RECH-15)', async ({
    page,
  }) => {
    // Seed an existing Rechnung with lfdNummer = 7 in 2026 for a different
    // Kind/Monat-Kombination, sodass die DUPLICATE_RECHNUNGSNUMMER-Prüfung
    // (Jahr-weite NNNN-Eindeutigkeit) anschlägt.
    const otherKind = await seedKind({
      vorname: 'Ben',
      nachname: 'Beispiel',
      geburtsdatum: '2019-05-10',
      strasse: 'Lindenallee',
      hausnummer: '7',
      plz: '51103',
      stadt: 'Köln',
      aktenzeichen: 'K-2026-002',
    });
    const otherAg = await seedAuftraggeber({
      typ: 'firma',
      firmenname: 'Anderes Jugendamt',
      vorname: null,
      nachname: null,
      strasse: 'Str',
      hausnummer: '1',
      plz: '50667',
      stadt: 'Köln',
      stundensatzCents: 5000,
    });
    const otherTherapie = await seedTherapie({
      kindId: otherKind.id,
      auftraggeberId: otherAg.id,
      form: 'lerntherapie',
      kommentar: null,
      startdatum: '2026-01-01',
      bewilligteBe: 60,
      taetigkeit: 'lerntherapie',
    });
    await seedBehandlung({
      therapieId: otherTherapie.id,
      datum: '2026-03-15',
      be: 2,
      taetigkeit: 'lerntherapie',
    });
    const fixtureBase64 = readFileSync(FIXTURE_PATH).toString('base64');
    await uploadFixtureTemplate({
      kind: 'rechnung',
      auftraggeberId: null,
      base64: fixtureBase64,
    });
    await createMonatsrechnungApi({
      year: 2026,
      month: 3,
      kindId: otherKind.id,
      auftraggeberId: otherAg.id,
      rechnungsdatum: '2026-04-01',
      lfdNummer: 7,
    });

    // Now seed the happy-path fixtures (Anna / Jugendamt Köln / Lern-Therapie / April 2026)
    // and try to use the already-taken NNNN 0007.
    const { kindId, auftraggeberId } = await seedHappyPath();

    const formPage = new RechnungCreatePage(page);
    await formPage.goto();
    await formPage.setMonat(2026, 4);
    await formPage.setRechnungsdatum('2026-05-02');
    await formPage.chooseKind(kindId);
    await formPage.chooseAuftraggeber(auftraggeberId);
    await formPage.setLfdNummer('0007');
    await formPage.submitAndWait();

    await expect(formPage.duplicateNummerAlert).toBeVisible();
    await expect(formPage.duplicateNummerAlert).toContainText('bereits vergeben');

    // Es darf bei dem Versuch keine zweite Rechnung in 2026 mit Anna entstehen.
    const rows = await readRechnungen();
    expect(rows.some((r) => r.nummer === 'RE-2026-04-0007')).toBe(false);
  });
});
