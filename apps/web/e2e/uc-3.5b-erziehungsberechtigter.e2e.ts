import { expect, test } from '@playwright/test';
import { resetDb, seedKind } from './helpers/seed';

const ANNA = {
  vorname: 'Anna',
  nachname: 'Musterfrau',
  geburtsdatum: '2018-03-14',
  strasse: 'Hauptstr.',
  hausnummer: '12',
  plz: '50667',
  stadt: 'Köln',
  aktenzeichen: 'K-2026-001',
};

test.describe('Erziehungsberechtigter am Kind erfassen', () => {
  test.beforeEach(async () => {
    await resetDb();
  });

  test('Slot 1 ausfüllen → erscheint nach Speichern in der Kind-Karte', async ({ page }) => {
    const kind = await seedKind(ANNA);

    await page.goto(`/kinder/${kind.id}`);
    const slot1 = page.getByTestId('kind-form-ezb-slot-1');
    await expect(slot1).toContainText('— leer —');

    await page.getByTestId('kind-form-ezb-slot-1-bearbeiten').click();
    await expect(page).toHaveURL(new RegExp(`/kinder/${kind.id}/erziehungsberechtigte/1$`));

    await page.getByTestId('ezb-form-vorname').fill('Maria');
    await page.getByTestId('ezb-form-nachname').fill('Musterfrau');
    await page.getByTestId('ezb-form-email1').fill('maria@example.org');
    await page.getByTestId('ezb-form-telefon1').fill('0151 1234567');
    await page.getByTestId('ezb-form-submit').click();

    // Nach Speichern Sprung zurück auf das Kind-Formular.
    await expect(page).toHaveURL(new RegExp(`/kinder/${kind.id}$`));
    await expect(slot1).toContainText('Musterfrau, Maria');
  });
});
