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

    // Asset paths and anything that looks like a file (has an extension
    // other than .html) must 404 — serving index.html here would mislead
    // the browser into parsing HTML as JS/CSS/etc.
    if (url.pathname.startsWith('/assets/') || /\.[a-z0-9]+$/i.test(url.pathname)) {
      return new Response('Not found', { status: 404 });
    }

    // SPA fallback for client-side routes (/patients/123, etc.)
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
  const fallback = (): void => {
    console.log(`Browser nicht automatisch geöffnet. Bitte ${target} manuell öffnen.`);
  };
  try {
    if (platform === 'win32') {
      // `cmd /c start "" <url>` is the canonical way, but Node's default
      // argument escaping turns the empty-title `""` into `""""`, which
      // breaks `start`. windowsVerbatimArguments disables that rewriting.
      const child = spawn('cmd.exe', ['/c', 'start', '""', target], {
        detached: true,
        stdio: 'ignore',
        windowsVerbatimArguments: true,
      });
      child.on('error', fallback);
      child.unref();
      return;
    }
    const cmd = platform === 'darwin' ? 'open' : 'xdg-open';
    const child = spawn(cmd, [target], { detached: true, stdio: 'ignore' });
    child.on('error', fallback);
    child.unref();
  } catch {
    fallback();
  }
}
