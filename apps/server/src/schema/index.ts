import { builder } from './builder';
// Side-effect imports: register all domain object + input types, queries, and
// mutations with the builder so they're included in the schema.
import './types';
import './queries';
import './mutations';

export * from './types';

export const HELLO_MESSAGE = 'Hello Behandlungsverwaltung';

builder.queryField('hello', (t) =>
  t.string({
    description: 'Smoke-test query that confirms the GraphQL server is reachable.',
    resolve: () => HELLO_MESSAGE,
  }),
);

export const schema = builder.toSchema();
