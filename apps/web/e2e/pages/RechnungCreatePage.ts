import type { Locator, Page } from '@playwright/test';

export class RechnungCreatePage {
  readonly page: Page;
  readonly monatInput: Locator;
  readonly rechnungsdatumInput: Locator;
  readonly kindSelect: Locator;
  readonly auftraggeberSelect: Locator;
  readonly submit: Locator;
  readonly successToast: Locator;
  readonly duplicateDialog: Locator;
  readonly duplicateDismiss: Locator;

  constructor(page: Page) {
    this.page = page;
    this.monatInput = page.getByTestId('rechnung-create-monat');
    this.rechnungsdatumInput = page.getByTestId('rechnung-create-rechnungsdatum');
    this.kindSelect = page.getByTestId('rechnung-create-kindId');
    this.auftraggeberSelect = page.getByTestId('rechnung-create-auftraggeberId');
    this.submit = page.getByTestId('rechnung-create-submit');
    this.successToast = page.getByTestId('rechnung-create-success');
    this.duplicateDialog = page.getByTestId('duplicate-confirm');
    this.duplicateDismiss = page.getByTestId('duplicate-confirm-cancel');
  }

  async goto(): Promise<void> {
    await this.page.goto('/rechnungen/neu');
  }

  async setMonat(year: number, month: number): Promise<void> {
    const v = `${year}-${String(month).padStart(2, '0')}`;
    await this.monatInput.fill(v);
  }

  async setRechnungsdatum(iso: string): Promise<void> {
    await this.rechnungsdatumInput.fill(iso);
  }

  async chooseKind(id: string): Promise<void> {
    await this.kindSelect.selectOption(id);
  }

  async chooseAuftraggeber(id: string): Promise<void> {
    await this.auftraggeberSelect.selectOption(id);
  }

  async submitAndWait(): Promise<void> {
    await this.submit.click();
  }
}
