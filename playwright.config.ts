import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
config({ path: '.env.test' });

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  timeout: 40_000,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'tests/e2e/report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://impact-calculator-beryl.vercel.app',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'ru-RU',
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile 375px',
      use: {
        viewport: { width: 375, height: 812 },
        userAgent: devices['iPhone 13'].userAgent,
      },
    },
  ],
});
