import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { templatesHandler } from '../../http/billsRoute';
import { ensureDataDirs, paths } from '../../paths';

describe('GET /templates/:filename', () => {
  let dir: string;
  let paths_: ReturnType<typeof paths>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'templates-route-'));
    paths_ = paths(dir);
    ensureDataDirs(paths_);
    writeFileSync(join(paths_.templatesDir, 'rechnung.pdf'), 'pdfbytes');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('serves an existing template as application/pdf', async () => {
    const res = await templatesHandler(new URL('http://x/templates/rechnung.pdf'), paths_);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toContain('rechnung.pdf');
    const text = await res.text();
    expect(text).toBe('pdfbytes');
  });

  it('returns 404 for missing files', async () => {
    const res = await templatesHandler(new URL('http://x/templates/missing.pdf'), paths_);
    expect(res.status).toBe(404);
  });

  it('rejects path traversal attempts', async () => {
    const res = await templatesHandler(new URL('http://x/templates/..%2Fapp.db'), paths_);
    expect(res.status).toBe(404);
  });
});
