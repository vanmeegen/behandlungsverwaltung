import { behandlungSchema } from '@behandlungsverwaltung/shared';
import { makeAutoObservable, runInAction } from 'mobx';
import type { GraphQLFetcher } from '../api/graphqlClient';

export type BehandlungFieldErrors = Partial<
  Record<'therapieId' | 'datum' | 'be' | 'arbeitsthema', string>
>;

export interface Behandlung {
  id: string;
  therapieId: string;
  datum: string;
  be: number;
  arbeitsthema: string | null;
}

export interface BehandlungFormInput {
  therapieId: string;
  datum: string;
  be: number;
  arbeitsthema: string | null;
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const BEHANDLUNG_COLUMNS = /* GraphQL */ `
  id
  therapieId
  datum
  be
  arbeitsthema
`;

const CREATE_BEHANDLUNG = /* GraphQL */ `
  mutation CreateBehandlung($input: BehandlungInput!) {
    createBehandlung(input: $input) {
      ${BEHANDLUNG_COLUMNS}
    }
  }
`;

const BEHANDLUNGEN_BY_THERAPIE_QUERY = /* GraphQL */ `
  query BehandlungenByTherapie($therapieId: ID!) {
    behandlungenByTherapie(therapieId: $therapieId) {
      ${BEHANDLUNG_COLUMNS}
    }
  }
`;

export class BehandlungDraft {
  kindId = '';
  therapieId = '';
  datum: string = todayIso();
  be = 1;
  arbeitsthema = '';
  arbeitsthemaTouched = false;
  errors: BehandlungFieldErrors = {};

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setKindId(v: string): void {
    this.kindId = v;
    this.therapieId = '';
    this.arbeitsthema = '';
    this.arbeitsthemaTouched = false;
  }

  setTherapie(id: string, defaultArbeitsthema: string | null): void {
    this.therapieId = id;
    if (!this.arbeitsthemaTouched) {
      this.arbeitsthema = defaultArbeitsthema ?? '';
    }
  }

  setArbeitsthema(v: string): void {
    this.arbeitsthema = v;
    this.arbeitsthemaTouched = true;
  }

  setDatum(v: string): void {
    this.datum = v;
  }

  setBe(v: number): void {
    this.be = Math.max(1, v);
  }

  incrementBe(): void {
    this.be = this.be + 1;
  }

  decrementBe(): void {
    this.be = Math.max(1, this.be - 1);
  }

  reset(): void {
    this.kindId = '';
    this.therapieId = '';
    this.datum = todayIso();
    this.be = 1;
    this.arbeitsthema = '';
    this.arbeitsthemaTouched = false;
    this.errors = {};
  }

  validate(): BehandlungFormInput | null {
    const parsed = behandlungSchema.safeParse({
      therapieId: this.therapieId,
      datum: this.datum,
      be: this.be,
      arbeitsthema: this.arbeitsthema,
    });
    if (!parsed.success) {
      const next: BehandlungFieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key !== 'string') continue;
        const field = key as keyof BehandlungFieldErrors;
        if (!next[field]) next[field] = issue.message;
      }
      this.errors = next;
      return null;
    }
    this.errors = {};
    return {
      therapieId: parsed.data.therapieId,
      datum: parsed.data.datum,
      be: parsed.data.be,
      arbeitsthema: parsed.data.arbeitsthema,
    };
  }
}

export class BehandlungStore {
  byTherapie: Record<string, Behandlung[]> = {};
  error: string | null = null;
  draftBehandlung = new BehandlungDraft();

  constructor(private readonly fetcher: GraphQLFetcher) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  async loadByTherapie(therapieId: string): Promise<Behandlung[]> {
    const data = await this.fetcher<{ behandlungenByTherapie: Behandlung[] }>(
      BEHANDLUNGEN_BY_THERAPIE_QUERY,
      { therapieId },
    );
    runInAction(() => {
      this.byTherapie = {
        ...this.byTherapie,
        [therapieId]: data.behandlungenByTherapie,
      };
    });
    return data.behandlungenByTherapie;
  }

  async create(input: BehandlungFormInput): Promise<Behandlung | null> {
    this.error = null;
    try {
      const data = await this.fetcher<{ createBehandlung: Behandlung }>(CREATE_BEHANDLUNG, {
        input,
      });
      runInAction(() => {
        const existing = this.byTherapie[input.therapieId] ?? [];
        this.byTherapie = {
          ...this.byTherapie,
          [input.therapieId]: [data.createBehandlung, ...existing],
        };
      });
      return data.createBehandlung;
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : String(err);
      });
      return null;
    }
  }

  async saveDraft(): Promise<Behandlung | null> {
    const input = this.draftBehandlung.validate();
    if (!input) return null;
    return this.create(input);
  }
}
