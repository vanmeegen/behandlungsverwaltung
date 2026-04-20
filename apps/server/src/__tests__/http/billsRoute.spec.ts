import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { billsHandler } from '../../http/billsRoute';
import { ensureDataDirs, paths } from '../../paths';

describe('GET /bills/:filename', () => {
  let dir: string;
  let paths_: ReturnType<typeof paths>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'bills-route-'));
    paths_ = paths(dir);
    ensureDataDirs(paths_);
    writeFileSync(join(paths_.billsDir, 'valid.pdf'), 'hello');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('serves an existing file as application/pdf', async () => {
    const res = await billsHandler(new URL('http://x/bills/valid.pdf'), paths_);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toContain('valid.pdf');
    const text = await res.text();
    expect(text).toBe('hello');
  });

  it('returns 404 for missing files', async () => {
    const res = await billsHandler(new URL('http://x/bills/nope.pdf'), paths_);
    expect(res.status).toBe(404);
  });

  it('rejects path traversal attempts', async () => {
    const res = await billsHandler(new URL('http://x/bills/..%2Fapp.db'), paths_);
    expect(res.status).toBe(404);
  });

  it('rejects subdirectory segments', async () => {
    const res = await billsHandler(new URL('http://x/bills/nested/foo.pdf'), paths_);
    expect(res.status).toBe(404);
  });
});
