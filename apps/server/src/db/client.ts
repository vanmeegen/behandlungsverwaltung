import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';

export const DEFAULT_DB_PATH = './data/app.db';
export const TEST_DB_PATH = './data/app-test.db';

export function resolveDbPath(explicit?: string): string {
  if (explicit) return explicit;
  if (Bun.env.DB_PATH) return Bun.env.DB_PATH;
  return Bun.env.BEHANDLUNG_TEST_MODE === '1' ? TEST_DB_PATH : DEFAULT_DB_PATH;
}

export function createDb(path?: string) {
  const sqlite = new Database(resolveDbPath(path), { create: true });
  sqlite.exec('PRAGMA journal_mode = WAL;');
  return drizzle(sqlite);
}

export type Db = ReturnType<typeof createDb>;
