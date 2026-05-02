/// <reference types="vitest" />
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rootPkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf-8'),
) as { version: string };

function safeGitSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    // Außerhalb eines git-Repos (z. B. unpacked-Tarball-Build) — Fallback.
    return 'unknown';
  }
}

const APP_VERSION = JSON.stringify(rootPkg.version);
const GIT_SHA = JSON.stringify(safeGitSha());
const BUILD_DATE = JSON.stringify(new Date().toISOString().slice(0, 10));

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: APP_VERSION,
    __GIT_SHA__: GIT_SHA,
    __BUILD_DATE__: BUILD_DATE,
  },
  server: {
    port: 5173,
    proxy: {
      '/graphql': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/bills': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/timesheets': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/templates': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['zod'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['**/__tests__/**/*.spec.{ts,tsx}'],
    css: false,
    server: {
      deps: {
        inline: ['zod', /@behandlungsverwaltung\//],
      },
    },
  },
});
