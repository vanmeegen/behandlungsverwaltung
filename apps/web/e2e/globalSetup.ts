import { rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CONFIG_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(CONFIG_DIR, '..', '..', '..');
const TEST_DB_PATH = resolve(REPO_ROOT, 'apps', 'server', 'data', 'app-test.db');

export default async function globalSetup(): Promise<void> {
  // Start each Playwright run from an empty DB. testReset handles
  // between-test cleanup; this handles between-run cleanup.
  rmSync(TEST_DB_PATH, { force: true });
  // Drizzle-created sidecars.
  rmSync(`${TEST_DB_PATH}-wal`, { force: true });
  rmSync(`${TEST_DB_PATH}-shm`, { force: true });
}
