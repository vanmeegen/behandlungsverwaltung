import { expect, test } from '@playwright/test';
import {
  readTherapien,
  resetDb,
  seedAuftraggeber,
  seedKind,
  type SeededAuftraggeber,
  type SeededKind,
} from './helpers/seed';
import { TherapieFormPage } from './pages/TherapieFormPage';
import { TherapieListPage } from './pages/TherapieListPage';

async function seedBaseEntities(): Promise<{
  kind: SeededKind;
  ag: SeededAuftraggeber;
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
  return { kind, ag };
}

test.describe('UC-3.7 Therapie erfassen', () => {
  test.beforeEach(async () => {
    await resetDb();
  });

  test('Szenario 1: Lerntherapie mit 60 BE anlegen (AC-TH-02)', async ({ page }) => {
    const { kind, ag } = await seedBaseEntities();

    const listPage = new TherapieListPage(page);
    await listPage.goto();
    await expect(listPage.emptyState).toBeVisible();

    const formPage = new TherapieFormPage(page);
    await listPage.newLink.click();
    await expect(page).toHaveURL(/\/therapien\/new$/);

    await formPage.fillCore({
      kindId: kind.id,
      auftraggeberId: ag.id,
      form: 'lerntherapie',
      bewilligteBe: 60,
      taetigkeit: 'lerntherapie',
    });
    await formPage.submitAndWait();

    await expect(page).toHaveURL(/\/therapien$/);
    await expect(listPage.rows).toHaveCount(1);

    const rows = await readTherapien();
    expect(rows).toHaveLength(1);
    const t = rows[0]!;
    expect(t.kindId).toBe(kind.id);
    expect(t.auftraggeberId).toBe(ag.id);
    expect(t.form).toBe('lerntherapie');
    expect(t.kommentar).toBeNull();
    expect(t.bewilligteBe).toBe(60);
    expect(t.taetigkeit).toBe('lerntherapie');

    // Dual-parent visibility: appears on both Kind detail and Auftraggeber detail pages
    await page.goto(`/kinder/${kind.id}/detail`);
    await expect(page.getByTestId(`therapie-row-form-${t.id}`)).toHaveText('Lerntherapie');
    await expect(page.getByTestId(`therapie-row-be-${t.id}`)).toHaveText('60 BE');

    await page.goto(`/auftraggeber/${ag.id}/detail`);
    await expect(page.getByTestId(`therapie-row-form-${t.id}`)).toHaveText('Lerntherapie');
    await expect(page.getByTestId(`therapie-row-be-${t.id}`)).toHaveText('60 BE');
  });

  test('Szenario Sonstiges-Happy: kommentar persistiert', async ({ page }) => {
    const { kind, ag } = await seedBaseEntities();

    const listPage = new TherapieListPage(page);
    await listPage.goto();
    const formPage = new TherapieFormPage(page);
    await listPage.newLink.click();

    await formPage.fillCore({
      kindId: kind.id,
      auftraggeberId: ag.id,
      form: 'sonstiges',
      bewilligteBe: 30,
      kommentar: 'Individuell abgestimmte Förderung',
      taetigkeit: 'Konzentration',
    });
    await formPage.submitAndWait();

    await expect(listPage.rows).toHaveCount(1);

    const rows = await readTherapien();
    expect(rows).toHaveLength(1);
    const t = rows[0]!;
    expect(t.form).toBe('sonstiges');
    expect(t.kommentar).toBe('Individuell abgestimmte Förderung');
    expect(t.bewilligteBe).toBe(30);
    expect(t.taetigkeit).toBe('Konzentration');
  });

  test('Szenario 2: Sonstiges ohne Kommentar wird abgelehnt (AC-TH-01)', async ({ page }) => {
    const { kind, ag } = await seedBaseEntities();

    const listPage = new TherapieListPage(page);
    await listPage.goto();
    const formPage = new TherapieFormPage(page);
    await listPage.newLink.click();

    await formPage.fillCore({
      kindId: kind.id,
      auftraggeberId: ag.id,
      form: 'sonstiges',
      bewilligteBe: 30,
    });
    await formPage.submitAndWait();

    await expect(formPage.errorFor('kommentar')).toHaveText('Kommentar ist Pflicht bei Sonstiges');

    const rows = await readTherapien();
    expect(rows).toEqual([]);
  });
});
