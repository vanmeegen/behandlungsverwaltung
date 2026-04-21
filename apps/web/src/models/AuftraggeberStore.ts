import {
  auftraggeberSchema,
  parseEuroToCents,
  type AuftraggeberInputType,
} from '@behandlungsverwaltung/shared';
import { makeAutoObservable, runInAction } from 'mobx';
import type { GraphQLFetcher } from '../api/graphqlClient';

export type AuftraggeberTyp = 'firma' | 'person';

export type AuftraggeberFieldErrors = Partial<
  Record<keyof AuftraggeberInputType | 'stundensatzCents', string>
>;

export interface Auftraggeber {
  id: string;
  typ: AuftraggeberTyp;
  firmenname: string | null;
  vorname: string | null;
  nachname: string | null;
  strasse: string;
  hausnummer: string;
  plz: string;
  stadt: string;
  stundensatzCents: number;
}

export interface AuftraggeberFormInput {
  typ: AuftraggeberTyp;
  firmenname: string | null;
  vorname: string | null;
  nachname: string | null;
  strasse: string;
  hausnummer: string;
  plz: string;
  stadt: string;
  stundensatzCents: number;
}

const AUFTRAGGEBER_QUERY = /* GraphQL */ `
  query Auftraggeber {
    auftraggeber {
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
    }
  }
`;

const CREATE_AUFTRAGGEBER = /* GraphQL */ `
  mutation CreateAuftraggeber($input: AuftraggeberInput!) {
    createAuftraggeber(input: $input) {
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
    }
  }
`;

const UPDATE_AUFTRAGGEBER = /* GraphQL */ `
  mutation UpdateAuftraggeber($id: ID!, $input: AuftraggeberInput!) {
    updateAuftraggeber(id: $id, input: $input) {
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
    }
  }
`;

const DELETE_AUFTRAGGEBER = /* GraphQL */ `
  mutation DeleteAuftraggeber($id: ID!) {
    deleteAuftraggeber(id: $id)
  }
`;

function formatCentsAsEuroInput(cents: number): string {
  const euros = Math.floor(cents / 100);
  const rest = cents % 100;
  return `${euros},${rest.toString().padStart(2, '0')}`;
}

export class AuftraggeberDraft {
  editingId: string | null = null;
  typ: AuftraggeberTyp = 'firma';
  firmenname = '';
  vorname = '';
  nachname = '';
  strasse = '';
  hausnummer = '';
  plz = '';
  stadt = '';
  stundensatz = '';
  errors: AuftraggeberFieldErrors = {};

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  validate(): AuftraggeberFormInput | null {
    const stundensatzCents = parseEuroToCents(this.stundensatz);
    const draftInput: Record<string, unknown> = {
      typ: this.typ,
      strasse: this.strasse,
      hausnummer: this.hausnummer,
      plz: this.plz,
      stadt: this.stadt,
      stundensatzCents: stundensatzCents ?? 0,
    };
    if (this.typ === 'firma') {
      draftInput.firmenname = this.firmenname;
      draftInput.vorname = null;
      draftInput.nachname = null;
    } else {
      draftInput.firmenname = null;
      draftInput.vorname = this.vorname;
      draftInput.nachname = this.nachname;
    }

    const result = auftraggeberSchema.safeParse(draftInput);
    const next: AuftraggeberFieldErrors = {};
    if (stundensatzCents === null || stundensatzCents <= 0) {
      next.stundensatzCents = 'Stundensatz muss > 0 sein';
    }
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (typeof key !== 'string') continue;
        const field = key as keyof AuftraggeberFieldErrors;
        if (!next[field]) next[field] = issue.message;
      }
    }
    if (Object.keys(next).length > 0) {
      this.errors = next;
      return null;
    }
    this.errors = {};
    return {
      typ: this.typ,
      firmenname: this.typ === 'firma' ? this.firmenname : null,
      vorname: this.typ === 'person' ? this.vorname : null,
      nachname: this.typ === 'person' ? this.nachname : null,
      strasse: this.strasse,
      hausnummer: this.hausnummer,
      plz: this.plz,
      stadt: this.stadt,
      stundensatzCents: stundensatzCents!,
    };
  }

  setTyp(v: AuftraggeberTyp): void {
    this.typ = v;
  }
  setFirmenname(v: string): void {
    this.firmenname = v;
  }
  setVorname(v: string): void {
    this.vorname = v;
  }
  setNachname(v: string): void {
    this.nachname = v;
  }
  setStrasse(v: string): void {
    this.strasse = v;
  }
  setHausnummer(v: string): void {
    this.hausnummer = v;
  }
  setPlz(v: string): void {
    this.plz = v;
  }
  setStadt(v: string): void {
    this.stadt = v;
  }
  setStundensatz(v: string): void {
    this.stundensatz = v;
  }

  loadFrom(ag: Auftraggeber): void {
    this.editingId = ag.id;
    this.typ = ag.typ;
    this.firmenname = ag.firmenname ?? '';
    this.vorname = ag.vorname ?? '';
    this.nachname = ag.nachname ?? '';
    this.strasse = ag.strasse;
    this.hausnummer = ag.hausnummer;
    this.plz = ag.plz;
    this.stadt = ag.stadt;
    this.stundensatz = formatCentsAsEuroInput(ag.stundensatzCents);
    this.errors = {};
  }

  reset(): void {
    this.editingId = null;
    this.typ = 'firma';
    this.firmenname = '';
    this.vorname = '';
    this.nachname = '';
    this.strasse = '';
    this.hausnummer = '';
    this.plz = '';
    this.stadt = '';
    this.stundensatz = '';
    this.errors = {};
  }
}

export class AuftraggeberStore {
  items: Auftraggeber[] = [];
  loading = false;
  error: string | null = null;
  pendingDeleteId: string | null = null;
  draftAuftraggeber = new AuftraggeberDraft();

  constructor(private readonly fetcher: GraphQLFetcher) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  requestDelete(id: string): void {
    this.pendingDeleteId = id;
  }

  cancelDelete(): void {
    this.pendingDeleteId = null;
  }

  async confirmDelete(): Promise<boolean> {
    const id = this.pendingDeleteId;
    if (!id) return false;
    this.pendingDeleteId = null;
    return this.remove(id);
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      const data = await this.fetcher<{ auftraggeber: Auftraggeber[] }>(AUFTRAGGEBER_QUERY);
      runInAction(() => {
        this.items = data.auftraggeber;
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

  async create(input: AuftraggeberFormInput): Promise<Auftraggeber | null> {
    this.error = null;
    try {
      const data = await this.fetcher<{ createAuftraggeber: Auftraggeber }>(CREATE_AUFTRAGGEBER, {
        input,
      });
      runInAction(() => {
        this.items = [...this.items, data.createAuftraggeber];
      });
      return data.createAuftraggeber;
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : String(err);
      });
      return null;
    }
  }

  async update(id: string, input: AuftraggeberFormInput): Promise<Auftraggeber | null> {
    this.error = null;
    try {
      const data = await this.fetcher<{ updateAuftraggeber: Auftraggeber }>(UPDATE_AUFTRAGGEBER, {
        id,
        input,
      });
      runInAction(() => {
        this.items = this.items.map((a) => (a.id === id ? data.updateAuftraggeber : a));
      });
      return data.updateAuftraggeber;
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : String(err);
      });
      return null;
    }
  }

  startEdit(ag: Auftraggeber): void {
    this.draftAuftraggeber.loadFrom(ag);
  }

  startCreate(): void {
    this.draftAuftraggeber.reset();
  }

  async saveDraft(): Promise<Auftraggeber | null> {
    const input = this.draftAuftraggeber.validate();
    if (!input) return null;
    if (this.draftAuftraggeber.editingId) {
      return this.update(this.draftAuftraggeber.editingId, input);
    }
    return this.create(input);
  }

  async remove(id: string): Promise<boolean> {
    this.error = null;
    try {
      await this.fetcher<{ deleteAuftraggeber: boolean }>(DELETE_AUFTRAGGEBER, { id });
      runInAction(() => {
        this.items = this.items.filter((a) => a.id !== id);
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
