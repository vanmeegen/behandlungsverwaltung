import { createYoga } from 'graphql-yoga';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { schema } from './schema';
import type { SchemaContext } from './schema/builder';
import { staticFiles } from './generated/staticFiles';

function platformDataDir(): string {
  const exePath = process.execPath;
  const base = exePath.toLowerCase().includes('bun') ? process.cwd() : dirname(exePath);
  const dataDir = join(base, 'data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

Bun.env.DB_PATH = Bun.env.DB_PATH ?? join(platformDataDir(), 'app.db');

const yoga = createYoga<object, SchemaContext>({
  schema,
  graphqlEndpoint: '/graphql',
  context: () => ({ requestId: crypto.randomUUID() }),
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
console.log(`SQLite-Datei: ${Bun.env.DB_PATH}`);

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
