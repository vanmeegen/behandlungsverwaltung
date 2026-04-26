import type { Locator, Page } from '@playwright/test';

export type AuftraggeberTyp = 'firma' | 'person';

export interface AuftraggeberFormFields {
  typ: AuftraggeberTyp;
  firmenname?: string;
  vorname?: string;
  nachname?: string;
  strasse: string;
  hausnummer: string;
  plz: string;
  stadt: string;
  stundensatz: string;
  abteilung?: string;
  rechnungskopfText?: string;
}

const TEXT_FIELD_IDS = {
  firmenname: 'auftraggeber-form-firmenname',
  vorname: 'auftraggeber-form-vorname',
  nachname: 'auftraggeber-form-nachname',
  strasse: 'auftraggeber-form-strasse',
  hausnummer: 'auftraggeber-form-hausnummer',
  plz: 'auftraggeber-form-plz',
  stadt: 'auftraggeber-form-stadt',
  stundensatz: 'auftraggeber-form-stundensatz',
  abteilung: 'auftraggeber-form-abteilung',
  rechnungskopfText: 'auftraggeber-form-rechnungskopf',
} as const;

export type TextField = keyof typeof TEXT_FIELD_IDS;

const ERROR_FIELDS: Record<TextField, string> = {
  firmenname: 'firmenname',
  vorname: 'vorname',
  nachname: 'nachname',
  strasse: 'strasse',
  hausnummer: 'hausnummer',
  plz: 'plz',
  stadt: 'stadt',
  stundensatz: 'stundensatzCents',
  abteilung: 'abteilung',
  rechnungskopfText: 'rechnungskopfText',
};

export class AuftraggeberFormPage {
  readonly page: Page;
  readonly submit: Locator;
  readonly typFirma: Locator;
  readonly typPerson: Locator;

  constructor(page: Page) {
    this.page = page;
    this.submit = page.getByTestId('auftraggeber-form-submit');
    this.typFirma = page.getByTestId('auftraggeber-form-typ-firma');
    this.typPerson = page.getByTestId('auftraggeber-form-typ-person');
  }

  async gotoNew(): Promise<void> {
    await this.page.goto('/auftraggeber/new');
  }

  async gotoEdit(id: string): Promise<void> {
    await this.page.goto(`/auftraggeber/${id}`);
  }

  input(field: TextField): Locator {
    return this.page.getByTestId(TEXT_FIELD_IDS[field]);
  }

  errorFor(field: TextField): Locator {
    return this.page.getByTestId(`auftraggeber-form-${ERROR_FIELDS[field]}-error`);
  }

  async chooseTyp(typ: AuftraggeberTyp): Promise<void> {
    if (typ === 'firma') {
      await this.typFirma.check();
    } else {
      await this.typPerson.check();
    }
  }

  async fillAll(fields: AuftraggeberFormFields): Promise<void> {
    await this.chooseTyp(fields.typ);
    for (const key of Object.keys(TEXT_FIELD_IDS) as TextField[]) {
      const value = fields[key as keyof AuftraggeberFormFields];
      if (typeof value !== 'string') continue;
      await this.input(key).fill(value);
    }
  }

  async submitAndWait(): Promise<void> {
    await this.submit.click();
  }
}
