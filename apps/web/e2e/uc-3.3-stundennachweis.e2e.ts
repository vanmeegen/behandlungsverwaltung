import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFParse } from 'pdf-parse';
import { TIMESHEETS_DIR } from './helpers/paths';
import {
  createMonatsrechnungApi,
  resetDb,
  seedAuftraggeber,
  seedBehandlung,
  seedKind,
  seedTherapie,
  uploadFixtureTemplate,
} from './helpers/seed';
import { StundennachweisPage } from './pages/StundennachweisPage';

// A blank A4 PDF works for both template kinds — reuse the Rechnung fixture
// as the stundennachweis template too.
const FIXTURE_PATH = resolve(
  fileURLToPath(import.meta.url),
  '..',
  'fixtures',
  'template-rechnung.pdf',
);

async function seedHappyPath(): Promise<{
  kindId: string;
  auftraggeberId: string;
  rechnungNummer: string;
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
    bewilligteBe: 60,
    arbeitsthema: 'Mathe-Grundlagen',
  });
  for (const datum of ['2026-04-01', '2026-04-15', '2026-04-29']) {
    await seedBehandlung({
      therapieId: therapie.id,
      datum,
      be: 2,
      arbeitsthema: 'Mathe-Grundlagen',
    });
  }
  const fixtureBase64 = readFileSync(FIXTURE_PATH).toString('base64');
  await uploadFixtureTemplate({ kind: 'rechnung', auftraggeberId: null, base64: fixtureBase64 });
  await uploadFixtureTemplate({
    kind: 'stundennachweis',
    auftraggeberId: null,
    base64: fixtureBase64,
  });
  const rechnung = await createMonatsrechnungApi({
    year: 2026,
    month: 4,
    kindId: kind.id,
    auftraggeberId: ag.id,
  });
  return { kindId: kind.id, auftraggeberId: ag.id, rechnungNummer: rechnung.nummer };
}

test.describe('UC-3.3 Stundennachweis drucken', () => {
  test.beforeEach(async () => {
    await resetDb();
  });

  test('Szenario 1: Stundennachweis für April 2026 erzeugen (AC-STD-01, AC-STD-02, AC-STD-04)', async ({
    page,
  }) => {
    const { kindId, auftraggeberId, rechnungNummer } = await seedHappyPath();
    expect(rechnungNummer).toBe('RE-2026-04-0001');

    const formPage = new StundennachweisPage(page);
    await formPage.goto();
    await formPage.setMonat(2026, 4);
    await formPage.chooseKind(kindId);
    await formPage.chooseAuftraggeber(auftraggeberId);
    await formPage.submitAndWait();

    const expectedDateiname = 'ST-2026-04-0001-Anna_Musterfrau.pdf';
    await expect(formPage.successToast).toHaveText(
      `Stundennachweis erstellt: ${expectedDateiname}`,
    );

    // AC-STD-01: the Stundennachweis lands in timesheets/ (the Rechnung PDF
    // with the same nummer also exists in bills/, but we don't assert on that
    // here — that's covered by UC-3.2).
    const timesheetsPath = join(TIMESHEETS_DIR, expectedDateiname);
    expect(existsSync(timesheetsPath)).toBe(true);

    const pdfBytes = readFileSync(timesheetsPath);
    const parser = new PDFParse({ data: new Uint8Array(pdfBytes) });
    const { text } = (await parser.getText()) as { text: string };
    expect(text).toContain('Stundennachweis RE-2026-04-0001');
    expect(text).toContain('Kind: Anna Musterfrau');
    expect(text).toContain('Auftraggeber: Jugendamt Köln');
    expect(text).toContain('Monat: 04/2026');

    // AC-STD-02: header columns in order Datum · BE · Leistung · Unterschrift.
    const iDatum = text.indexOf('Datum');
    const iBe = text.indexOf('BE', iDatum);
    const iLeistung = text.indexOf('Leistung', iBe);
    const iUnterschrift = text.indexOf('Unterschrift', iLeistung);
    expect(iDatum).toBeGreaterThanOrEqual(0);
    expect(iBe).toBeGreaterThan(iDatum);
    expect(iLeistung).toBeGreaterThan(iBe);
    expect(iUnterschrift).toBeGreaterThan(iLeistung);
  });

  test('Szenario 2: ohne Rechnung wird abgewiesen (AC-STD-03 Pfad: Vorbedingung fehlt)', async ({
    page,
  }) => {
    // Same seeding, but skip createMonatsrechnungApi → no Rechnung exists.
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
    const fixtureBase64 = readFileSync(FIXTURE_PATH).toString('base64');
    await uploadFixtureTemplate({
      kind: 'stundennachweis',
      auftraggeberId: null,
      base64: fixtureBase64,
    });

    const formPage = new StundennachweisPage(page);
    await formPage.goto();
    await formPage.setMonat(2026, 4);
    await formPage.chooseKind(kind.id);
    await formPage.chooseAuftraggeber(ag.id);
    await formPage.submitAndWait();

    await expect(formPage.errorBanner).toContainText('Bitte zuerst die Rechnung anlegen');
    await expect(formPage.successToast).toBeHidden();
  });
});
