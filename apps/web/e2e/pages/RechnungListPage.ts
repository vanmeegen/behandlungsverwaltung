import type { Locator, Page } from '@playwright/test';

export class RechnungListPage {
  readonly page: Page;
  readonly kindFilter: Locator;
  readonly auftraggeberFilter: Locator;
  readonly monatFilter: Locator;
  readonly table: Locator;
  readonly empty: Locator;

  constructor(page: Page) {
    this.page = page;
    this.kindFilter = page.getByTestId('rechnung-list-filter-kindId');
    this.auftraggeberFilter = page.getByTestId('rechnung-list-filter-auftraggeberId');
    this.monatFilter = page.getByTestId('rechnung-list-filter-monat');
    this.table = page.getByTestId('rechnung-list-table');
    this.empty = page.getByTestId('rechnung-list-empty');
  }

  async goto(): Promise<void> {
    await this.page.goto('/rechnungen');
  }

  row(nummer: string): Locator {
    return this.page.getByTestId(`rechnung-row-${nummer}`);
  }

  gesamtsumme(nummer: string): Locator {
    return this.page.getByTestId(`rechnung-row-${nummer}-gesamtsumme`);
  }

  download(nummer: string): Locator {
    return this.page.getByTestId(`rechnung-row-${nummer}-download`);
  }

  async filterByKind(kindId: string): Promise<void> {
    await this.kindFilter.selectOption(kindId);
  }
}
