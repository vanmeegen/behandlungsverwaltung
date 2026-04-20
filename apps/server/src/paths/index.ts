import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export interface Paths {
  home: string;
  dbPath: string;
  templatesDir: string;
  billsDir: string;
  timesheetsDir: string;
}

function resolveHome(homeOverride?: string): string {
  if (homeOverride) return homeOverride;
  if (Bun.env.BEHANDLUNG_HOME) return Bun.env.BEHANDLUNG_HOME;
  return join(homedir(), '.behandlungsverwaltung');
}

export function paths(homeOverride?: string): Paths {
  const home = resolveHome(homeOverride);
  return {
    home,
    dbPath: join(home, 'app.db'),
    templatesDir: join(home, 'templates'),
    billsDir: join(home, 'bills'),
    timesheetsDir: join(home, 'timesheets'),
  };
}

export function ensureDataDirs(p: Paths): void {
  mkdirSync(dirname(p.dbPath), { recursive: true });
  mkdirSync(p.templatesDir, { recursive: true });
  mkdirSync(p.billsDir, { recursive: true });
  mkdirSync(p.timesheetsDir, { recursive: true });
}
