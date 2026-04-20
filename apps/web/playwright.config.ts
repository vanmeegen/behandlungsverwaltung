import { defineConfig, devices } from '@playwright/test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_PORT = 5173;
// BEHANDLUNG_HOME for the dev server during e2e runs. templates/, bills/
// and timesheets/ land under this dir. Kept separate from the real user's
// ~/.behandlungsverwaltung and wiped in globalSetup.
const CONFIG_DIR = dirname(fileURLToPath(import.meta.url));
const E2E_HOME = resolve(CONFIG_DIR, '../server/data/e2e-home');

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['list'], ['junit', { outputFile: '../../reports/web-e2e-junit.xml' }]]
    : 'list',
  globalSetup: './e2e/globalSetup.ts',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    testIdAttribute: 'data-testselector',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'bun run dev',
    cwd: '../..',
    // BEHANDLUNG_TEST_MODE=1 switches the server to app-test.db (see
    // apps/server/src/db/client.ts resolveDbPath) so e2e runs never touch
    // the developer's apps/server/data/app.db. The matching testReset
    // mutation only registers in this mode.
    env: {
      BEHANDLUNG_TEST_MODE: '1',
      BEHANDLUNG_HOME: E2E_HOME,
    },
    url: `http://localhost:${WEB_PORT}`,
    // Reuse a running `bun run dev` if one is on :5173. Caveat: a dev
    // server started WITHOUT BEHANDLUNG_TEST_MODE=1 uses app.db and lacks
    // the testReset mutation, so e2e will fail loudly (cannot query
    // `mutation { testReset }`) — telling you to stop dev first. Losing
    // app.db silently is no longer possible.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
