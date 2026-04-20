import type { Locator, Page } from '@playwright/test';

export class SchnellerfassungPage {
  readonly page: Page;
  readonly kindSelect: Locator;
  readonly therapieSelect: Locator;
  readonly beValue: Locator;
  readonly bePlus: Locator;
  readonly beMinus: Locator;
  readonly datum: Locator;
  readonly arbeitsthema: Locator;
  readonly submit: Locator;

  constructor(page: Page) {
    this.page = page;
    this.kindSelect = page.getByTestId('schnellerfassung-kindId');
    this.therapieSelect = page.getByTestId('schnellerfassung-therapieId');
    this.beValue = page.getByTestId('schnellerfassung-be');
    this.bePlus = page.getByTestId('schnellerfassung-be-plus');
    this.beMinus = page.getByTestId('schnellerfassung-be-minus');
    this.datum = page.getByTestId('schnellerfassung-datum');
    this.arbeitsthema = page.getByTestId('schnellerfassung-arbeitsthema');
    this.submit = page.getByTestId('schnellerfassung-submit');
  }

  async goto(): Promise<void> {
    await this.page.goto('/schnellerfassung');
  }

  async chooseKind(id: string): Promise<void> {
    await this.kindSelect.selectOption(id);
  }

  async chooseTherapie(id: string): Promise<void> {
    await this.therapieSelect.selectOption(id);
  }

  async tapPlus(times: number): Promise<void> {
    for (let i = 0; i < times; i++) {
      await this.bePlus.click();
    }
  }

  async submitAndWait(): Promise<void> {
    await this.submit.click();
  }
}
