#!/usr/bin/env bun
/**
 * Build single-file standalone executables bundling:
 *   - Bun runtime
 *   - graphql-yoga + Pothos GraphQL API
 *   - Vite-built React frontend (embedded assets)
 *   - bun:sqlite for local file-based DB (created next to the executable)
 *
 * Usage:
 *   bun run build:standalone                 # builds the default target list
 *   bun run build:standalone -- --targets=all
 *   bun run build:standalone -- --targets=windows-x64,darwin-arm64
 */
import { $ } from 'bun';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

interface Target {
  id: string;
  bunTarget: string;
  outfile: string;
}

const ALL_TARGETS: Target[] = [
  {
    id: 'windows-x64',
    bunTarget: 'bun-windows-x64',
    outfile: 'behandlungsverwaltung-windows-x64.exe',
  },
  {
    id: 'darwin-arm64',
    bunTarget: 'bun-darwin-arm64',
    outfile: 'behandlungsverwaltung-darwin-arm64',
  },
  {
    id: 'darwin-x64',
    bunTarget: 'bun-darwin-x64',
    outfile: 'behandlungsverwaltung-darwin-x64',
  },
  {
    id: 'linux-x64',
    bunTarget: 'bun-linux-x64',
    outfile: 'behandlungsverwaltung-linux-x64',
  },
  {
    id: 'linux-arm64',
    bunTarget: 'bun-linux-arm64',
    outfile: 'behandlungsverwaltung-linux-arm64',
  },
];

const DEFAULT_TARGET_IDS = ['windows-x64', 'darwin-arm64'];

function parseTargets(): Target[] {
  const arg = process.argv.find((a) => a.startsWith('--targets='));
  const ids = arg
    ? (arg
        .split('=')[1]
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean) ?? DEFAULT_TARGET_IDS)
    : DEFAULT_TARGET_IDS;
  if (ids.includes('all')) return ALL_TARGETS;
  const resolved = ids.map((id) => {
    const t = ALL_TARGETS.find((candidate) => candidate.id === id);
    if (!t) throw new Error(`Unknown target: ${id}`);
    return t;
  });
  return resolved;
}

const repoRoot = resolve(import.meta.dir, '..');
const outDir = resolve(repoRoot, 'dist-standalone');
const entry = resolve(repoRoot, 'apps/server/src/standalone.ts');

async function run(): Promise<void> {
  const targets = parseTargets();
  console.log(`\n▶ Targets: ${targets.map((t) => t.id).join(', ')}\n`);

  console.log('▶ Building web (vite) ...');
  await $`bun run build`.cwd(resolve(repoRoot, 'apps/web'));

  console.log('\n▶ Generating static-file manifest ...');
  await $`bun run ${resolve(repoRoot, 'scripts/generate-static-manifest.ts')}`;

  await mkdir(outDir, { recursive: true });

  for (const target of targets) {
    const outfile = resolve(outDir, target.outfile);
    console.log(`\n▶ Compiling for ${target.id} → ${outfile}`);
    await $`bun build --compile --minify --target=${target.bunTarget} --outfile=${outfile} ${entry}`;
  }

  console.log(`\n✓ Standalone builds written to ${outDir}`);
}

await run();
