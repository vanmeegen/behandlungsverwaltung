import { makeAutoObservable, runInAction } from 'mobx';
import type { GraphQLFetcher } from '../api/graphqlClient';

export interface Erziehungsberechtigter {
  id: string;
  kindId: string;
  slot: number;
  vorname: string;
  nachname: string;
  strasse?: string | null;
  hausnummer?: string | null;
  plz?: string | null;
  stadt?: string | null;
  email1?: string | null;
  email2?: string | null;
  telefon1?: string | null;
  telefon2?: string | null;
}

export interface ErziehungsberechtigterFormInput {
  kindId: string;
  slot: number;
  vorname: string;
  nachname: string;
  strasse?: string | null;
  hausnummer?: string | null;
  plz?: string | null;
  stadt?: string | null;
  email1?: string | null;
  email2?: string | null;
  telefon1?: string | null;
  telefon2?: string | null;
}

const EZB_COLUMNS = /* GraphQL */ `
  id
  kindId
  slot
  vorname
  nachname
  strasse
  hausnummer
  plz
  stadt
  email1
  email2
  telefon1
  telefon2
`;

const CREATE_EZB = /* GraphQL */ `
  mutation CreateEzb($input: ErziehungsberechtigterInput!) {
    createErziehungsberechtigter(input: $input) {
      ${EZB_COLUMNS}
    }
  }
`;

const UPDATE_EZB = /* GraphQL */ `
  mutation UpdateEzb($id: ID!, $input: ErziehungsberechtigterInput!) {
    updateErziehungsberechtigter(id: $id, input: $input) {
      ${EZB_COLUMNS}
    }
  }
`;

const DELETE_EZB = /* GraphQL */ `
  mutation DeleteEzb($id: ID!) {
    deleteErziehungsberechtigter(id: $id)
  }
`;

export class ErziehungsberechtigterDraft {
  kindId = '';
  slot: 1 | 2 = 1;
  vorname = '';
  nachname = '';
  strasse = '';
  hausnummer = '';
  plz = '';
  stadt = '';
  email1 = '';
  telefon1 = '';

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
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
  setEmail1(v: string): void {
    this.email1 = v;
  }
  setTelefon1(v: string): void {
    this.telefon1 = v;
  }

  initFor(kindId: string, slot: 1 | 2, existing: Erziehungsberechtigter | null): void {
    this.kindId = kindId;
    this.slot = slot;
    this.vorname = existing?.vorname ?? '';
    this.nachname = existing?.nachname ?? '';
    this.strasse = existing?.strasse ?? '';
    this.hausnummer = existing?.hausnummer ?? '';
    this.plz = existing?.plz ?? '';
    this.stadt = existing?.stadt ?? '';
    this.email1 = existing?.email1 ?? '';
    this.telefon1 = existing?.telefon1 ?? '';
  }

  reset(): void {
    this.kindId = '';
    this.slot = 1;
    this.vorname = '';
    this.nachname = '';
    this.strasse = '';
    this.hausnummer = '';
    this.plz = '';
    this.stadt = '';
    this.email1 = '';
    this.telefon1 = '';
  }

  toInput(): ErziehungsberechtigterFormInput {
    return {
      kindId: this.kindId,
      slot: this.slot,
      vorname: this.vorname,
      nachname: this.nachname,
      strasse: this.strasse || null,
      hausnummer: this.hausnummer || null,
      plz: this.plz || null,
      stadt: this.stadt || null,
      email1: this.email1 || null,
      telefon1: this.telefon1 || null,
    };
  }
}

export class ErziehungsberechtigterStore {
  byKind: Record<string, Erziehungsberechtigter[]> = {};
  error: string | null = null;
  draftEzb = new ErziehungsberechtigterDraft();

  constructor(private readonly fetcher: GraphQLFetcher) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  initDraftFor(kindId: string, slot: 1 | 2): void {
    this.draftEzb.initFor(kindId, slot, this.getSlot(kindId, slot));
    this.error = null;
  }

  resetDraft(): void {
    this.draftEzb.reset();
  }

  async saveDraft(): Promise<Erziehungsberechtigter | null> {
    return this.save(this.draftEzb.toInput());
  }

  getSlot(kindId: string, slot: number): Erziehungsberechtigter | null {
    return this.byKind[kindId]?.find((e) => e.slot === slot) ?? null;
  }

  setFromKindData(kindId: string, ezbs: Erziehungsberechtigter[]): void {
    runInAction(() => {
      this.byKind = { ...this.byKind, [kindId]: ezbs };
    });
  }

  async save(input: ErziehungsberechtigterFormInput): Promise<Erziehungsberechtigter | null> {
    const existing = this.getSlot(input.kindId, input.slot);
    this.error = null;
    try {
      if (existing) {
        const data = await this.fetcher<{ updateErziehungsberechtigter: Erziehungsberechtigter }>(
          UPDATE_EZB,
          { id: existing.id, input },
        );
        const updated = data.updateErziehungsberechtigter;
        runInAction(() => {
          const list = this.byKind[input.kindId] ?? [];
          this.byKind = {
            ...this.byKind,
            [input.kindId]: list.map((e) => (e.slot === input.slot ? updated : e)),
          };
        });
        return updated;
      } else {
        const data = await this.fetcher<{ createErziehungsberechtigter: Erziehungsberechtigter }>(
          CREATE_EZB,
          { input },
        );
        const created = data.createErziehungsberechtigter;
        runInAction(() => {
          const list = this.byKind[input.kindId] ?? [];
          this.byKind = { ...this.byKind, [input.kindId]: [...list, created] };
        });
        return created;
      }
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : String(err);
      });
      return null;
    }
  }

  async remove(id: string, kindId: string, slot: number): Promise<boolean> {
    this.error = null;
    try {
      await this.fetcher<{ deleteErziehungsberechtigter: boolean }>(DELETE_EZB, { id });
      runInAction(() => {
        const list = this.byKind[kindId] ?? [];
        this.byKind = { ...this.byKind, [kindId]: list.filter((e) => e.slot !== slot) };
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
