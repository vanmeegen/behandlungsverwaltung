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
import { RechnungListPage } from './pages/RechnungListPage';

const FIXTURE_PATH = resolve(
  fileURLToPath(import.meta.url),
  '..',
  'fixtures',
  'template-rechnung.pdf',
);

// NBSP lives between amount and € in formatEuro's output.
function normalize(s: string): string {
  return s.replace(/\u00A0/g, ' ');
}

async function seedAnnaMonth(
  kindId: string,
  auftraggeberId: string,
  therapieId: string,
  dates: string[],
  year: number,
  month: number,
): Promise<string> {
  for (const datum of dates) {
    await seedBehandlung({ therapieId, datum, be: 2, taetigkeit: 'lerntherapie' });
  }
  const rechnung = await createMonatsrechnungApi({ year, month, kindId, auftraggeberId });
  return rechnung.nummer;
}

test.describe('UC-3.4 Rechnungsübersicht', () => {
  test.beforeEach(async () => {
    await resetDb();
  });

  test('filter nach Kind zeigt die richtigen Rechnungen mit Gesamtsumme und PDF-Download', async ({
    page,
  }) => {
    // Shared: one Jugendamt, global rechnung template.
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
    await uploadFixtureTemplate({ kind: 'rechnung', auftraggeberId: null, base64: fixtureBase64 });

    // Rechnungsnummern are allocated sequentially. To land 2026-04-0001 Anna,
    // 2026-04-0002 Ben, 2026-05-0003 Anna, generate invoices in that order.
    const anna = await seedKind({
      vorname: 'Anna',
      nachname: 'Musterfrau',
      geburtsdatum: '2018-03-14',
      strasse: 'Hauptstr.',
      hausnummer: '12',
      plz: '50667',
      stadt: 'Köln',
      aktenzeichen: 'K-2026-001',
    });
    const annaTherapie = await seedTherapie({
      kindId: anna.id,
      auftraggeberId: ag.id,
      form: 'lerntherapie',
      kommentar: null,
      startdatum: '2026-01-01',
      bewilligteBe: 60,
      taetigkeit: 'lerntherapie',
    });
    // Anna April (3×2 BE → 270,00 €).
    const annaApril = await seedAnnaMonth(
      anna.id,
      ag.id,
      annaTherapie.id,
      ['2026-04-01', '2026-04-15', '2026-04-29'],
      2026,
      4,
    );
    expect(annaApril).toBe('RE-2026-04-0001');

    // Ben April (1×2 BE → 90,00 €) — gets nummer 0002.
    const ben = await seedKind({
      vorname: 'Ben',
      nachname: 'Beispiel',
      geburtsdatum: '2019-05-10',
      strasse: 'Lindenallee',
      hausnummer: '7',
      plz: '51103',
      stadt: 'Köln',
      aktenzeichen: 'K-2026-002',
    });
    const benTherapie = await seedTherapie({
      kindId: ben.id,
      auftraggeberId: ag.id,
      form: 'lerntherapie',
      kommentar: null,
      startdatum: '2026-01-01',
      bewilligteBe: 60,
      taetigkeit: 'lerntherapie',
    });
    await seedBehandlung({
      therapieId: benTherapie.id,
      datum: '2026-04-10',
      be: 2,
      taetigkeit: 'lerntherapie',
    });
    const benApril = await createMonatsrechnungApi({
      year: 2026,
      month: 4,
      kindId: ben.id,
      auftraggeberId: ag.id,
    });
    expect(benApril.nummer).toBe('RE-2026-04-0002');

    // Anna May (2×2 BE → 180,00 €) — gets nummer 0003.
    const annaMay = await seedAnnaMonth(
      anna.id,
      ag.id,
      annaTherapie.id,
      ['2026-05-05', '2026-05-20'],
      2026,
      5,
    );
    expect(annaMay).toBe('RE-2026-05-0003');

    // Open the Übersicht: all three visible initially, ordered by nummer desc.
    const listPage = new RechnungListPage(page);
    await listPage.goto();
    await expect(listPage.row('RE-2026-05-0003')).toBeVisible();
    await expect(listPage.row('RE-2026-04-0002')).toBeVisible();
    await expect(listPage.row('RE-2026-04-0001')).toBeVisible();

    // Filter Kind = Anna → exactly two rows (Ben gone).
    await listPage.filterByKind(anna.id);
    await expect(listPage.row('RE-2026-04-0002')).toHaveCount(0);
    await expect(listPage.row('RE-2026-04-0001')).toBeVisible();
    await expect(listPage.row('RE-2026-05-0003')).toBeVisible();

    const april = normalize((await listPage.gesamtsumme('RE-2026-04-0001').textContent()) ?? '');
    const may = normalize((await listPage.gesamtsumme('RE-2026-05-0003').textContent()) ?? '');
    expect(april).toBe('270,00 €');
    expect(may).toBe('180,00 €');

    // Download PDF for 2026-04-0001.
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      listPage.download('RE-2026-04-0001').click(),
    ]);
    expect(download.suggestedFilename()).toBe('RE-2026-04-0001-Anna_Musterfrau.pdf');
    const path = await download.path();
    const bytes = readFileSync(path);
    expect(bytes.byteLength).toBeGreaterThan(200);
  });
});
