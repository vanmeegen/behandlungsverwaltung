import {
  TAETIGKEIT_VALUES,
  therapieSchema,
  THERAPIE_FORM_VALUES,
  type TaetigkeitValue,
  type TherapieFormValue,
} from '@behandlungsverwaltung/shared';
import { makeAutoObservable, runInAction } from 'mobx';
import type { GraphQLFetcher } from '../api/graphqlClient';

export type TherapieFieldErrors = Partial<
  Record<'kindId' | 'auftraggeberId' | 'form' | 'kommentar' | 'bewilligteBe' | 'taetigkeit', string>
>;

export interface Therapie {
  id: string;
  kindId: string;
  auftraggeberId: string;
  form: TherapieFormValue;
  kommentar: string | null;
  bewilligteBe: number;
  taetigkeit: TaetigkeitValue | null;
}

export interface TherapieFormInput {
  kindId: string;
  auftraggeberId: string;
  form: TherapieFormValue;
  kommentar: string | null;
  bewilligteBe: number;
  taetigkeit: TaetigkeitValue | null;
}

const THERAPIE_COLUMNS = /* GraphQL */ `
  id
  kindId
  auftraggeberId
  form
  kommentar
  bewilligteBe
  taetigkeit
`;

const THERAPIEN_QUERY = /* GraphQL */ `
  query Therapien {
    therapien {
      ${THERAPIE_COLUMNS}
    }
  }
`;

const THERAPIEN_BY_KIND_QUERY = /* GraphQL */ `
  query TherapienByKind($kindId: ID!) {
    therapienByKind(kindId: $kindId) {
      ${THERAPIE_COLUMNS}
    }
  }
`;

const THERAPIEN_BY_AG_QUERY = /* GraphQL */ `
  query TherapienByAg($auftraggeberId: ID!) {
    therapienByAuftraggeber(auftraggeberId: $auftraggeberId) {
      ${THERAPIE_COLUMNS}
    }
  }
`;

const CREATE_THERAPIE = /* GraphQL */ `
  mutation CreateTherapie($input: TherapieInput!) {
    createTherapie(input: $input) {
      ${THERAPIE_COLUMNS}
    }
  }
`;

const UPDATE_THERAPIE = /* GraphQL */ `
  mutation UpdateTherapie($id: ID!, $input: TherapieInput!) {
    updateTherapie(id: $id, input: $input) {
      ${THERAPIE_COLUMNS}
    }
  }
`;

const DELETE_THERAPIE = /* GraphQL */ `
  mutation DeleteTherapie($id: ID!) {
    deleteTherapie(id: $id)
  }
`;

export class TherapieDraft {
  editingId: string | null = null;
  kindId = '';
  auftraggeberId = '';
  form: TherapieFormValue = 'lerntherapie';
  kommentar = '';
  bewilligteBe = 0;
  taetigkeit: TaetigkeitValue | '' = '';
  errors: TherapieFieldErrors = {};

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setKindId(v: string): void {
    this.kindId = v;
  }
  setAuftraggeberId(v: string): void {
    this.auftraggeberId = v;
  }
  setForm(v: TherapieFormValue): void {
    this.form = v;
  }
  setKommentar(v: string): void {
    this.kommentar = v;
  }
  setBewilligteBe(v: number): void {
    this.bewilligteBe = v;
  }
  setTaetigkeit(v: TaetigkeitValue | ''): void {
    this.taetigkeit = v;
  }

  loadFrom(t: Therapie): void {
    this.editingId = t.id;
    this.kindId = t.kindId;
    this.auftraggeberId = t.auftraggeberId;
    this.form = t.form;
    this.kommentar = t.kommentar ?? '';
    this.bewilligteBe = t.bewilligteBe;
    this.taetigkeit = t.taetigkeit ?? '';
    this.errors = {};
  }

  reset(): void {
    this.editingId = null;
    this.kindId = '';
    this.auftraggeberId = '';
    this.form = 'lerntherapie';
    this.kommentar = '';
    this.bewilligteBe = 0;
    this.taetigkeit = '';
    this.errors = {};
  }

  validate(): TherapieFormInput | null {
    const parsed = therapieSchema.safeParse({
      kindId: this.kindId,
      auftraggeberId: this.auftraggeberId,
      form: this.form,
      kommentar: this.kommentar,
      bewilligteBe: this.bewilligteBe,
      taetigkeit: this.taetigkeit === '' ? null : this.taetigkeit,
    });
    if (!parsed.success) {
      const next: TherapieFieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key !== 'string') continue;
        const field = key as keyof TherapieFieldErrors;
        if (!next[field]) next[field] = issue.message;
      }
      this.errors = next;
      return null;
    }
    this.errors = {};
    return {
      kindId: parsed.data.kindId,
      auftraggeberId: parsed.data.auftraggeberId,
      form: parsed.data.form,
      kommentar: parsed.data.kommentar,
      bewilligteBe: parsed.data.bewilligteBe,
      taetigkeit: parsed.data.taetigkeit,
    };
  }
}

export class TherapieStore {
  items: Therapie[] = [];
  byKind: Record<string, Therapie[]> = {};
  byAuftraggeber: Record<string, Therapie[]> = {};
  loading = false;
  error: string | null = null;
  draftTherapie = new TherapieDraft();

  constructor(private readonly fetcher: GraphQLFetcher) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      const data = await this.fetcher<{ therapien: Therapie[] }>(THERAPIEN_QUERY);
      runInAction(() => {
        this.items = data.therapien;
      });
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : String(err);
      });
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  async loadByKind(kindId: string): Promise<Therapie[]> {
    const data = await this.fetcher<{ therapienByKind: Therapie[] }>(THERAPIEN_BY_KIND_QUERY, {
      kindId,
    });
    runInAction(() => {
      this.byKind = { ...this.byKind, [kindId]: data.therapienByKind };
    });
    return data.therapienByKind;
  }

  async loadByAuftraggeber(auftraggeberId: string): Promise<Therapie[]> {
    const data = await this.fetcher<{ therapienByAuftraggeber: Therapie[] }>(
      THERAPIEN_BY_AG_QUERY,
      { auftraggeberId },
    );
    runInAction(() => {
      this.byAuftraggeber = {
        ...this.byAuftraggeber,
        [auftraggeberId]: data.therapienByAuftraggeber,
      };
    });
    return data.therapienByAuftraggeber;
  }

  async create(input: TherapieFormInput): Promise<Therapie | null> {
    this.error = null;
    try {
      const data = await this.fetcher<{ createTherapie: Therapie }>(CREATE_THERAPIE, { input });
      runInAction(() => {
        this.items = [...this.items, data.createTherapie];
      });
      return data.createTherapie;
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : String(err);
      });
      return null;
    }
  }

  async update(id: string, input: TherapieFormInput): Promise<Therapie | null> {
    this.error = null;
    try {
      const data = await this.fetcher<{ updateTherapie: Therapie }>(UPDATE_THERAPIE, {
        id,
        input,
      });
      runInAction(() => {
        this.items = this.items.map((t) => (t.id === id ? data.updateTherapie : t));
      });
      return data.updateTherapie;
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : String(err);
      });
      return null;
    }
  }

  startCreate(): void {
    this.draftTherapie.reset();
  }

  startEdit(t: Therapie): void {
    this.draftTherapie.loadFrom(t);
  }

  async saveDraft(): Promise<Therapie | null> {
    const input = this.draftTherapie.validate();
    if (!input) return null;
    if (this.draftTherapie.editingId) {
      return this.update(this.draftTherapie.editingId, input);
    }
    return this.create(input);
  }

  async remove(id: string): Promise<boolean> {
    this.error = null;
    try {
      await this.fetcher<{ deleteTherapie: boolean }>(DELETE_THERAPIE, { id });
      runInAction(() => {
        this.items = this.items.filter((t) => t.id !== id);
      });
      return true;
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : String(err);
      });
      return false;
    }
  }
}

export { TAETIGKEIT_VALUES, THERAPIE_FORM_VALUES };
export type { TaetigkeitValue, TherapieFormValue };
