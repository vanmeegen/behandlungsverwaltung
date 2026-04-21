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
import { mkdir, access, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { injectWindowsResources } from './inject-windows-resources';

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
const windowsIcon = resolve(repoRoot, 'apps/web/public/app-icon.ico');
const cacheDir = resolve(repoRoot, '.cache/build-standalone');

// Bun's --windows-icon only works when compiling on Windows. From
// Linux/macOS we instead patch the icon into the stock bun.exe that's
// used as the compile base, then let `bun build --compile` append our
// JS payload on top via --compile-executable-path.
async function prepareWindowsBunBase(version: string): Promise<string> {
  const patchedPath = resolve(cacheDir, `bun-${version}-windows-x64-branded.exe`);
  try {
    await access(patchedPath);
    return patchedPath;
  } catch {
    // fall through to download + patch
  }

  await mkdir(cacheDir, { recursive: true });
  const pristinePath = resolve(cacheDir, `bun-${version}-windows-x64-pristine.exe`);
  try {
    await access(pristinePath);
  } catch {
    const url = `https://github.com/oven-sh/bun/releases/download/bun-v${version}/bun-windows-x64.zip`;
    const zipPath = resolve(cacheDir, `bun-${version}-windows-x64.zip`);
    console.log(`  ▶ Downloading ${url}`);
    await $`curl -sL -o ${zipPath} ${url}`;
    await $`unzip -o -q ${zipPath} -d ${cacheDir}`;
    await copyFile(resolve(cacheDir, 'bun-windows-x64/bun.exe'), pristinePath);
  }

  console.log(`  ▶ Patching stock bun.exe with icon + version info`);
  await copyFile(pristinePath, patchedPath);
  await injectWindowsResources({
    exePath: patchedPath,
    icoPath: windowsIcon,
    productName: 'Behandlungsverwaltung',
    fileDescription: 'Behandlungsverwaltung – Standalone',
    fileVersion: [0, 1, 0, 0],
  });
  return patchedPath;
}

async function run(): Promise<void> {
  const targets = parseTargets();
  console.log(`\n▶ Targets: ${targets.map((t) => t.id).join(', ')}\n`);

  console.log('▶ Building web (vite) ...');
  await $`bun run build`.cwd(resolve(repoRoot, 'apps/web'));

  console.log('\n▶ Generating static-file manifest ...');
  await $`bun run ${resolve(repoRoot, 'scripts/generate-static-manifest.ts')}`;

  await mkdir(outDir, { recursive: true });

  const bunVersion = Bun.version;

  for (const target of targets) {
    const outfile = resolve(outDir, target.outfile);
    console.log(`\n▶ Compiling for ${target.id} → ${outfile}`);
    if (target.id === 'windows-x64' && process.platform !== 'win32') {
      const base = await prepareWindowsBunBase(bunVersion);
      await $`bun build --compile --minify --target=${target.bunTarget} --compile-executable-path=${base} --outfile=${outfile} ${entry}`;
    } else {
      await $`bun build --compile --minify --target=${target.bunTarget} --outfile=${outfile} ${entry}`;
    }
  }

  console.log(`\n✓ Standalone builds written to ${outDir}`);
}

await run();
