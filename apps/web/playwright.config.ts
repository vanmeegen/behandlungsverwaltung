import { defineConfig, devices } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_PORT = 5173;
const CONFIG_DIR = dirname(fileURLToPath(import.meta.url));

// Per-run isolated data directory (Risks R3). Generated once per config load;
// both the spawned webServer (via env) and the test process (via process.env)
// see the same path, so page objects can assert on file-system side effects.
const RUN_ID = process.env.E2E_RUN_ID ?? randomUUID();
process.env.E2E_RUN_ID = RUN_ID;
const BEHANDLUNG_HOME = resolve(CONFIG_DIR, 'e2e-data', RUN_ID);
const DB_PATH = resolve(BEHANDLUNG_HOME, 'app.db');
process.env.BEHANDLUNG_HOME = BEHANDLUNG_HOME;
process.env.BEHANDLUNG_DB_PATH = DB_PATH;

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
  globalTeardown: './e2e/globalTeardown.ts',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    testIdAttribute: 'data-testselector',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'bun run dev',
    cwd: '../..',
    env: {
      BEHANDLUNG_HOME,
      DB_PATH,
      BEHANDLUNG_TEST_MODE: '1',
    },
    url: `http://localhost:${WEB_PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
