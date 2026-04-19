export interface GraphQLResponse<T> {
  data?: T;
  errors?: ReadonlyArray<{ message: string }>;
}

export type GraphQLFetcher = <T>(query: string, variables?: Record<string, unknown>) => Promise<T>;

export function createGraphQLClient(endpoint = '/graphql'): GraphQLFetcher {
  return async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
    }

    const body = (await response.json()) as GraphQLResponse<T>;
    if (body.errors && body.errors.length > 0) {
      throw new Error(body.errors.map((e) => e.message).join('; '));
    }
    if (!body.data) {
      throw new Error('GraphQL response contained no data');
    }
    return body.data;
  };
}
