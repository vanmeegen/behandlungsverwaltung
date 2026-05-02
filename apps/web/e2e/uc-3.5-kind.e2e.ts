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

  test('anlegen: alle Felder persistieren und Liste zeigt den Datensatz', async ({ page }) => {
    const listPage = new KindListPage(page);
    await listPage.goto();
    await expect(listPage.emptyState).toBeVisible();

    const formPage = new KindFormPage(page);
    await listPage.newLink.click();
    await expect(page).toHaveURL(/\/kinder\/new$/);

    await formPage.fillAll(anna);
    await formPage.submitAndWait();

    // Nach Create wechselt der Workflow direkt in den Edit-Modus
    // (PRD §3.5 / EZB-Slots immer sichtbar machen).
    await expect(page).toHaveURL(/\/kinder\/\d+$/);

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

    await listPage.goto();
    await expect(listPage.rows).toHaveCount(1);
    await expect(listPage.nachnameCellFor(created.id)).toHaveText('Musterfrau');
  });

  test('bearbeiten: nachname ändern persistiert (AC-KIND-03)', async ({ page }) => {
    const listPage = new KindListPage(page);
    const formPage = new KindFormPage(page);

    // Bestehendes Kind anlegen (Create-Flow ist im anderen Test abgedeckt).
    await listPage.goto();
    await listPage.newLink.click();
    await formPage.fillAll(anna);
    await formPage.submitAndWait();
    const [created] = await readKinder();
    const id = created!.id;

    await listPage.goto();
    await expect(listPage.rows).toHaveCount(1);
    await listPage.editLinkFor(id).click();
    await expect(page).toHaveURL(new RegExp(`/kinder/${id}$`));

    await formPage.input('nachname').fill('Beispiel');
    await formPage.submitAndWait();

    const rowsAfter = await readKinder();
    expect(rowsAfter).toHaveLength(1);
    expect(rowsAfter[0]!.nachname).toBe('Beispiel');

    await listPage.goto();
    await expect(listPage.nachnameCellFor(id)).toHaveText('Beispiel');
  });
});
