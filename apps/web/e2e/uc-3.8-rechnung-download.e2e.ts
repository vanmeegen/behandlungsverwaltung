import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createMonatsrechnungApi,
  resetDb,
  seedAuftraggeber,
  seedBehandlung,
  seedKind,
  seedTherapie,
  uploadFixtureTemplate,
} from './helpers/seed';

const FIXTURE_PATH = resolve(
  fileURLToPath(import.meta.url),
  '..',
  'fixtures',
  'template-rechnung.pdf',
);

test.describe('Rechnungen pro Auftraggeber bündeln und als versendet markieren', () => {
  test.beforeEach(async () => {
    await resetDb();
  });

  test('Bulk-ZIP-Download: alle Rechnungen des Monats werden als heruntergeladen markiert', async ({
    page,
  }) => {
    const ag = await seedAuftraggeber({
      typ: 'firma',
      firmenname: 'Jugendamt Köln',
      strasse: 'Kalker Hauptstr.',
      hausnummer: '247-273',
      plz: '51103',
      stadt: 'Köln',
      stundensatzCents: 4500,
    });
    const fixtureBase64 = readFileSync(FIXTURE_PATH).toString('base64');
    await uploadFixtureTemplate({ kind: 'rechnung', auftraggeberId: null, base64: fixtureBase64 });

    // Zwei Kinder mit Therapie + Behandlungen im April → zwei Rechnungen.
    for (const k of [
      { vorname: 'Anna', nachname: 'Musterfrau', aktenzeichen: 'K-2026-001' },
      { vorname: 'Ben', nachname: 'Beispiel', aktenzeichen: 'K-2026-002' },
    ]) {
      const kind = await seedKind({
        ...k,
        geburtsdatum: '2018-03-14',
        strasse: 'Hauptstr.',
        hausnummer: '12',
        plz: '50667',
        stadt: 'Köln',
      });
      const therapie = await seedTherapie({
        kindId: kind.id,
        auftraggeberId: ag.id,
        form: 'lerntherapie',
        bewilligteBe: 60,
        taetigkeit: 'lerntherapie',
      });
      await seedBehandlung({
        therapieId: therapie.id,
        datum: '2026-04-15',
        be: 2,
        taetigkeit: 'lerntherapie',
      });
      await createMonatsrechnungApi({
        year: 2026,
        month: 4,
        kindId: kind.id,
        auftraggeberId: ag.id,
      });
    }

    await page.goto('/rechnungen/download');
    await page.getByTestId('rechnung-download-auftraggeberId').selectOption(ag.id);
    await page.getByTestId('rechnung-download-monat').fill('2026-04');

    await expect(page.getByTestId('rechnung-download-row-RE-2026-04-0001')).toBeVisible();
    await expect(page.getByTestId('rechnung-download-row-RE-2026-04-0002')).toBeVisible();
    // Vor dem Download: kein Versand-Datum.
    await expect(page.getByTestId('rechnung-download-row-RE-2026-04-0001')).toContainText('—');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('rechnung-download-trigger').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.zip$/);
    const zipPath = await download.path();
    expect(readFileSync(zipPath).byteLength).toBeGreaterThan(200);

    // Success-Alert + Tabelle zeigt jetzt das Versand-Datum (heute).
    await expect(page.getByTestId('rechnung-download-success')).toContainText(
      '2 Rechnungen heruntergeladen',
    );
    const today = new Date().toLocaleDateString('de-DE');
    await expect(page.getByTestId('rechnung-download-row-RE-2026-04-0001')).toContainText(today);
    await expect(page.getByTestId('rechnung-download-row-RE-2026-04-0002')).toContainText(today);
  });
});
