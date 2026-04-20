import SchemaBuilder from '@pothos/core';
import type { Db } from '../db/client';

export interface SchemaContext {
  requestId: string;
  db: Db;
}

export const builder = new SchemaBuilder<{ Context: SchemaContext }>({});

builder.queryType({});
builder.mutationType({});
