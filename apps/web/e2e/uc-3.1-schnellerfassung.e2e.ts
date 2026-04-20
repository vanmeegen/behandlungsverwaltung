import { expect, test } from '@playwright/test';
import {
  readBehandlungenByTherapie,
  resetDb,
  seedAuftraggeber,
  seedKind,
  seedTherapie,
} from './helpers/seed';
import { SchnellerfassungPage } from './pages/SchnellerfassungPage';

async function seedScenario(): Promise<{
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
    arbeitsthema: 'Mathe-Grundlagen',
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

  test('Szenario Vorbelegung: 2 BE für heute mit Therapie-Arbeitsthema (AC-BEH-01, AC-BEH-03)', async ({
    page,
  }) => {
    const { kindId, therapieId } = await seedScenario();

    const formPage = new SchnellerfassungPage(page);
    await formPage.goto();
    await formPage.chooseKind(kindId);
    await formPage.chooseTherapie(therapieId);
    await expect(formPage.arbeitsthema).toHaveValue('Mathe-Grundlagen');

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
    expect(b.arbeitsthema).toBe('Mathe-Grundlagen');
  });

  test('Szenario Override: Arbeitsthema überschreiben speichert den überschriebenen Wert', async ({
    page,
  }) => {
    const { kindId, therapieId } = await seedScenario();

    const formPage = new SchnellerfassungPage(page);
    await formPage.goto();
    await formPage.chooseKind(kindId);
    await formPage.chooseTherapie(therapieId);
    await formPage.arbeitsthema.fill('Bruchrechnung');
    await formPage.submitAndWait();

    const rows = await readBehandlungenByTherapie(therapieId);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.arbeitsthema).toBe('Bruchrechnung');
    expect(rows[0]!.be).toBe(1);
  });
});
