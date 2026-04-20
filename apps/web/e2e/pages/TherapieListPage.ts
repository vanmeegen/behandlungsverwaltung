import type { Locator, Page } from '@playwright/test';

export class TherapieListPage {
  readonly page: Page;
  readonly rows: Locator;
  readonly newLink: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.rows = page.getByTestId('therapie-row');
    this.newLink = page.getByTestId('therapie-list-new');
    this.emptyState = page.getByTestId('therapie-list-empty');
  }

  async goto(): Promise<void> {
    await this.page.goto('/therapien');
  }

  formCellFor(id: string): Locator {
    return this.page.getByTestId(`therapie-row-form-${id}`);
  }
}
