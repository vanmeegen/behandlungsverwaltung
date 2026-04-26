import { Database } from 'bun:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAndMigrateDb } from '../../db/migrate';

const EXPECTED_TABLES = [
  'auftraggeber',
  'behandlungen',
  'erziehungsberechtigte',
  'kinder',
  'rechnung_behandlungen',
  'rechnungen',
  'template_files',
  'therapien',
];

describe('db/migrate', () => {
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'behandlung-migrate-'));
    dbPath = join(tmpDir, 'app.db');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates every domain table on a fresh database', () => {
    createAndMigrateDb(dbPath);

    const sqlite = new Database(dbPath);
    try {
      const rows = sqlite
        .query<
          { name: string },
          []
        >("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle_%'")
        .all();
      const tables = rows.map((r) => r.name).sort();
      expect(tables).toEqual(EXPECTED_TABLES);
    } finally {
      sqlite.close();
    }
  });

  it('is idempotent across repeated calls', () => {
    createAndMigrateDb(dbPath);
    expect(() => createAndMigrateDb(dbPath)).not.toThrow();

    const sqlite = new Database(dbPath);
    try {
      const count = sqlite
        .query<
          { n: number },
          []
        >("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle_%'")
        .get();
      expect(count?.n).toBe(EXPECTED_TABLES.length);
    } finally {
      sqlite.close();
    }
  });
});
