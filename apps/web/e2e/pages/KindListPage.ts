import type { Locator, Page } from '@playwright/test';

export class KindListPage {
  readonly page: Page;
  readonly rows: Locator;
  readonly newLink: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.rows = page.getByTestId('kind-row');
    this.newLink = page.getByTestId('kind-list-new');
    this.emptyState = page.getByTestId('kind-list-empty');
  }

  async goto(): Promise<void> {
    await this.page.goto('/kinder');
  }

  editLinkFor(id: string): Locator {
    return this.page.getByTestId(`kind-row-edit-${id}`);
  }

  nachnameCellFor(id: string): Locator {
    return this.page.getByTestId(`kind-row-nachname-${id}`);
  }
}
