import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const swSource = readFileSync(resolve(__dirname, '../../../public/sw.js'), 'utf8');

function extractAppShell(src: string): string[] {
  const match = src.match(/APP_SHELL\s*=\s*\[([\s\S]*?)\]/);
  const body = match?.[1];
  if (!body) throw new Error('APP_SHELL array not found in sw.js');
  const urls: string[] = [];
  for (const m of body.matchAll(/['"]([^'"]+)['"]/g)) {
    const url = m[1];
    if (url) urls.push(url);
  }
  return urls;
}

describe('public/sw.js', () => {
  it('precaches the app shell (/, manifest, index.html)', () => {
    const shell = extractAppShell(swSource);
    expect(shell).toEqual(expect.arrayContaining(['/', '/index.html', '/manifest.webmanifest']));
  });

  it('precaches built asset globs so offline navigations resolve', () => {
    const shell = extractAppShell(swSource);
    expect(shell.some((url) => url.startsWith('/assets/') || url === '/icon.svg')).toBe(true);
  });

  it('never caches /graphql requests', () => {
    expect(swSource).toMatch(/url\.pathname\.startsWith\(['"]\/graphql['"]\)/);
  });

  it('never caches /bills or /timesheets (user-generated PDFs)', () => {
    expect(swSource).toMatch(/\/bills/);
    expect(swSource).toMatch(/\/timesheets/);
  });

  it('caches successful same-origin GET responses (runtime SWR)', () => {
    expect(swSource).toMatch(/cache\.put\s*\(/);
  });

  it('uses a versioned cache name', () => {
    expect(swSource).toMatch(/const\s+CACHE\s*=\s*['"][\w-]+-v\d+['"]/);
  });
});
