import { createYoga } from 'graphql-yoga';
import { schema } from './schema';
import type { SchemaContext } from './schema/builder';

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
