import { expect, test } from '@playwright/test';
import {
  readBehandlungenByTherapie,
  resetDb,
  seedAuftraggeber,
  seedBehandlung,
  seedKind,
  seedTherapie,
} from './helpers/seed';
import { SchnellerfassungPage } from './pages/SchnellerfassungPage';

async function seedScenario(): Promise<{ kindId: string; therapieId: string }> {
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
    bewilligteBe: 60,
    taetigkeit: 'lerntherapie',
  });
  return { kindId: kind.id, therapieId: therapie.id };
}

const today = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
};

test.describe('UC-3.1 Schnellerfassung Behandlung', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async () => {
    await resetDb();
  });

  test('erfassen: Vorbelegung Tätigkeit + Datum heute, BE auf 2 erhöhen, persistiert', async ({
    page,
  }) => {
    const { kindId, therapieId } = await seedScenario();

    const formPage = new SchnellerfassungPage(page);
    await formPage.goto();
    await formPage.chooseKind(kindId);
    await formPage.chooseTherapie(therapieId);

    await expect(formPage.taetigkeit).toHaveValue('lerntherapie');
    await expect(formPage.datum).toHaveValue(today());
    await expect(formPage.beValue).toHaveText('1');

    await formPage.tapPlus(1);
    await expect(formPage.beValue).toHaveText('2');

    await formPage.submitAndWait();

    const rows = await readBehandlungenByTherapie(therapieId);
    expect(rows).toHaveLength(1);
    const b = rows[0]!;
    expect(b.therapieId).toBe(therapieId);
    expect(b.datum.slice(0, 10)).toBe(today());
    expect(b.be).toBe(2);
    expect(b.taetigkeit).toBe('lerntherapie');
  });

  test('bearbeiten: Datum einer bestehenden Behandlung ändern persistiert', async ({ page }) => {
    const { kindId, therapieId } = await seedScenario();
    const seeded = await seedBehandlung({
      therapieId,
      datum: '2026-04-15',
      be: 1,
      taetigkeit: 'lerntherapie',
    });

    // Realer Workflow: erst Schnellerfassung mit Therapie auswählen, damit
    // die Inline-Liste lädt und den Bearbeiten-Link bereitstellt.
    const formPage = new SchnellerfassungPage(page);
    await formPage.goto();
    await formPage.chooseKind(kindId);
    await formPage.chooseTherapie(therapieId);

    // Inline-Liste-Zeile erscheint, Bearbeiten-Link führt zur Edit-Page.
    const row = page.getByTestId(`schnellerfassung-behandlungsliste-zeile-${seeded.id}`);
    await expect(row).toBeVisible();
    await row.getByRole('link', { name: 'Bearbeiten' }).click();
    await expect(page).toHaveURL(new RegExp(`/behandlungen/${seeded.id}/bearbeiten$`));

    await page.getByTestId('behandlung-edit-datum').fill('2026-04-22');
    await page.getByTestId('behandlung-edit-submit').click();

    await expect(page).toHaveURL(/\/behandlungen$/);

    const rows = await readBehandlungenByTherapie(therapieId);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(seeded.id);
    expect(rows[0]!.datum.slice(0, 10)).toBe('2026-04-22');
  });
});
