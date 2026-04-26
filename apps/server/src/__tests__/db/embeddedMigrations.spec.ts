import { afterEach, describe, expect, it } from 'bun:test';
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { materializeEmbeddedMigrations } from '../../db/embeddedMigrations';

const ON_DISK_DRIZZLE = resolve(import.meta.dir, '../../../drizzle');

interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints?: boolean;
}
interface Journal {
  entries: JournalEntry[];
}

describe('embeddedMigrations', () => {
  const cleanup: string[] = [];
  afterEach(() => {
    for (const d of cleanup) rmSync(d, { recursive: true, force: true });
    cleanup.length = 0;
  });

  it('embeds every migration listed in drizzle/meta/_journal.json (regression guard)', () => {
    const journal = JSON.parse(
      readFileSync(join(ON_DISK_DRIZZLE, 'meta/_journal.json'), 'utf-8'),
    ) as Journal;
    const dir = materializeEmbeddedMigrations();
    cleanup.push(dir);
    for (const entry of journal.entries) {
      const expected = join(dir, `${entry.tag}.sql`);
      expect(existsSync(expected), `Missing embedded migration: ${entry.tag}.sql`).toBe(true);
      expect(statSync(expected).size).toBeGreaterThan(0);
    }
  });

  it('also materializes meta/_journal.json so drizzle migrate can find it', () => {
    const dir = materializeEmbeddedMigrations();
    cleanup.push(dir);
    expect(existsSync(join(dir, 'meta/_journal.json'))).toBe(true);
  });

  it('produces only files referenced in the on-disk drizzle dir (no orphans, no extras)', () => {
    const dir = materializeEmbeddedMigrations();
    cleanup.push(dir);
    const sqlFiles = readdirSync(dir).filter((f) => f.endsWith('.sql'));
    for (const f of sqlFiles) {
      expect(existsSync(join(ON_DISK_DRIZZLE, f))).toBe(true);
    }
  });
});
