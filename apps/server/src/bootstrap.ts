import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { TEST_DB_PATH, type Db } from './db/client';
import { createAndMigrateDb } from './db/migrate';
import { ensureDataDirs, paths, type Paths } from './paths';

export interface BootstrapResult {
  db: Db;
  paths: Paths;
  dbPath: string;
}

// Precedence: explicit DB_PATH env (standalone's legacy hook) → TEST_MODE
// sidecar → paths.dbPath (home-based, the PRD default).
function pickDbPath(p: Paths): string {
  if (Bun.env.DB_PATH) return Bun.env.DB_PATH;
  if (Bun.env.BEHANDLUNG_TEST_MODE === '1') return TEST_DB_PATH;
  return p.dbPath;
}

// AC-SYS-01: create ~/.behandlungsverwaltung/{app.db, templates/, bills/,
// timesheets/} on first run; subsequent runs are idempotent.
export function bootstrap(homeOverride?: string): BootstrapResult {
  const p = paths(homeOverride);
  ensureDataDirs(p);
  const dbPath = pickDbPath(p);
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = createAndMigrateDb(dbPath);
  return { db, paths: p, dbPath };
}
