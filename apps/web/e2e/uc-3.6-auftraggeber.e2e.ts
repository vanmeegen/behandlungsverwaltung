import { expect, test } from '@playwright/test';
import { readAuftraggeber, resetDb, seedAuftraggeber } from './helpers/seed';
import { AuftraggeberFormPage } from './pages/AuftraggeberFormPage';
import { AuftraggeberListPage } from './pages/AuftraggeberListPage';

const jugendamt = {
  typ: 'firma' as const,
  firmenname: 'Jugendamt Köln',
  abteilung: 'Wirtschaftliche Jugendhilfe',
  strasse: 'Kalker Hauptstr.',
  hausnummer: '247-273',
  plz: '51103',
  stadt: 'Köln',
  stundensatz: '45,00',
  rechnungskopfText: 'Mein Honorar für die Teilmaßnahme Lern-Therapie betrug im Monat April 2026:',
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
  rechnungskopfText: 'Mein Honorar für die Teilmaßnahme Lern-Therapie betrug im Monat April 2026:',
};

test.describe('UC-3.6 Auftraggeber erfassen', () => {
  test.beforeEach(async () => {
    await resetDb();
  });

  test('Firma anlegen: alle Felder persistieren, Liste zeigt Datensatz', async ({ page }) => {
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
    expect(created.abteilung).toBe('Wirtschaftliche Jugendhilfe');
    expect(created.rechnungskopfText).toBe(
      'Mein Honorar für die Teilmaßnahme Lern-Therapie betrug im Monat April 2026:',
    );

    await expect(listPage.firmennameCellFor(created.id)).toHaveText('Jugendamt Köln');
  });

  test('Person anlegen: vorname/nachname persistieren, firmenname=null', async ({ page }) => {
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
    expect(created.stundensatzCents).toBe(6000);

    await expect(listPage.nachnameCellFor(created.id)).toHaveText('Privatzahlerin');
    await expect(listPage.vornameCellFor(created.id)).toHaveText('Petra');
  });

  test('bearbeiten: Stundensatz + Rechnungskopf-Text ändern persistiert', async ({ page }) => {
    const ag = await seedAuftraggeber({
      typ: 'firma',
      firmenname: 'Jugendamt Köln',
      strasse: 'Kalker Hauptstr.',
      hausnummer: '247-273',
      plz: '51103',
      stadt: 'Köln',
      stundensatzCents: 4500,
      rechnungskopfText: 'Alter Rechnungskopf',
    });

    const formPage = new AuftraggeberFormPage(page);
    await formPage.gotoEdit(ag.id);
    await formPage.input('stundensatz').fill('48,50');
    await formPage.input('rechnungskopfText').fill('Neuer Rechnungskopf-Text');
    await formPage.submitAndWait();

    await expect(page).toHaveURL(/\/auftraggeber$/);

    const rows = await readAuftraggeber();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.stundensatzCents).toBe(4850);
    expect(rows[0]!.rechnungskopfText).toBe('Neuer Rechnungskopf-Text');
  });
});
