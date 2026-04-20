import { builder } from './builder';
// Side-effect import: registers all domain object types + enums with the builder
// so they're included in the schema and introspectable before Phase 2+ adds queries.
import './types';

export * from './types';

export const HELLO_MESSAGE = 'Hello Behandlungsverwaltung';

builder.queryField('hello', (t) =>
  t.string({
    description: 'Smoke-test query that confirms the GraphQL server is reachable.',
    resolve: () => HELLO_MESSAGE,
  }),
);

export const schema = builder.toSchema();
