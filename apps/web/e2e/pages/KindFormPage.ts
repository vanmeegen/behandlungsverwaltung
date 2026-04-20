import type { Locator, Page } from '@playwright/test';

export interface KindFormFields {
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  strasse: string;
  hausnummer: string;
  plz: string;
  stadt: string;
  aktenzeichen: string;
}

const FIELD_IDS: Record<keyof KindFormFields, string> = {
  vorname: 'kind-form-vorname',
  nachname: 'kind-form-nachname',
  geburtsdatum: 'kind-form-geburtsdatum',
  strasse: 'kind-form-strasse',
  hausnummer: 'kind-form-hausnummer',
  plz: 'kind-form-plz',
  stadt: 'kind-form-stadt',
  aktenzeichen: 'kind-form-aktenzeichen',
};

export class KindFormPage {
  readonly page: Page;
  readonly submit: Locator;

  constructor(page: Page) {
    this.page = page;
    this.submit = page.getByTestId('kind-form-submit');
  }

  async gotoNew(): Promise<void> {
    await this.page.goto('/kinder/new');
  }

  async gotoEdit(id: string): Promise<void> {
    await this.page.goto(`/kinder/${id}`);
  }

  input(field: keyof KindFormFields): Locator {
    return this.page.getByTestId(FIELD_IDS[field]);
  }

  errorFor(field: keyof KindFormFields): Locator {
    return this.page.getByTestId(`${FIELD_IDS[field]}-error`);
  }

  async fill(fields: Partial<KindFormFields>): Promise<void> {
    for (const key of Object.keys(fields) as Array<keyof KindFormFields>) {
      const value = fields[key];
      if (value === undefined) continue;
      await this.input(key).fill(value);
    }
  }

  async fillAll(fields: KindFormFields): Promise<void> {
    await this.fill(fields);
  }

  async submitAndWait(): Promise<void> {
    await this.submit.click();
  }
}
