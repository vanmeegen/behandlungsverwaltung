import { createYoga } from 'graphql-yoga';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { resolveDbPath } from './db/client';
import { createAndMigrateDb } from './db/migrate';
import { schema } from './schema';
import type { SchemaContext } from './schema/builder';

const dbPath = resolveDbPath();
mkdirSync(dirname(dbPath), { recursive: true });
createAndMigrateDb(dbPath);

const yoga = createYoga<object, SchemaContext>({
  schema,
  graphqlEndpoint: '/graphql',
  context: () => ({ requestId: crypto.randomUUID() }),
  landingPage: false,
});

const PORT = Number(Bun.env.PORT ?? 4000);

const server = Bun.serve({
  port: PORT,
  fetch: yoga.fetch,
});

console.log(`GraphQL server listening at http://localhost:${server.port}/graphql`);
console.log(`SQLite-Datei: ${dbPath}`);
