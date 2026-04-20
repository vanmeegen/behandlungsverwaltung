import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { resolve } from 'node:path';
import { resolveDbPath, type Db } from './client';

const MIGRATIONS_FOLDER = resolve(import.meta.dir, '../../drizzle');

export function runMigrations(db: Db): void {
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}

export function createAndMigrateDb(path?: string): Db {
  const resolvedPath = resolveDbPath(path);
  const sqlite = new Database(resolvedPath, { create: true });
  sqlite.exec('PRAGMA journal_mode = WAL;');
  const db = drizzle(sqlite);
  runMigrations(db);
  return db;
}
