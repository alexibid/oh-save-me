import { defineConfig } from '@playwright/test';
import { basePlaywrightConfig } from '../../tools/playwright/playwright.base';

const BASE_URL = 'http://localhost:4200';

export default defineConfig({
  ...basePlaywrightConfig,
  testDir: './e2e',
  use: {
    ...basePlaywrightConfig.use,
    baseURL: BASE_URL,
  },
  webServer: {
    command: 'npx nx serve oh-save-me',
    cwd: '../..',
    url: BASE_URL,
    reuseExistingServer: !process.env['CI'],
    timeout: 120 * 1000,
  },
});
