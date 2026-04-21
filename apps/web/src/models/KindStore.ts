import { kindSchema } from '@behandlungsverwaltung/shared';
import { makeAutoObservable, runInAction } from 'mobx';
import type { GraphQLFetcher } from '../api/graphqlClient';

export type KindFieldErrors = Partial<Record<keyof KindFormInput, string>>;

export interface Kind {
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

export interface KindFormInput {
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  strasse: string;
  hausnummer: string;
  plz: string;
  stadt: string;
  aktenzeichen: string;
}

const KIND_FIELDS: Kind = {
  id: '',
  vorname: '',
  nachname: '',
  geburtsdatum: '',
  strasse: '',
  hausnummer: '',
  plz: '',
  stadt: '',
  aktenzeichen: '',
};

const KINDER_QUERY = /* GraphQL */ `
  query Kinder {
    kinder {
      id
      vorname
      nachname
      geburtsdatum
      strasse
      hausnummer
      plz
      stadt
      aktenzeichen
    }
  }
`;

const CREATE_KIND = /* GraphQL */ `
  mutation CreateKind($input: KindInput!) {
    createKind(input: $input) {
      id
      vorname
      nachname
      geburtsdatum
      strasse
      hausnummer
      plz
      stadt
      aktenzeichen
    }
  }
`;

const UPDATE_KIND = /* GraphQL */ `
  mutation UpdateKind($id: ID!, $input: KindInput!) {
    updateKind(id: $id, input: $input) {
      id
      vorname
      nachname
      geburtsdatum
      strasse
      hausnummer
      plz
      stadt
      aktenzeichen
    }
  }
`;

const DELETE_KIND = /* GraphQL */ `
  mutation DeleteKind($id: ID!) {
    deleteKind(id: $id)
  }
`;

export class KindDraft {
  editingId: string | null = null;
  vorname = '';
  nachname = '';
  geburtsdatum = '';
  strasse = '';
  hausnummer = '';
  plz = '';
  stadt = '';
  aktenzeichen = '';
  errors: KindFieldErrors = {};

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  validate(): boolean {
    const result = kindSchema.safeParse(this.toInput());
    if (result.success) {
      this.errors = {};
      return true;
    }
    const next: KindFieldErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (typeof key !== 'string') continue;
      const field = key as keyof KindFormInput;
      if (!next[field]) next[field] = issue.message;
    }
    this.errors = next;
    return false;
  }

  setVorname(v: string): void {
    this.vorname = v;
  }
  setNachname(v: string): void {
    this.nachname = v;
  }
  setGeburtsdatum(v: string): void {
    this.geburtsdatum = v;
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
  setAktenzeichen(v: string): void {
    this.aktenzeichen = v;
  }

  loadFrom(kind: Kind): void {
    this.editingId = kind.id;
    this.vorname = kind.vorname;
    this.nachname = kind.nachname;
    this.geburtsdatum = kind.geburtsdatum.slice(0, 10);
    this.strasse = kind.strasse;
    this.hausnummer = kind.hausnummer;
    this.plz = kind.plz;
    this.stadt = kind.stadt;
    this.aktenzeichen = kind.aktenzeichen;
  }

  reset(): void {
    this.editingId = null;
    for (const key of Object.keys(KIND_FIELDS) as Array<keyof Kind>) {
      if (key === 'id') continue;
      this[key] = '';
    }
    this.errors = {};
  }

  toInput(): KindFormInput {
    return {
      vorname: this.vorname,
      nachname: this.nachname,
      geburtsdatum: this.geburtsdatum,
      strasse: this.strasse,
      hausnummer: this.hausnummer,
      plz: this.plz,
      stadt: this.stadt,
      aktenzeichen: this.aktenzeichen,
    };
  }
}

export class KindStore {
  items: Kind[] = [];
  loading = false;
  error: string | null = null;
  draftKind = new KindDraft();

  constructor(private readonly fetcher: GraphQLFetcher) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      const data = await this.fetcher<{ kinder: Kind[] }>(KINDER_QUERY);
      runInAction(() => {
        this.items = data.kinder;
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

  async create(input: KindFormInput): Promise<Kind | null> {
    this.error = null;
    try {
      const data = await this.fetcher<{ createKind: Kind }>(CREATE_KIND, { input });
      runInAction(() => {
        this.items = [...this.items, data.createKind];
      });
      return data.createKind;
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : String(err);
      });
      return null;
    }
  }

  async update(id: string, input: KindFormInput): Promise<Kind | null> {
    this.error = null;
    try {
      const data = await this.fetcher<{ updateKind: Kind }>(UPDATE_KIND, { id, input });
      runInAction(() => {
        this.items = this.items.map((k) => (k.id === id ? data.updateKind : k));
      });
      return data.updateKind;
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : String(err);
      });
      return null;
    }
  }

  startEdit(kind: Kind): void {
    this.draftKind.loadFrom(kind);
  }

  startCreate(): void {
    this.draftKind.reset();
  }

  async saveDraft(): Promise<Kind | null> {
    if (!this.draftKind.validate()) return null;
    const input = this.draftKind.toInput();
    if (this.draftKind.editingId) {
      return this.update(this.draftKind.editingId, input);
    }
    return this.create(input);
  }

  async remove(id: string): Promise<boolean> {
    this.error = null;
    try {
      await this.fetcher<{ deleteKind: boolean }>(DELETE_KIND, { id });
      runInAction(() => {
        this.items = this.items.filter((k) => k.id !== id);
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
