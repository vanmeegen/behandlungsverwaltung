import { builder } from './builder';
// Side-effect imports: register all domain object + input types, queries, and
// mutations with the builder so they're included in the schema.
import './types';
import './queries';
import './mutations';

export * from './types';

export const schema = builder.toSchema();
