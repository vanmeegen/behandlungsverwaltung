const GRAPHQL_URL = 'http://localhost:4000/graphql';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(GRAPHQL_URL, {
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
  if (!body.data) throw new Error('GraphQL response had no data');
  return body.data;
}

export async function resetDb(): Promise<void> {
  await gql<{ testReset: boolean }>('mutation { testReset }');
}

export interface SeededKind {
  id: string;
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  strasse: string;
  hausnummer: string;
  plz: string;
  stadt: string;
  aktenzeichen: string;
}

const KIND_COLUMNS = /* GraphQL */ `
  id
  vorname
  nachname
  geburtsdatum
  strasse
  hausnummer
  plz
  stadt
  aktenzeichen
`;

export async function seedKind(input: Omit<SeededKind, 'id'>): Promise<SeededKind> {
  const data = await gql<{ createKind: SeededKind }>(
    /* GraphQL */ `mutation Seed($input: KindInput!) { createKind(input: $input) { ${KIND_COLUMNS} } }`,
    { input },
  );
  return data.createKind;
}

export async function readKinder(): Promise<SeededKind[]> {
  const data = await gql<{ kinder: SeededKind[] }>(
    /* GraphQL */ `query { kinder { ${KIND_COLUMNS} } }`,
  );
  return data.kinder;
}
