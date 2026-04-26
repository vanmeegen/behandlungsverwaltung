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

export type SeededAuftraggeberTyp = 'firma' | 'person';

export interface SeededAuftraggeber {
  id: string;
  typ: SeededAuftraggeberTyp;
  firmenname: string | null;
  vorname: string | null;
  nachname: string | null;
  strasse: string;
  hausnummer: string;
  plz: string;
  stadt: string;
  stundensatzCents: number;
  abteilung: string | null;
  rechnungskopfText: string;
}

const AUFTRAGGEBER_COLUMNS = /* GraphQL */ `
  id
  typ
  firmenname
  vorname
  nachname
  strasse
  hausnummer
  plz
  stadt
  stundensatzCents
  abteilung
  rechnungskopfText
`;

export async function readAuftraggeber(): Promise<SeededAuftraggeber[]> {
  const data = await gql<{ auftraggeber: SeededAuftraggeber[] }>(
    /* GraphQL */ `query { auftraggeber { ${AUFTRAGGEBER_COLUMNS} } }`,
  );
  return data.auftraggeber;
}

export interface SeedAuftraggeberInput {
  typ: SeededAuftraggeberTyp;
  firmenname?: string | null;
  vorname?: string | null;
  nachname?: string | null;
  strasse: string;
  hausnummer: string;
  plz: string;
  stadt: string;
  stundensatzCents: number;
  abteilung?: string | null;
  rechnungskopfText?: string;
}

const DEFAULT_RECHNUNGSKOPF = 'Test Rechnungskopf';

export async function seedAuftraggeber(input: SeedAuftraggeberInput): Promise<SeededAuftraggeber> {
  const payload = {
    firmenname: input.firmenname ?? null,
    vorname: input.vorname ?? null,
    nachname: input.nachname ?? null,
    abteilung: input.abteilung ?? null,
    rechnungskopfText: input.rechnungskopfText ?? DEFAULT_RECHNUNGSKOPF,
    typ: input.typ,
    strasse: input.strasse,
    hausnummer: input.hausnummer,
    plz: input.plz,
    stadt: input.stadt,
    stundensatzCents: input.stundensatzCents,
  };
  const data = await gql<{ createAuftraggeber: SeededAuftraggeber }>(
    /* GraphQL */ `mutation Seed($input: AuftraggeberInput!) { createAuftraggeber(input: $input) { ${AUFTRAGGEBER_COLUMNS} } }`,
    { input: payload },
  );
  return data.createAuftraggeber;
}

export type SeededTherapieForm =
  | 'dyskalkulie'
  | 'lerntherapie'
  | 'lrs_therapie'
  | 'resilienztraining'
  | 'heilpaedagogik'
  | 'elternberatung'
  | 'sonstiges';

export type SeededTaetigkeit =
  | SeededTherapieForm
  | 'elterngespraech'
  | 'lehrergespraech'
  | 'bericht'
  | 'foerderplan'
  | 'teamberatung';

export interface SeededTherapie {
  id: string;
  kindId: string;
  auftraggeberId: string;
  form: SeededTherapieForm;
  kommentar: string | null;
  startdatum: string;
  bewilligteBe: number;
  taetigkeit: SeededTaetigkeit | null;
  gruppentherapie: boolean;
}

const THERAPIE_COLUMNS = /* GraphQL */ `
  id
  kindId
  auftraggeberId
  form
  kommentar
  startdatum
  bewilligteBe
  taetigkeit
  gruppentherapie
`;

export async function readTherapien(): Promise<SeededTherapie[]> {
  const data = await gql<{ therapien: SeededTherapie[] }>(
    /* GraphQL */ `query { therapien { ${THERAPIE_COLUMNS} } }`,
  );
  return data.therapien;
}

export type SeedTherapieInput = Omit<SeededTherapie, 'id' | 'gruppentherapie'> & {
  gruppentherapie?: boolean;
};

export async function seedTherapie(input: SeedTherapieInput): Promise<SeededTherapie> {
  const payload = {
    ...input,
    gruppentherapie: input.gruppentherapie ?? false,
  };
  const data = await gql<{ createTherapie: SeededTherapie }>(
    /* GraphQL */ `mutation Seed($input: TherapieInput!) { createTherapie(input: $input) { ${THERAPIE_COLUMNS} } }`,
    { input: payload },
  );
  return data.createTherapie;
}

export interface SeededBehandlung {
  id: string;
  therapieId: string;
  datum: string;
  be: number;
  taetigkeit: SeededTaetigkeit | null;
  gruppentherapie: boolean;
}

const BEHANDLUNG_COLUMNS = /* GraphQL */ `
  id
  therapieId
  datum
  be
  taetigkeit
  gruppentherapie
`;

export async function readBehandlungenByTherapie(therapieId: string): Promise<SeededBehandlung[]> {
  const data = await gql<{ behandlungenByTherapie: SeededBehandlung[] }>(
    /* GraphQL */ `query Q($therapieId: ID!) { behandlungenByTherapie(therapieId: $therapieId) { ${BEHANDLUNG_COLUMNS} } }`,
    { therapieId },
  );
  return data.behandlungenByTherapie;
}

export async function seedBehandlung(input: {
  therapieId: string;
  datum: string;
  be: number;
  taetigkeit?: SeededTaetigkeit;
  gruppentherapie?: boolean;
}): Promise<SeededBehandlung> {
  const data = await gql<{ createBehandlung: SeededBehandlung }>(
    /* GraphQL */ `mutation Seed($input: BehandlungInput!) { createBehandlung(input: $input) { ${BEHANDLUNG_COLUMNS} } }`,
    { input },
  );
  return data.createBehandlung;
}

export async function uploadFixtureTemplate(input: {
  kind: 'rechnung' | 'stundennachweis';
  auftraggeberId: string | null;
  base64: string;
}): Promise<{ id: string; kind: string; filename: string }> {
  const data = await gql<{
    uploadTemplate: { id: string; kind: string; filename: string };
  }>(
    /* GraphQL */ `
      mutation Seed($input: UploadTemplateInput!) {
        uploadTemplate(input: $input) {
          id
          kind
          filename
        }
      }
    `,
    { input },
  );
  return data.uploadTemplate;
}

export interface SeededRechnung {
  id: string;
  nummer: string;
  jahr: number;
  monat: number;
  kindId: string;
  auftraggeberId: string;
  stundensatzCentsSnapshot: number;
  gesamtCents: number;
  dateiname: string;
}

export async function createMonatsrechnungApi(input: {
  year: number;
  month: number;
  kindId: string;
  auftraggeberId: string;
  rechnungsdatum?: string;
  lfdNummer?: number;
}): Promise<SeededRechnung> {
  const payload = {
    ...input,
    rechnungsdatum: input.rechnungsdatum ?? new Date().toISOString().slice(0, 10),
  };
  const data = await gql<{ createMonatsrechnung: SeededRechnung }>(
    /* GraphQL */ `
      mutation Seed($input: CreateMonatsrechnungInput!) {
        createMonatsrechnung(input: $input) {
          id
          nummer
          jahr
          monat
          kindId
          auftraggeberId
          stundensatzCentsSnapshot
          gesamtCents
          dateiname
        }
      }
    `,
    { input: payload },
  );
  return data.createMonatsrechnung;
}

export async function readRechnungen(): Promise<SeededRechnung[]> {
  const data = await gql<{ rechnungen: SeededRechnung[] }>(/* GraphQL */ `
    query {
      rechnungen {
        id
        nummer
        jahr
        monat
        kindId
        auftraggeberId
        stundensatzCentsSnapshot
        gesamtCents
        dateiname
      }
    }
  `);
  return data.rechnungen;
}
