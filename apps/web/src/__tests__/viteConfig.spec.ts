import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('vite server proxy', () => {
  const src = readFileSync(resolve(__dirname, '../../vite.config.ts'), 'utf-8');

  it.each(['/graphql', '/bills', '/timesheets', '/templates'])(
    'declares a proxy entry for %s so PDFs load via the backend in dev',
    (path) => {
      const re = new RegExp(`['"]${path.replace(/\//g, '\\/')}['"]\\s*:`);
      expect(src).toMatch(re);
    },
  );
});
