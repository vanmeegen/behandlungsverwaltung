import { behandlungSchema, type TaetigkeitValue } from '@behandlungsverwaltung/shared';
import { makeAutoObservable, runInAction } from 'mobx';
import type { GraphQLFetcher } from '../api/graphqlClient';

export type BehandlungFieldErrors = Partial<
  Record<'therapieId' | 'datum' | 'be' | 'taetigkeit' | 'gruppentherapie' | 'sonstigesText', string>
>;

export interface Behandlung {
  id: string;
  therapieId: string;
  datum: string;
  be: number;
  taetigkeit: TaetigkeitValue | null;
  gruppentherapie: boolean;
  sonstigesText?: string | null;
}

export interface BehandlungFormInput {
  therapieId: string;
  datum: string;
  be: number;
  taetigkeit: TaetigkeitValue | null;
  gruppentherapie: boolean;
  sonstigesText: string | null;
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
  gruppentherapie
  sonstigesText
`;

// Phase C: Eigene minimale Therapie-Selection nur für die Vorbelegung der
// Gruppentherapie-Checkbox, damit wir TherapieStore nicht anfassen müssen
// (Phase B erweitert ihn separat).
const THERAPIE_GRUPPENTHERAPIE_QUERY = /* GraphQL */ `
  query TherapieGruppentherapie {
    therapien {
      id
      gruppentherapie
    }
  }
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

const UPDATE_BEHANDLUNG = /* GraphQL */ `
  mutation UpdateBehandlung($id: ID!, $input: BehandlungInput!) {
    updateBehandlung(id: $id, input: $input) {
      ${BEHANDLUNG_COLUMNS}
    }
  }
`;

const DELETE_BEHANDLUNG = /* GraphQL */ `
  mutation DeleteBehandlung($id: ID!) {
    deleteBehandlung(id: $id)
  }
`;

export class BehandlungDraft {
  kindId = '';
  therapieId = '';
  datum: string = todayIso();
  be = 1;
  taetigkeit: TaetigkeitValue | '' = '';
  taetigkeitTouched = false;
  gruppentherapie = false;
  gruppentherapieTouched = false;
  sonstigesText = '';
  errors: BehandlungFieldErrors = {};

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setKindId(v: string): void {
    this.kindId = v;
    this.therapieId = '';
    this.taetigkeit = '';
    this.taetigkeitTouched = false;
    this.gruppentherapie = false;
    this.gruppentherapieTouched = false;
  }

  setTherapie(
    id: string,
    defaultTaetigkeit: TaetigkeitValue | null,
    defaultGruppentherapie: boolean = false,
  ): void {
    this.therapieId = id;
    if (!this.taetigkeitTouched) {
      this.taetigkeit = defaultTaetigkeit ?? '';
    }
    if (!this.gruppentherapieTouched) {
      this.gruppentherapie = defaultGruppentherapie;
    }
  }

  setTaetigkeit(v: TaetigkeitValue | ''): void {
    this.taetigkeit = v;
    this.taetigkeitTouched = true;
    if (v !== 'sonstiges') {
      this.sonstigesText = '';
    }
  }

  setSonstigesText(v: string): void {
    this.sonstigesText = v;
  }

  setGruppentherapie(v: boolean): void {
    this.gruppentherapie = v;
    this.gruppentherapieTouched = true;
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
    this.gruppentherapie = false;
    this.gruppentherapieTouched = false;
    this.sonstigesText = '';
    this.errors = {};
  }

  // PRD §3.1: nach dem Speichern bleibt die Maske bereit für die
  // schnelle Erfassung der nächsten Behandlung desselben Kinds/derselben
  // Therapie. Kind/Therapie bleiben gesetzt, Datum und BE werden auf die
  // Defaults zurückgesetzt, die Tätigkeit wird erneut aus der Therapie
  // vorbelegt (durch den Caller via setTherapie aktualisiert).
  resetForNextEntry(
    defaultTaetigkeit: TaetigkeitValue | null,
    defaultGruppentherapie: boolean = false,
  ): void {
    this.datum = todayIso();
    this.be = 1;
    this.taetigkeit = defaultTaetigkeit ?? '';
    this.taetigkeitTouched = false;
    this.gruppentherapie = defaultGruppentherapie;
    this.gruppentherapieTouched = false;
    this.sonstigesText = '';
    this.errors = {};
  }

  validate(): BehandlungFormInput | null {
    const taetigkeitValue = this.taetigkeit === '' ? null : this.taetigkeit;
    const parsed = behandlungSchema.safeParse({
      therapieId: this.therapieId,
      datum: this.datum,
      be: this.be,
      taetigkeit: taetigkeitValue,
      gruppentherapie: this.gruppentherapie,
      sonstigesText: taetigkeitValue === 'sonstiges' ? this.sonstigesText || null : null,
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
      gruppentherapie: parsed.data.gruppentherapie ?? false,
      sonstigesText: parsed.data.sonstigesText ?? null,
    };
  }
}

export class BehandlungStore {
  byTherapie: Record<string, Behandlung[]> = {};
  // Phase C: lokale Map id → gruppentherapie der Therapien, gespeist über
  // eine eigene minimale Query. Damit kann die Schnellerfassung die Checkbox
  // beim Wechsel der Therapie vorbelegen, ohne TherapieStore anzufassen.
  therapieGruppentherapieById: Record<string, boolean> = {};
  error: string | null = null;
  successOpen = false;
  draftBehandlung = new BehandlungDraft();

  constructor(private readonly fetcher: GraphQLFetcher) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  showSuccess(): void {
    this.successOpen = true;
  }

  dismissSuccess(): void {
    this.successOpen = false;
  }

  async loadTherapieGruppentherapieMap(): Promise<Record<string, boolean>> {
    try {
      const data = await this.fetcher<{
        therapien: Array<{ id: string; gruppentherapie: boolean }>;
      }>(THERAPIE_GRUPPENTHERAPIE_QUERY);
      const map: Record<string, boolean> = {};
      for (const t of data.therapien ?? []) map[t.id] = t.gruppentherapie;
      runInAction(() => {
        this.therapieGruppentherapieById = map;
      });
      return map;
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : String(err);
      });
      return {};
    }
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

  async update(id: string, input: BehandlungFormInput): Promise<Behandlung | null> {
    this.error = null;
    try {
      const data = await this.fetcher<{ updateBehandlung: Behandlung }>(UPDATE_BEHANDLUNG, {
        id,
        input,
      });
      const updated = data.updateBehandlung;
      runInAction(() => {
        const therapieId = updated.therapieId;
        this.byTherapie = {
          ...this.byTherapie,
          [therapieId]: (this.byTherapie[therapieId] ?? []).map((b) => (b.id === id ? updated : b)),
        };
      });
      return updated;
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : String(err);
      });
      return null;
    }
  }

  async delete(id: string, therapieId: string): Promise<boolean> {
    this.error = null;
    try {
      await this.fetcher<{ deleteBehandlung: boolean }>(DELETE_BEHANDLUNG, { id });
      runInAction(() => {
        this.byTherapie = {
          ...this.byTherapie,
          [therapieId]: (this.byTherapie[therapieId] ?? []).filter((b) => b.id !== id),
        };
      });
      return true;
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : String(err);
      });
      return false;
    }
  }

  async saveDraft(): Promise<Behandlung | null> {
    const input = this.draftBehandlung.validate();
    if (!input) return null;
    return this.create(input);
  }
}
