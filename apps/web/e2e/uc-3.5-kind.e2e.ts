import { expect, test } from '@playwright/test';
import { readKinder, resetDb } from './helpers/seed';
import { KindFormPage } from './pages/KindFormPage';
import { KindListPage } from './pages/KindListPage';

const anna = {
  vorname: 'Anna',
  nachname: 'Musterfrau',
  geburtsdatum: '2018-03-14',
  strasse: 'Hauptstr.',
  hausnummer: '12',
  plz: '50667',
  stadt: 'Köln',
  aktenzeichen: 'K-2026-001',
};

test.describe('UC-3.5 Kind erfassen', () => {
  test.beforeEach(async () => {
    await resetDb();
  });

  test('Szenario 1: Kind vollständig anlegen (AC-KIND-01, all 8 fields)', async ({ page }) => {
    const listPage = new KindListPage(page);
    await listPage.goto();
    await expect(listPage.emptyState).toBeVisible();

    const formPage = new KindFormPage(page);
    await listPage.newLink.click();
    await expect(page).toHaveURL(/\/kinder\/new$/);

    await formPage.fillAll(anna);
    await formPage.submitAndWait();

    await expect(page).toHaveURL(/\/kinder$/);
    await expect(listPage.rows).toHaveCount(1);

    const rows = await readKinder();
    expect(rows).toHaveLength(1);
    const created = rows[0]!;
    expect(created.vorname).toBe('Anna');
    expect(created.nachname).toBe('Musterfrau');
    expect(created.geburtsdatum.slice(0, 10)).toBe('2018-03-14');
    expect(created.strasse).toBe('Hauptstr.');
    expect(created.hausnummer).toBe('12');
    expect(created.plz).toBe('50667');
    expect(created.stadt).toBe('Köln');
    expect(created.aktenzeichen).toBe('K-2026-001');

    await expect(listPage.nachnameCellFor(created.id)).toHaveText('Musterfrau');
  });

  test('Szenario 2: Kind ohne PLZ wird nicht gespeichert', async ({ page }) => {
    const listPage = new KindListPage(page);
    await listPage.goto();

    const formPage = new KindFormPage(page);
    await listPage.newLink.click();

    await formPage.fillAll({ ...anna, plz: '' });
    await formPage.submitAndWait();

    await expect(formPage.errorFor('plz')).toHaveText('PLZ ist Pflicht');

    const rows = await readKinder();
    expect(rows).toEqual([]);
  });

  test('Edit-Pfad (AC-KIND-03): nachname ändern persistiert', async ({ page }) => {
    const listPage = new KindListPage(page);
    await listPage.goto();

    const formPage = new KindFormPage(page);
    await listPage.newLink.click();
    await formPage.fillAll(anna);
    await formPage.submitAndWait();
    await expect(listPage.rows).toHaveCount(1);

    const [created] = await readKinder();
    const id = created!.id;
    await listPage.editLinkFor(id).click();
    await expect(page).toHaveURL(new RegExp(`/kinder/${id}$`));

    await formPage.input('nachname').fill('Beispiel');
    await formPage.submitAndWait();

    await expect(listPage.nachnameCellFor(id)).toHaveText('Beispiel');

    const rowsAfter = await readKinder();
    expect(rowsAfter).toHaveLength(1);
    expect(rowsAfter[0]!.nachname).toBe('Beispiel');
  });
});
