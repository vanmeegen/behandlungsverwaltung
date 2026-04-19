import { defineConfig, devices } from '@playwright/test';

const WEB_PORT = 5173;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['list'], ['junit', { outputFile: '../../reports/web-e2e-junit.xml' }]]
    : 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    testIdAttribute: 'data-testselector',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'bun run dev',
    cwd: '../..',
    url: `http://localhost:${WEB_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
