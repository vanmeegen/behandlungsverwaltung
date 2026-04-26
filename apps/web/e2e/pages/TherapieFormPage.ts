import type { Locator, Page } from '@playwright/test';

export type TherapieFormValue =
  | 'dyskalkulie'
  | 'lerntherapie'
  | 'heilpaedagogik'
  | 'elternberatung'
  | 'sonstiges';

export interface TherapieFormFields {
  kindId: string;
  auftraggeberId: string;
  form: TherapieFormValue;
  startdatum?: string;
  bewilligteBe: number;
  kommentar?: string;
  taetigkeit?: string;
  gruppentherapie?: boolean;
}

export class TherapieFormPage {
  readonly page: Page;
  readonly kindSelect: Locator;
  readonly auftraggeberSelect: Locator;
  readonly formSelect: Locator;
  readonly startdatum: Locator;
  readonly kommentar: Locator;
  readonly bewilligteBe: Locator;
  readonly taetigkeit: Locator;
  readonly gruppentherapie: Locator;
  readonly submit: Locator;

  constructor(page: Page) {
    this.page = page;
    this.kindSelect = page.getByTestId('therapie-form-kindId');
    this.auftraggeberSelect = page.getByTestId('therapie-form-auftraggeberId');
    this.formSelect = page.getByTestId('therapie-form-form');
    this.startdatum = page.getByTestId('therapie-form-startdatum');
    this.kommentar = page.getByTestId('therapie-form-kommentar');
    this.bewilligteBe = page.getByTestId('therapie-form-bewilligteBe');
    this.taetigkeit = page.getByTestId('therapie-form-taetigkeit');
    this.gruppentherapie = page.getByTestId('therapie-form-gruppentherapie');
    this.submit = page.getByTestId('therapie-form-submit');
  }

  async gotoNew(): Promise<void> {
    await this.page.goto('/therapien/new');
  }

  errorFor(field: string): Locator {
    return this.page.getByTestId(`therapie-form-${field}-error`);
  }

  async fillCore(fields: TherapieFormFields): Promise<void> {
    await this.kindSelect.selectOption(fields.kindId);
    await this.auftraggeberSelect.selectOption(fields.auftraggeberId);
    await this.formSelect.selectOption(fields.form);
    await this.startdatum.fill(fields.startdatum ?? '2026-01-01');
    await this.bewilligteBe.fill(String(fields.bewilligteBe));
    if (fields.taetigkeit !== undefined) {
      await this.taetigkeit.fill(fields.taetigkeit);
    }
    if (fields.form === 'sonstiges' && fields.kommentar !== undefined) {
      await this.kommentar.fill(fields.kommentar);
    }
    if (fields.gruppentherapie === true) {
      await this.gruppentherapie.check();
    }
  }

  async submitAndWait(): Promise<void> {
    await this.submit.click();
  }
}
