import { mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CONFIG_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(CONFIG_DIR, '..', '..', '..');
const TEST_DB_PATH = resolve(REPO_ROOT, 'apps', 'server', 'data', 'app-test.db');
const E2E_HOME = resolve(REPO_ROOT, 'apps', 'server', 'data', 'e2e-home');

export default async function globalSetup(): Promise<void> {
  // Start each Playwright run from an empty DB. testReset handles
  // between-test cleanup; this handles between-run cleanup.
  rmSync(TEST_DB_PATH, { force: true });
  // Drizzle-created sidecars.
  rmSync(`${TEST_DB_PATH}-wal`, { force: true });
  rmSync(`${TEST_DB_PATH}-shm`, { force: true });
  // BEHANDLUNG_HOME holds templates/, bills/, timesheets/ for the e2e
  // dev server. testReset clears DB rows but can't know which files on
  // disk belong to the current run, so we wipe BEHANDLUNG_HOME fresh.
  rmSync(E2E_HOME, { recursive: true, force: true });
  mkdirSync(E2E_HOME, { recursive: true });
}
