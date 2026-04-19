import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';

const DEFAULT_DB_PATH = './data/app.db';

export function createDb(path: string = DEFAULT_DB_PATH) {
  const sqlite = new Database(path, { create: true });
  sqlite.exec('PRAGMA journal_mode = WAL;');
  return drizzle(sqlite);
}

export type Db = ReturnType<typeof createDb>;
