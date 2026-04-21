import { createYoga } from 'graphql-yoga';
import { bootstrap } from './bootstrap';
import { billsHandler, timesheetsHandler } from './http/billsRoute';
import { rechnungBundleHandler } from './http/bundleRoute';
import { schema } from './schema';
import type { SchemaContext } from './schema/builder';

const { db, paths: appPaths, dbPath } = bootstrap();

const yoga = createYoga<object, SchemaContext>({
  schema,
  graphqlEndpoint: '/graphql',
  context: () => ({ requestId: crypto.randomUUID(), db, paths: appPaths }),
  landingPage: false,
  maskedErrors: false,
});

const PORT = Number(Bun.env.PORT ?? 4000);

const server = Bun.serve({
  port: PORT,
  fetch: async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    // PRD §3.8 Bundle-Download: muss vor /bills/ liegen, damit der
    // Prefix-Check nicht greift.
    if (url.pathname === '/bills/bundle') return rechnungBundleHandler(url, db, appPaths);
    if (url.pathname.startsWith('/bills/')) return billsHandler(url, appPaths);
    if (url.pathname.startsWith('/timesheets/')) return timesheetsHandler(url, appPaths);
    return yoga.fetch(req);
  },
});

console.log(`GraphQL server listening at http://localhost:${server.port}/graphql`);
console.log(`SQLite-Datei: ${dbPath}`);
