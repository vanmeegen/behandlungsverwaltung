#!/usr/bin/env bun
/**
 * Stops anything listening on the dev ports (Vite :5173, GraphQL :4000).
 * Safe to re-run; prints a short summary.
 */
import { $ } from 'bun';

const PORTS = [5173, 4000] as const;
let killed = 0;

for (const port of PORTS) {
  const { stdout, exitCode } = await $`lsof -ti:${port}`.quiet().nothrow();
  if (exitCode !== 0) continue;
  const pids = stdout.toString().trim().split('\n').filter(Boolean);
  for (const pid of pids) {
    console.log(`Stopping PID ${pid} on :${port}`);
    await $`kill -9 ${pid}`.quiet().nothrow();
    killed++;
  }
}

if (killed === 0) {
  console.log('No processes on :5173 or :4000.');
} else {
  console.log(`Stopped ${killed} process(es).`);
}
