import { mkdirSync, rmSync } from 'node:fs';

export default async function globalSetup(): Promise<void> {
  const home = process.env.BEHANDLUNG_HOME;
  if (!home) throw new Error('BEHANDLUNG_HOME must be set by playwright.config.ts');
  rmSync(home, { recursive: true, force: true });
  mkdirSync(home, { recursive: true });
}
