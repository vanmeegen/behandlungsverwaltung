import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';

const DEFAULT_DB_PATH = './data/app.db';

export function resolveDbPath(explicit?: string): string {
  return explicit ?? Bun.env.DB_PATH ?? DEFAULT_DB_PATH;
}

export function createDb(path?: string) {
  const sqlite = new Database(resolveDbPath(path), { create: true });
  sqlite.exec('PRAGMA journal_mode = WAL;');
  return drizzle(sqlite);
}

export type Db = ReturnType<typeof createDb>;
