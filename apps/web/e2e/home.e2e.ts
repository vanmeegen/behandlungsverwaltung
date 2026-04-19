import { expect, test } from '@playwright/test';
import { HomePage } from './pages/HomePage';

test.describe('Home page', () => {
  test('loads the greeting from the GraphQL server', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(home.greeting).toBeVisible();
    await expect(home.error).toHaveCount(0);
    expect(await home.greetingText()).not.toHaveLength(0);
  });
});
