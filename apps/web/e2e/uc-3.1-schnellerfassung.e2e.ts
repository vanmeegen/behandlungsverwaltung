import { expect, test } from '@playwright/test';
import {
  readBehandlungenByTherapie,
  resetDb,
  seedAuftraggeber,
  seedKind,
  seedTherapie,
} from './helpers/seed';
import { SchnellerfassungPage } from './pages/SchnellerfassungPage';

async function seedScenario(opts: { gruppentherapie?: boolean } = {}): Promise<{
  kindId: string;
  therapieId: string;
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
  const therapie = await seedTherapie({
    kindId: kind.id,
    auftraggeberId: ag.id,
    form: 'lerntherapie',
    kommentar: null,
    bewilligteBe: 60,
    taetigkeit: 'lerntherapie',
    gruppentherapie: opts.gruppentherapie ?? false,
  });
  return { kindId: kind.id, therapieId: therapie.id };
}

const today = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
};

test.describe('UC-3.1 Schnellerfassung', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async () => {
    await resetDb();
  });

  test('Szenario Vorbelegung: 2 BE für heute mit Therapie-Tätigkeit (AC-BEH-01, AC-BEH-03)', async ({
    page,
  }) => {
    const { kindId, therapieId } = await seedScenario();

    const formPage = new SchnellerfassungPage(page);
    await formPage.goto();
    await formPage.chooseKind(kindId);
    await formPage.chooseTherapie(therapieId);
    await expect(formPage.taetigkeit).toHaveValue('lerntherapie');

    await expect(formPage.beValue).toHaveText('1');
    await formPage.tapPlus(1);
    await expect(formPage.beValue).toHaveText('2');

    await expect(formPage.datum).toHaveValue(today());

    await formPage.submitAndWait();

    const rows = await readBehandlungenByTherapie(therapieId);
    expect(rows).toHaveLength(1);
    const b = rows[0]!;
    expect(b.therapieId).toBe(therapieId);
    expect(b.datum.slice(0, 10)).toBe(today());
    expect(b.be).toBe(2);
    expect(b.taetigkeit).toBe('lerntherapie');
  });

  test('Szenario Override: Tätigkeit überschreiben speichert den überschriebenen Wert', async ({
    page,
  }) => {
    const { kindId, therapieId } = await seedScenario();

    const formPage = new SchnellerfassungPage(page);
    await formPage.goto();
    await formPage.chooseKind(kindId);
    await formPage.chooseTherapie(therapieId);
    await formPage.taetigkeit.fill('dyskalkulie');
    await formPage.submitAndWait();

    const rows = await readBehandlungenByTherapie(therapieId);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.taetigkeit).toBe('dyskalkulie');
    expect(rows[0]!.be).toBe(1);
  });

  test('Gruppentherapie ist mit Wert der Therapie vorbelegt (AC-BEH-06)', async ({ page }) => {
    const { kindId, therapieId } = await seedScenario({ gruppentherapie: true });

    const formPage = new SchnellerfassungPage(page);
    await formPage.goto();
    await formPage.chooseKind(kindId);
    await formPage.chooseTherapie(therapieId);
    await expect(formPage.gruppentherapie).toBeChecked();

    await formPage.submitAndWait();
    const rows = await readBehandlungenByTherapie(therapieId);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.gruppentherapie).toBe(true);
  });

  test('Gruppentherapie kann pro Behandlung überschrieben werden (AC-BEH-06)', async ({ page }) => {
    const { kindId, therapieId } = await seedScenario({ gruppentherapie: false });

    const formPage = new SchnellerfassungPage(page);
    await formPage.goto();
    await formPage.chooseKind(kindId);
    await formPage.chooseTherapie(therapieId);
    await expect(formPage.gruppentherapie).not.toBeChecked();
    await formPage.gruppentherapie.click();
    await expect(formPage.gruppentherapie).toBeChecked();

    await formPage.submitAndWait();
    const rows = await readBehandlungenByTherapie(therapieId);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.gruppentherapie).toBe(true);
  });
});
