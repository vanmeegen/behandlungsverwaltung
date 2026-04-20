import { GraphQLError } from 'graphql';
import type { z } from 'zod';

export function validateOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const firstIssue = result.error.issues[0];
  const message = firstIssue?.message ?? 'Validation failed';
  throw new GraphQLError(message, {
    extensions: {
      code: 'VALIDATION_ERROR',
      issues: result.error.issues,
    },
  });
}
