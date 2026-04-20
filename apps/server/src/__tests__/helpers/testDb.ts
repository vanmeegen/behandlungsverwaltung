import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { Db } from '../../db/client';

const MIGRATIONS_FOLDER = resolve(import.meta.dir, '../../../drizzle');

export interface TestDb {
  db: Db;
  cleanup: () => void;
}

export function createTestDb(): TestDb {
  const dir = mkdtempSync(join(tmpdir(), 'behandlung-test-'));
  const sqlite = new Database(join(dir, 'test.db'), { create: true });
  sqlite.exec('PRAGMA foreign_keys = ON;');
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return {
    db,
    cleanup: (): void => {
      sqlite.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
