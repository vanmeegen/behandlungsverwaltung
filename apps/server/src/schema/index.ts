import { builder } from './builder';

export const HELLO_MESSAGE = 'Hello Behandlungsverwaltung';

builder.queryField('hello', (t) =>
  t.string({
    description: 'Smoke-test query that confirms the GraphQL server is reachable.',
    resolve: () => HELLO_MESSAGE,
  }),
);

export const schema = builder.toSchema();
