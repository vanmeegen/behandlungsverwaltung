import type { Locator, Page } from '@playwright/test';

export class AuftraggeberListPage {
  readonly page: Page;
  readonly rows: Locator;
  readonly newLink: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.rows = page.getByTestId('auftraggeber-row');
    this.newLink = page.getByTestId('auftraggeber-list-new');
    this.emptyState = page.getByTestId('auftraggeber-list-empty');
  }

  async goto(): Promise<void> {
    await this.page.goto('/auftraggeber');
  }

  firmennameCellFor(id: string): Locator {
    return this.page.getByTestId(`auftraggeber-row-firmenname-${id}`);
  }

  nachnameCellFor(id: string): Locator {
    return this.page.getByTestId(`auftraggeber-row-nachname-${id}`);
  }

  vornameCellFor(id: string): Locator {
    return this.page.getByTestId(`auftraggeber-row-vorname-${id}`);
  }

  editLinkFor(id: string): Locator {
    return this.page.getByTestId(`auftraggeber-row-edit-${id}`);
  }
}
