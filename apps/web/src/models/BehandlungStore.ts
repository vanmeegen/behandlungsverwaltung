import { behandlungSchema, type TaetigkeitValue } from '@behandlungsverwaltung/shared';
import { makeAutoObservable, runInAction } from 'mobx';
import type { GraphQLFetcher } from '../api/graphqlClient';

export type BehandlungFieldErrors = Partial<
  Record<'therapieId' | 'datum' | 'be' | 'taetigkeit', string>
>;

export interface Behandlung {
  id: string;
  therapieId: string;
  datum: string;
  be: number;
  taetigkeit: TaetigkeitValue | null;
}

export interface BehandlungFormInput {
  therapieId: string;
  datum: string;
  be: number;
  taetigkeit: TaetigkeitValue | null;
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
  taetigkeit
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
  taetigkeit: TaetigkeitValue | '' = '';
  taetigkeitTouched = false;
  errors: BehandlungFieldErrors = {};

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setKindId(v: string): void {
    this.kindId = v;
    this.therapieId = '';
    this.taetigkeit = '';
    this.taetigkeitTouched = false;
  }

  setTherapie(id: string, defaultTaetigkeit: TaetigkeitValue | null): void {
    this.therapieId = id;
    if (!this.taetigkeitTouched) {
      this.taetigkeit = defaultTaetigkeit ?? '';
    }
  }

  setTaetigkeit(v: TaetigkeitValue | ''): void {
    this.taetigkeit = v;
    this.taetigkeitTouched = true;
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
    this.taetigkeit = '';
    this.taetigkeitTouched = false;
    this.errors = {};
  }

  // PRD §3.1: nach dem Speichern bleibt die Maske bereit für die
  // schnelle Erfassung der nächsten Behandlung desselben Kinds/derselben
  // Therapie. Kind/Therapie bleiben gesetzt, Datum und BE werden auf die
  // Defaults zurückgesetzt, die Tätigkeit wird erneut aus der Therapie
  // vorbelegt (durch den Caller via setTherapie aktualisiert).
  resetForNextEntry(defaultTaetigkeit: TaetigkeitValue | null): void {
    this.datum = todayIso();
    this.be = 1;
    this.taetigkeit = defaultTaetigkeit ?? '';
    this.taetigkeitTouched = false;
    this.errors = {};
  }

  validate(): BehandlungFormInput | null {
    const parsed = behandlungSchema.safeParse({
      therapieId: this.therapieId,
      datum: this.datum,
      be: this.be,
      taetigkeit: this.taetigkeit === '' ? null : this.taetigkeit,
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
      taetigkeit: parsed.data.taetigkeit,
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
