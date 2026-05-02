import { expect, test } from '@playwright/test';
import {
  readTherapien,
  resetDb,
  seedAuftraggeber,
  seedKind,
  seedTherapie,
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

  test('Lern-Therapie 60 BE: persistiert + erscheint in Liste, Kind- und Auftraggeber-Detail', async ({
    page,
  }) => {
    const { kind, ag } = await seedBaseEntities();

    const listPage = new TherapieListPage(page);
    await listPage.goto();
    await expect(listPage.emptyState).toBeVisible();

    const formPage = new TherapieFormPage(page);
    await listPage.newLink.click();
    await expect(page).toHaveURL(/\/therapien\/new$/);
    await expect(formPage.gruppentherapie).not.toBeChecked();

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
    expect(t.bewilligteBe).toBe(60);
    expect(t.taetigkeit).toBe('lerntherapie');
    expect(t.gruppentherapie).toBe(false);

    // Dual-parent visibility: Kind-Detail + Auftraggeber-Detail
    await page.goto(`/kinder/${kind.id}/detail`);
    await expect(page.getByTestId(`therapie-row-form-${t.id}`)).toHaveText('Lern-Therapie');
    await page.goto(`/auftraggeber/${ag.id}/detail`);
    await expect(page.getByTestId(`therapie-row-form-${t.id}`)).toHaveText('Lern-Therapie');
  });

  test('Gruppentherapie-Variante: Checkbox setzt persistiertes Flag (AC-TH-04)', async ({
    page,
  }) => {
    const { kind, ag } = await seedBaseEntities();

    const formPage = new TherapieFormPage(page);
    await formPage.gotoNew();
    await formPage.fillCore({
      kindId: kind.id,
      auftraggeberId: ag.id,
      form: 'lerntherapie',
      bewilligteBe: 60,
      taetigkeit: 'lerntherapie',
      gruppentherapie: true,
    });
    await formPage.submitAndWait();

    const rows = await readTherapien();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.gruppentherapie).toBe(true);
  });

  test('bearbeiten: bewilligteBe ändern persistiert', async ({ page }) => {
    const { kind, ag } = await seedBaseEntities();
    const t = await seedTherapie({
      kindId: kind.id,
      auftraggeberId: ag.id,
      form: 'lerntherapie',
      bewilligteBe: 60,
      taetigkeit: 'lerntherapie',
    });

    const formPage = new TherapieFormPage(page);
    await formPage.gotoEdit(t.id);
    await formPage.bewilligteBe.fill('80');
    await formPage.submitAndWait();

    await expect(page).toHaveURL(/\/therapien$/);
    const rows = await readTherapien();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.bewilligteBe).toBe(80);
  });
});
