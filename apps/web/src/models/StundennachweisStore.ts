import { makeAutoObservable, runInAction } from 'mobx';
import type { GraphQLFetcher } from '../api/graphqlClient';

export type StundennachweisErrorCode =
  | 'RECHNUNG_FEHLT'
  | 'TEMPLATE_NOT_FOUND'
  | 'TEMPLATE_FILE_MISSING'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN';

export interface Stundennachweis {
  nummer: string;
  dateiname: string;
}

export interface CreateStundennachweisInput {
  year: number;
  month: number;
  kindId: string;
  auftraggeberId: string;
}

const CREATE_STUNDENNACHWEIS = /* GraphQL */ `
  mutation CreateStundennachweis($input: CreateStundennachweisInput!) {
    createStundennachweis(input: $input) {
      nummer
      dateiname
    }
  }
`;

function todayMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export class StundennachweisDraft {
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

function parseError(err: unknown): { code: StundennachweisErrorCode; message: string } {
  if (!(err instanceof Error)) return { code: 'UNKNOWN', message: String(err) };
  const msg = err.message;
  if (msg.includes('Für diesen Monat wurde noch keine Rechnung erzeugt')) {
    return {
      code: 'RECHNUNG_FEHLT',
      message:
        'Für diesen Monat wurde noch keine Rechnung erzeugt. Bitte zuerst die Rechnung anlegen.',
    };
  }
  if (msg.includes('Keine Stundennachweis-Vorlage hinterlegt')) {
    return { code: 'TEMPLATE_NOT_FOUND', message: 'Keine Stundennachweis-Vorlage hinterlegt.' };
  }
  if (msg.includes('Vorlagen-Datei fehlt')) {
    return { code: 'TEMPLATE_FILE_MISSING', message: 'Vorlagen-Datei fehlt auf der Festplatte.' };
  }
  return { code: 'UNKNOWN', message: msg };
}

export class StundennachweisStore {
  lastCreated: Stundennachweis | null = null;
  error: { code: StundennachweisErrorCode; message: string } | null = null;
  draftStundennachweis = new StundennachweisDraft();

  constructor(private readonly fetcher: GraphQLFetcher) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  async saveDraft(): Promise<Stundennachweis | null> {
    if (!this.draftStundennachweis.valid()) return null;
    this.error = null;
    this.lastCreated = null;
    try {
      const data = await this.fetcher<{ createStundennachweis: Stundennachweis }>(
        CREATE_STUNDENNACHWEIS,
        {
          input: {
            year: this.draftStundennachweis.year,
            month: this.draftStundennachweis.month,
            kindId: this.draftStundennachweis.kindId,
            auftraggeberId: this.draftStundennachweis.auftraggeberId,
          },
        },
      );
      runInAction(() => {
        this.lastCreated = data.createStundennachweis;
      });
      return data.createStundennachweis;
    } catch (err) {
      runInAction(() => {
        this.error = parseError(err);
      });
      return null;
    }
  }

  dismissError(): void {
    this.error = null;
  }
}
