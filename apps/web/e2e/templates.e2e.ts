import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEMPLATES_DIR } from './helpers/paths';
import { resetDb, seedAuftraggeber } from './helpers/seed';
import { TemplateUploadPage } from './pages/TemplateUploadPage';

const FIXTURE_PATH = resolve(
  fileURLToPath(import.meta.url),
  '..',
  'fixtures',
  'template-rechnung.pdf',
);

interface TemplateRow {
  id: string;
  kind: string;
  auftraggeberId: string | null;
  filename: string;
}

async function readTemplateFiles(): Promise<TemplateRow[]> {
  const response = await fetch('http://localhost:4000/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: /* GraphQL */ `
        query {
          templateFiles {
            id
            kind
            auftraggeberId
            filename
          }
        }
      `,
    }),
  });
  const body = (await response.json()) as { data?: { templateFiles: TemplateRow[] } };
  return body.data?.templateFiles ?? [];
}

test.describe('PDF templates upload (PRD §5, AC-TPL-01)', () => {
  test.beforeEach(async () => {
    await resetDb();
  });

  test('global Rechnung upload + per-Auftraggeber Stundennachweis upload', async ({ page }) => {
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

    const formPage = new TemplateUploadPage(page);
    await formPage.goto();

    // 1) Global rechnung template
    await formPage.chooseKind('rechnung');
    await formPage.chooseAuftraggeber('');
    await formPage.setFile(FIXTURE_PATH);
    await formPage.submitAndWait();
    await expect(page.getByTestId('template-row-rechnung-global')).toBeVisible();

    // 2) Per-Auftraggeber stundennachweis template
    await formPage.chooseKind('stundennachweis');
    await formPage.chooseAuftraggeber(ag.id);
    await formPage.setFile(FIXTURE_PATH);
    await formPage.submitAndWait();
    await expect(page.getByTestId(`template-row-stundennachweis-${ag.id}`)).toBeVisible();

    // File-system side check: both files are on disk under
    // BEHANDLUNG_HOME/templates/, deterministic naming.
    expect(existsSync(join(TEMPLATES_DIR, 'rechnung-global.pdf'))).toBe(true);
    expect(existsSync(join(TEMPLATES_DIR, `stundennachweis-${ag.id}.pdf`))).toBe(true);

    // Field readback: templateFiles rows match what we uploaded.
    const rows = await readTemplateFiles();
    expect(rows).toHaveLength(2);
    const globalRow = rows.find((r) => r.auftraggeberId === null)!;
    expect(globalRow.kind).toBe('rechnung');
    expect(globalRow.filename).toBe('rechnung-global.pdf');
    const perAg = rows.find((r) => r.auftraggeberId === ag.id)!;
    expect(perAg.kind).toBe('stundennachweis');
    expect(perAg.filename).toBe(`stundennachweis-${ag.id}.pdf`);
  });
});
