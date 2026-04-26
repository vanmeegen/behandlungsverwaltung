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

export class ErziehungsberechtigterStore {
  byKind: Record<string, Erziehungsberechtigter[]> = {};
  error: string | null = null;

  constructor(private readonly fetcher: GraphQLFetcher) {
    makeAutoObservable(this, {}, { autoBind: true });
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
