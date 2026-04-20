import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface ManifestIcon {
  readonly src: string;
  readonly sizes: string;
  readonly type?: string;
  readonly purpose?: string;
}

interface WebManifest {
  readonly display?: string;
  readonly theme_color?: string;
  readonly background_color?: string;
  readonly start_url?: string;
  readonly scope?: string;
  readonly icons?: readonly ManifestIcon[];
}

const manifestPath = resolve(__dirname, '../../../public/manifest.webmanifest');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as WebManifest;

describe('public/manifest.webmanifest', () => {
  it('parses as valid JSON', () => {
    expect(typeof manifest).toBe('object');
  });

  it('declares display=standalone (AGENTS.md: installable PWA)', () => {
    expect(manifest.display).toBe('standalone');
  });

  it('declares theme_color and background_color', () => {
    expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{3,8}$/);
    expect(manifest.background_color).toMatch(/^#[0-9a-fA-F]{3,8}$/);
  });

  it('declares icons covering 192 and 512 (Android installability)', () => {
    const icons = manifest.icons ?? [];
    expect(icons.length).toBeGreaterThan(0);
    const tokens = icons.flatMap((i) => i.sizes.split(/\s+/));
    const covers = (needle: string): boolean =>
      tokens.some((size) => size === 'any' || size === needle);
    expect(covers('192x192')).toBe(true);
    expect(covers('512x512')).toBe(true);
  });
});
