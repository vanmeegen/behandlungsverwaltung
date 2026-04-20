import { rmSync } from 'node:fs';

export default async function globalTeardown(): Promise<void> {
  if (process.env.PWDEBUG === '1') return;
  const home = process.env.BEHANDLUNG_HOME;
  if (!home) return;
  rmSync(home, { recursive: true, force: true });
}
