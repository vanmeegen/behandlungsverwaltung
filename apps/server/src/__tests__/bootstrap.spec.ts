import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bootstrap } from '../bootstrap';

let parent: string;

function freshHome(): string {
  // Return a path INSIDE `parent` that doesn't exist yet — bootstrap has to
  // create it (AC-SYS-01 says first-run creates the whole tree).
  return join(parent, 'home');
}

describe('bootstrap() (AC-SYS-01)', () => {
  beforeEach(() => {
    parent = mkdtempSync(join(tmpdir(), 'behandlung-bootstrap-'));
    // Tests must not be influenced by the developer's TEST_MODE/DB_PATH env.
    delete Bun.env.BEHANDLUNG_TEST_MODE;
    delete Bun.env.DB_PATH;
  });

  afterEach(() => {
    rmSync(parent, { recursive: true, force: true });
  });

  it('creates app.db, templates/, bills/, timesheets/ under a fresh home', () => {
    const home = freshHome();
    expect(existsSync(home)).toBe(false);

    const { paths, dbPath } = bootstrap(home);

    expect(paths.home).toBe(home);
    expect(dbPath).toBe(paths.dbPath);
    expect(existsSync(paths.dbPath)).toBe(true);
    expect(existsSync(paths.templatesDir)).toBe(true);
    expect(existsSync(paths.billsDir)).toBe(true);
    expect(existsSync(paths.timesheetsDir)).toBe(true);
  });

  it('is idempotent — re-running returns the same layout without errors', () => {
    const home = freshHome();
    const first = bootstrap(home);
    expect(() => bootstrap(home)).not.toThrow();
    const second = bootstrap(home);
    expect(second.paths.dbPath).toBe(first.paths.dbPath);
    expect(existsSync(second.paths.billsDir)).toBe(true);
  });

  it('honours BEHANDLUNG_TEST_MODE=1 for the db path while still creating the home dirs', () => {
    Bun.env.BEHANDLUNG_TEST_MODE = '1';
    try {
      const home = freshHome();
      const { dbPath, paths } = bootstrap(home);
      expect(dbPath).toBe('./data/app-test.db');
      expect(dbPath).not.toBe(paths.dbPath);
      // home still gets its dirs created.
      expect(existsSync(paths.templatesDir)).toBe(true);
      expect(existsSync(paths.billsDir)).toBe(true);
      expect(existsSync(paths.timesheetsDir)).toBe(true);
    } finally {
      delete Bun.env.BEHANDLUNG_TEST_MODE;
      // Clean up the test-mode db sidecar so it doesn't leak between tests.
      rmSync('./data/app-test.db', { force: true });
      rmSync('./data/app-test.db-wal', { force: true });
      rmSync('./data/app-test.db-shm', { force: true });
    }
  });

  it('honours DB_PATH env when set (standalone hook)', () => {
    const home = freshHome();
    const customDbPath = join(parent, 'custom-app.db');
    Bun.env.DB_PATH = customDbPath;
    try {
      const { dbPath } = bootstrap(home);
      expect(dbPath).toBe(customDbPath);
      expect(existsSync(customDbPath)).toBe(true);
    } finally {
      delete Bun.env.DB_PATH;
    }
  });
});
