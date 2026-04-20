import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveDbPath, type Db } from './client';
import { materializeEmbeddedMigrations } from './embeddedMigrations';

const ON_DISK_MIGRATIONS_FOLDER = resolve(import.meta.dir, '../../drizzle');

function resolveMigrationsFolder(): string {
  // Dev / tests: read migrations straight from the repo.
  // Compiled binary: extract the embedded copies to a temp dir.
  if (existsSync(resolve(ON_DISK_MIGRATIONS_FOLDER, 'meta/_journal.json'))) {
    return ON_DISK_MIGRATIONS_FOLDER;
  }
  return materializeEmbeddedMigrations();
}

export function runMigrations(db: Db): void {
  migrate(db, { migrationsFolder: resolveMigrationsFolder() });
}

export function createAndMigrateDb(path?: string): Db {
  const resolvedPath = resolveDbPath(path);
  const sqlite = new Database(resolvedPath, { create: true });
  sqlite.exec('PRAGMA journal_mode = WAL;');
  const db = drizzle(sqlite);
  runMigrations(db);
  return db;
}
