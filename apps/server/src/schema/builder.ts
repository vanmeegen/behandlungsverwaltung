import SchemaBuilder from '@pothos/core';
import type { Db } from '../db/client';
import { paths, type Paths } from '../paths';

export interface SchemaContext {
  requestId: string;
  db: Db;
  paths?: Paths;
}

export function resolvePaths(ctx: SchemaContext): Paths {
  return ctx.paths ?? paths();
}

export const builder = new SchemaBuilder<{ Context: SchemaContext }>({});

builder.queryType({});
builder.mutationType({});
