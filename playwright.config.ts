import { defineConfig } from '@playwright/test';
import { basePlaywrightConfig, E2E_SERVER_TIMEOUT } from '../../tools/playwright/playwright.base';

const BASE_URL = 'http://localhost:4201';

export default defineConfig({
  ...basePlaywrightConfig,
  testDir: './e2e',
  use: {
    ...basePlaywrightConfig.use,
    baseURL: BASE_URL,
  },
  webServer: {
    command: 'npx nx run oh-save-me:serve-e2e',
    cwd: '../..',
    url: BASE_URL,
    reuseExistingServer: !process.env['CI'],
    timeout: E2E_SERVER_TIMEOUT,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
