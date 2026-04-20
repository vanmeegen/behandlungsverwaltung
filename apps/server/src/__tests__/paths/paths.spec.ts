import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureDataDirs, paths } from '../../paths';

let workDir: string;

describe('paths(homeOverride?) — resolve filesystem layout', () => {
  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'behandlung-paths-'));
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
    delete Bun.env.BEHANDLUNG_HOME;
  });

  it('resolves dirs relative to the explicit override', () => {
    const p = paths(workDir);
    expect(p.dbPath).toBe(join(workDir, 'app.db'));
    expect(p.templatesDir).toBe(join(workDir, 'templates'));
    expect(p.billsDir).toBe(join(workDir, 'bills'));
    expect(p.timesheetsDir).toBe(join(workDir, 'timesheets'));
  });

  it('uses BEHANDLUNG_HOME when no explicit override is given', () => {
    Bun.env.BEHANDLUNG_HOME = workDir;
    const p = paths();
    expect(p.dbPath).toBe(join(workDir, 'app.db'));
  });

  it('falls back to $HOME/.behandlungsverwaltung when no override nor env is set', () => {
    const p = paths();
    expect(p.dbPath).toBe(join(homedir(), '.behandlungsverwaltung', 'app.db'));
  });
});

describe('ensureDataDirs', () => {
  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'behandlung-paths-'));
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('creates all four paths entries (db parent, templates, bills, timesheets)', () => {
    const target = join(workDir, 'fresh');
    const p = paths(target);
    ensureDataDirs(p);
    expect(existsSync(target)).toBe(true);
    expect(existsSync(p.templatesDir)).toBe(true);
    expect(existsSync(p.billsDir)).toBe(true);
    expect(existsSync(p.timesheetsDir)).toBe(true);
  });

  it('is idempotent', () => {
    const p = paths(workDir);
    ensureDataDirs(p);
    ensureDataDirs(p);
    expect(existsSync(p.templatesDir)).toBe(true);
  });
});
