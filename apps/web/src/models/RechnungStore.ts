import { makeAutoObservable, runInAction } from 'mobx';
import type { GraphQLFetcher } from '../api/graphqlClient';

export type RechnungErrorCode =
  | 'DUPLICATE_RECHNUNG'
  | 'KEINE_BEHANDLUNGEN'
  | 'TEMPLATE_NOT_FOUND'
  | 'TEMPLATE_FILE_MISSING'
  | 'UNKNOWN';

export interface Rechnung {
  id: string;
  nummer: string;
  jahr: number;
  monat: number;
  kindId: string;
  auftraggeberId: string;
  stundensatzCentsSnapshot: number;
  gesamtCents: number;
  dateiname: string;
  downloadedAt: string | null;
}

export interface CreateMonatsrechnungInput {
  year: number;
  month: number;
  kindId: string;
  auftraggeberId: string;
  force?: boolean;
}

const RECHNUNG_COLUMNS = /* GraphQL */ `
  id
  nummer
  jahr
  monat
  kindId
  auftraggeberId
  stundensatzCentsSnapshot
  gesamtCents
  dateiname
  downloadedAt
`;

const MARK_DOWNLOADED = /* GraphQL */ `
  mutation MarkDownloaded($ids: [ID!]!) {
    markRechnungenDownloaded(ids: $ids) {
      id
      downloadedAt
    }
  }
`;

const CREATE_MONATSRECHNUNG = /* GraphQL */ `
  mutation CreateMonatsrechnung($input: CreateMonatsrechnungInput!) {
    createMonatsrechnung(input: $input) {
      ${RECHNUNG_COLUMNS}
    }
  }
`;

const RECHNUNGEN_QUERY = /* GraphQL */ `
  query Rechnungen($year: Int, $month: Int, $kindId: ID, $auftraggeberId: ID) {
    rechnungen(year: $year, month: $month, kindId: $kindId, auftraggeberId: $auftraggeberId) {
      ${RECHNUNG_COLUMNS}
    }
  }
`;

function todayMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export class RechnungDraft {
  year: number;
  month: number;
  kindId = '';
  auftraggeberId = '';

  constructor() {
    const { year, month } = todayMonth();
    this.year = year;
    this.month = month;
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setYear(y: number): void {
    this.year = y;
  }
  setMonth(m: number): void {
    this.month = m;
  }
  setKindId(id: string): void {
    this.kindId = id;
  }
  setAuftraggeberId(id: string): void {
    this.auftraggeberId = id;
  }

  reset(): void {
    const { year, month } = todayMonth();
    this.year = year;
    this.month = month;
    this.kindId = '';
    this.auftraggeberId = '';
  }

  valid(): boolean {
    return (
      Number.isInteger(this.year) &&
      this.year >= 1000 &&
      this.year <= 9999 &&
      Number.isInteger(this.month) &&
      this.month >= 1 &&
      this.month <= 12 &&
      this.kindId.length > 0 &&
      this.auftraggeberId.length > 0
    );
  }
}

export class RechnungFilter {
  year: number | null = null;
  month: number | null = null;
  kindId = '';
  auftraggeberId = '';

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setMonat(year: number, month: number): void {
    this.year = year;
    this.month = month;
  }
  clearMonat(): void {
    this.year = null;
    this.month = null;
  }
  setKindId(v: string): void {
    this.kindId = v;
  }
  setAuftraggeberId(v: string): void {
    this.auftraggeberId = v;
  }
  reset(): void {
    this.year = null;
    this.month = null;
    this.kindId = '';
    this.auftraggeberId = '';
  }

  toInput(): Partial<CreateMonatsrechnungInput> {
    const input: Partial<CreateMonatsrechnungInput> = {};
    if (this.year !== null) input.year = this.year;
    if (this.month !== null) input.month = this.month;
    if (this.kindId !== '') input.kindId = this.kindId;
    if (this.auftraggeberId !== '') input.auftraggeberId = this.auftraggeberId;
    return input;
  }
}

function parseErrorCode(err: unknown): { code: RechnungErrorCode; message: string } {
  if (!(err instanceof Error)) {
    return { code: 'UNKNOWN', message: String(err) };
  }
  const msg = err.message;
  if (msg.includes('Für diesen Monat wurde bereits eine Rechnung erzeugt')) {
    return {
      code: 'DUPLICATE_RECHNUNG',
      message: 'Für diesen Monat wurde bereits eine Rechnung erzeugt.',
    };
  }
  if (msg.includes('Für den gewählten Monat liegen keine Behandlungen vor')) {
    return {
      code: 'KEINE_BEHANDLUNGEN',
      message: 'Für den gewählten Monat liegen keine Behandlungen vor.',
    };
  }
  if (msg.includes('Keine Rechnungsvorlage hinterlegt')) {
    return { code: 'TEMPLATE_NOT_FOUND', message: 'Keine Rechnungsvorlage hinterlegt.' };
  }
  if (msg.includes('Vorlagen-Datei fehlt')) {
    return {
      code: 'TEMPLATE_FILE_MISSING',
      message: 'Vorlagen-Datei fehlt auf der Festplatte.',
    };
  }
  return { code: 'UNKNOWN', message: msg };
}

export class RechnungStore {
  items: Rechnung[] = [];
  lastCreated: Rechnung | null = null;
  error: { code: RechnungErrorCode; message: string } | null = null;
  draftRechnung = new RechnungDraft();
  filter = new RechnungFilter();

  constructor(private readonly fetcher: GraphQLFetcher) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  async load(filter: Partial<CreateMonatsrechnungInput> = {}): Promise<void> {
    this.error = null;
    try {
      const data = await this.fetcher<{ rechnungen: Rechnung[] }>(RECHNUNGEN_QUERY, {
        year: filter.year ?? null,
        month: filter.month ?? null,
        kindId: filter.kindId ?? null,
        auftraggeberId: filter.auftraggeberId ?? null,
      });
      runInAction(() => {
        this.items = data.rechnungen;
      });
    } catch (err) {
      runInAction(() => {
        this.error = parseErrorCode(err);
      });
    }
  }

  async create(input: CreateMonatsrechnungInput): Promise<Rechnung | null> {
    this.error = null;
    this.lastCreated = null;
    try {
      const data = await this.fetcher<{ createMonatsrechnung: Rechnung }>(CREATE_MONATSRECHNUNG, {
        input,
      });
      runInAction(() => {
        this.lastCreated = data.createMonatsrechnung;
        this.items = [data.createMonatsrechnung, ...this.items];
      });
      return data.createMonatsrechnung;
    } catch (err) {
      runInAction(() => {
        this.error = parseErrorCode(err);
      });
      return null;
    }
  }

  dismissError(): void {
    this.error = null;
  }

  async saveDraft(options: { force?: boolean } = {}): Promise<Rechnung | null> {
    if (!this.draftRechnung.valid()) return null;
    return this.create({
      year: this.draftRechnung.year,
      month: this.draftRechnung.month,
      kindId: this.draftRechnung.kindId,
      auftraggeberId: this.draftRechnung.auftraggeberId,
      force: options.force ?? false,
    });
  }

  // PRD §3.8: markiert die Rechnungen als "zum Versand heruntergeladen".
  async markDownloaded(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    try {
      const data = await this.fetcher<{
        markRechnungenDownloaded: Array<{ id: string; downloadedAt: string | null }>;
      }>(MARK_DOWNLOADED, { ids });
      runInAction(() => {
        const byId = new Map(data.markRechnungenDownloaded.map((r) => [r.id, r.downloadedAt]));
        this.items = this.items.map((r) =>
          byId.has(r.id) ? { ...r, downloadedAt: byId.get(r.id) ?? null } : r,
        );
      });
    } catch (err) {
      runInAction(() => {
        this.error = parseErrorCode(err);
      });
    }
  }
}
