import type { Locator, Page } from '@playwright/test';

export class StundennachweisPage {
  readonly page: Page;
  readonly monatInput: Locator;
  readonly jahrInput: Locator;
  readonly kindSelect: Locator;
  readonly auftraggeberSelect: Locator;
  readonly submit: Locator;
  readonly successToast: Locator;
  readonly errorBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.monatInput = page.getByTestId('stundennachweis-monat');
    this.jahrInput = page.getByTestId('stundennachweis-jahr');
    this.kindSelect = page.getByTestId('stundennachweis-kindId');
    this.auftraggeberSelect = page.getByTestId('stundennachweis-auftraggeberId');
    this.submit = page.getByTestId('stundennachweis-submit');
    this.successToast = page.getByTestId('stundennachweis-success');
    this.errorBanner = page.getByTestId('stundennachweis-error');
  }

  async goto(): Promise<void> {
    await this.page.goto('/stundennachweis');
  }

  async setMonat(year: number, month: number): Promise<void> {
    await this.jahrInput.selectOption(String(year));
    await this.monatInput.selectOption(String(month));
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
