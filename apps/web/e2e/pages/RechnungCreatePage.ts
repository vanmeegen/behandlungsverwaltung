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
  readonly nummerPrefix: Locator;
  readonly nummerLfd: Locator;
  readonly duplicateNummerAlert: Locator;

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
    this.nummerPrefix = page.getByTestId('rechnung-create-prefix');
    this.nummerLfd = page.getByTestId('rechnung-create-lfd');
    this.duplicateNummerAlert = page.getByTestId('rechnung-create-duplicate-nummer');
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

  /**
   * PRD §3.2 / AC-RECH-15: Nur die NNNN ist editierbar. Setzt sie als
   * Vier-Ziffern-String (z.B. "0007"); der `RE-YYYY-MM-`-Präfix bleibt
   * unverändert.
   */
  async setLfdNummer(value: string): Promise<void> {
    await this.nummerLfd.fill(value);
  }

  async submitAndWait(): Promise<void> {
    await this.submit.click();
  }
}
