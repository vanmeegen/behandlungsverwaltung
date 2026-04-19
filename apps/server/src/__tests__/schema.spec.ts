import { describe, expect, it } from 'bun:test';
import { graphql } from 'graphql';
import { schema } from '../schema';
import { HELLO_MESSAGE } from '../schema';

describe('GraphQL schema', () => {
  it('resolves the hello query to the greeting constant', async () => {
    const result = await graphql({
      schema,
      source: '{ hello }',
      contextValue: { requestId: 'test' },
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ hello: HELLO_MESSAGE });
  });
});
