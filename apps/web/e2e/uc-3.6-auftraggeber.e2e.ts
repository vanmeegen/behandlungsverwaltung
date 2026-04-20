import { expect, test } from '@playwright/test';
import { readAuftraggeber, resetDb } from './helpers/seed';
import { AuftraggeberFormPage } from './pages/AuftraggeberFormPage';
import { AuftraggeberListPage } from './pages/AuftraggeberListPage';

const jugendamt = {
  typ: 'firma' as const,
  firmenname: 'Jugendamt Köln',
  strasse: 'Kalker Hauptstr.',
  hausnummer: '247-273',
  plz: '51103',
  stadt: 'Köln',
  stundensatz: '45,00',
};

const petra = {
  typ: 'person' as const,
  vorname: 'Petra',
  nachname: 'Privatzahlerin',
  strasse: 'Lindenallee',
  hausnummer: '7',
  plz: '50667',
  stadt: 'Köln',
  stundensatz: '60,00',
};

test.describe('UC-3.6 Auftraggeber erfassen', () => {
  test.beforeEach(async () => {
    await resetDb();
  });

  test('Szenario 1: Firma anlegen (AC-AG-01)', async ({ page }) => {
    const listPage = new AuftraggeberListPage(page);
    await listPage.goto();
    await expect(listPage.emptyState).toBeVisible();

    const formPage = new AuftraggeberFormPage(page);
    await listPage.newLink.click();
    await expect(page).toHaveURL(/\/auftraggeber\/new$/);

    await formPage.fillAll(jugendamt);
    await formPage.submitAndWait();

    await expect(page).toHaveURL(/\/auftraggeber$/);
    await expect(listPage.rows).toHaveCount(1);

    const rows = await readAuftraggeber();
    expect(rows).toHaveLength(1);
    const created = rows[0]!;
    expect(created.typ).toBe('firma');
    expect(created.firmenname).toBe('Jugendamt Köln');
    expect(created.vorname).toBeNull();
    expect(created.nachname).toBeNull();
    expect(created.strasse).toBe('Kalker Hauptstr.');
    expect(created.hausnummer).toBe('247-273');
    expect(created.plz).toBe('51103');
    expect(created.stadt).toBe('Köln');
    expect(created.stundensatzCents).toBe(4500);

    await expect(listPage.firmennameCellFor(created.id)).toHaveText('Jugendamt Köln');

    await listPage.editLinkFor(created.id).click();
    await expect(formPage.input('firmenname')).toHaveValue('Jugendamt Köln');
    await expect(page.getByTestId('auftraggeber-form-vorname')).toHaveCount(0);
    await expect(page.getByTestId('auftraggeber-form-nachname')).toHaveCount(0);
  });

  test('Szenario Person-Happy: vorname/nachname persistieren, firmenname=null', async ({
    page,
  }) => {
    const listPage = new AuftraggeberListPage(page);
    await listPage.goto();

    const formPage = new AuftraggeberFormPage(page);
    await listPage.newLink.click();

    await formPage.fillAll(petra);
    await formPage.submitAndWait();

    await expect(page).toHaveURL(/\/auftraggeber$/);
    await expect(listPage.rows).toHaveCount(1);

    const rows = await readAuftraggeber();
    expect(rows).toHaveLength(1);
    const created = rows[0]!;
    expect(created.typ).toBe('person');
    expect(created.vorname).toBe('Petra');
    expect(created.nachname).toBe('Privatzahlerin');
    expect(created.firmenname).toBeNull();
    expect(created.strasse).toBe('Lindenallee');
    expect(created.hausnummer).toBe('7');
    expect(created.plz).toBe('50667');
    expect(created.stadt).toBe('Köln');
    expect(created.stundensatzCents).toBe(6000);

    await expect(listPage.nachnameCellFor(created.id)).toHaveText('Privatzahlerin');
    await expect(listPage.vornameCellFor(created.id)).toHaveText('Petra');

    await listPage.editLinkFor(created.id).click();
    await expect(formPage.input('vorname')).toHaveValue('Petra');
    await expect(formPage.input('nachname')).toHaveValue('Privatzahlerin');
    await expect(page.getByTestId('auftraggeber-form-firmenname')).toHaveCount(0);
  });

  test('Szenario 2: Person ohne Namen wird abgelehnt (AC-AG-02)', async ({ page }) => {
    const listPage = new AuftraggeberListPage(page);
    await listPage.goto();

    const formPage = new AuftraggeberFormPage(page);
    await listPage.newLink.click();

    await formPage.chooseTyp('person');
    await formPage.input('strasse').fill('Lindenallee');
    await formPage.input('hausnummer').fill('7');
    await formPage.input('plz').fill('50667');
    await formPage.input('stadt').fill('Köln');
    await formPage.input('stundensatz').fill('45,00');
    await formPage.submitAndWait();

    await expect(formPage.errorFor('vorname')).toHaveText('Vor- und Nachname Pflicht');

    const rows = await readAuftraggeber();
    expect(rows).toEqual([]);
  });
});
