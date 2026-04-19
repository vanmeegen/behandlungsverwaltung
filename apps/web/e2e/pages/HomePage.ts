import type { Locator, Page } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly greeting: Locator;
  readonly loading: Locator;
  readonly error: Locator;

  constructor(page: Page) {
    this.page = page;
    this.greeting = page.getByTestId('hello-greeting');
    this.loading = page.getByTestId('hello-loading');
    this.error = page.getByTestId('hello-error');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async greetingText(): Promise<string> {
    return (await this.greeting.textContent())?.trim() ?? '';
  }
}
