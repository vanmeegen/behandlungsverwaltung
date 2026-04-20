import { basename, join } from 'node:path';
import type { Paths } from '../paths';

async function serveFrom(url: URL, prefix: string, dir: string): Promise<Response> {
  const segment = decodeURIComponent(url.pathname.replace(new RegExp(`^${prefix}/?`), ''));
  if (!segment) return new Response('Not found', { status: 404 });
  const clean = basename(segment);
  if (clean !== segment) return new Response('Not found', { status: 404 });
  if (clean.startsWith('.')) return new Response('Not found', { status: 404 });
  const file = Bun.file(join(dir, clean));
  if (!(await file.exists())) return new Response('Not found', { status: 404 });
  return new Response(file, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${clean}"`,
    },
  });
}

// Serves files from `bills/`. Sanitises the filename segment against path
// traversal: only a basename is accepted, and anything else returns 404.
export async function billsHandler(url: URL, paths: Paths): Promise<Response> {
  return serveFrom(url, '/bills', paths.billsDir);
}

export async function timesheetsHandler(url: URL, paths: Paths): Promise<Response> {
  return serveFrom(url, '/timesheets', paths.timesheetsDir);
}
