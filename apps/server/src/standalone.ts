import { createYoga } from 'graphql-yoga';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { bootstrap } from './bootstrap';
import { billsHandler, timesheetsHandler } from './http/billsRoute';
import { schema } from './schema';
import type { SchemaContext } from './schema/builder';
import { staticFiles } from './generated/staticFiles';

// For the compiled single-file binary, keep data next to the executable.
// In `bun run` mode (dev), fall back to the process cwd. BEHANDLUNG_HOME
// env still wins via `paths()` inside bootstrap().
function executableHome(): string {
  const exePath = process.execPath;
  const base = exePath.toLowerCase().includes('bun') ? process.cwd() : dirname(exePath);
  return join(base, 'data');
}

const {
  db,
  paths: appPaths,
  dbPath,
} = bootstrap(Bun.env.BEHANDLUNG_HOME ? undefined : executableHome());

const yoga = createYoga<object, SchemaContext>({
  schema,
  graphqlEndpoint: '/graphql',
  context: () => ({ requestId: crypto.randomUUID(), db, paths: appPaths }),
  landingPage: false,
});

const PORT = Number(Bun.env.PORT ?? 4000);

const server = Bun.serve({
  port: PORT,
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/graphql' || url.pathname.startsWith('/graphql/')) {
      return yoga.fetch(req);
    }
    if (url.pathname.startsWith('/bills/')) return billsHandler(url, appPaths);
    if (url.pathname.startsWith('/timesheets/')) return timesheetsHandler(url, appPaths);

    const key = url.pathname === '/' ? '/index.html' : url.pathname;
    const embedded = staticFiles.get(key);
    if (embedded) {
      return new Response(Bun.file(embedded));
    }

    // SPA fallback for unknown paths
    const indexPath = staticFiles.get('/index.html');
    if (indexPath) {
      return new Response(Bun.file(indexPath), {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }

    return new Response('Not found', { status: 404 });
  },
});

const url = `http://localhost:${server.port}`;
console.log(`Behandlungsverwaltung läuft auf ${url}`);
console.log(`SQLite-Datei: ${dbPath}`);

openInBrowser(url);

function openInBrowser(target: string): void {
  const platform = process.platform;
  let cmd: string;
  let args: string[];
  if (platform === 'win32') {
    cmd = 'cmd';
    args = ['/c', 'start', '""', target];
  } else if (platform === 'darwin') {
    cmd = 'open';
    args = [target];
  } else {
    cmd = 'xdg-open';
    args = [target];
  }
  try {
    const child = spawn(cmd, args, { detached: true, stdio: 'ignore' });
    child.on('error', () => {
      console.log(`Browser nicht automatisch geöffnet. Bitte ${target} manuell öffnen.`);
    });
    child.unref();
  } catch {
    console.log(`Browser nicht automatisch geöffnet. Bitte ${target} manuell öffnen.`);
  }
}
