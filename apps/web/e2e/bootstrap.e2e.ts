import { expect, test } from '@playwright/test';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BILLS_DIR, E2E_HOME, TEMPLATES_DIR, TIMESHEETS_DIR } from './helpers/paths';

// globalSetup wipes E2E_HOME before the webServer starts; the server's
// bootstrap() must recreate the full tree (AC-SYS-01).
const TEST_DB_PATH = resolve(
  fileURLToPath(import.meta.url),
  '..',
  '..',
  '..',
  'server',
  'data',
  'app-test.db',
);

test.describe('AC-SYS-01 first-run bootstrap', () => {
  test('webServer bootstrap creates templates/, bills/, timesheets/ under BEHANDLUNG_HOME and the sqlite file', async ({
    page,
  }) => {
    // Loading the home page guarantees the webServer is ready — so bootstrap()
    // has already run by this point.
    await page.goto('/');
    await expect(page.getByTestId('nav-schnellerfassung')).toBeVisible();

    expect(existsSync(E2E_HOME)).toBe(true);
    expect(statSync(TEMPLATES_DIR).isDirectory()).toBe(true);
    expect(statSync(BILLS_DIR).isDirectory()).toBe(true);
    expect(statSync(TIMESHEETS_DIR).isDirectory()).toBe(true);

    // Under BEHANDLUNG_TEST_MODE=1, bootstrap writes the db to
    // apps/server/data/app-test.db (kept separate from the developer's
    // app.db). The home-based app.db is skipped on purpose.
    expect(existsSync(TEST_DB_PATH)).toBe(true);
  });
});
