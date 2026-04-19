import SchemaBuilder from '@pothos/core';

export interface SchemaContext {
  requestId: string;
}

export const builder = new SchemaBuilder<{ Context: SchemaContext }>({});

builder.queryType({});
// Mutation type will be added once the first mutation field lands.
