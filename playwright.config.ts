import { defineConfig } from '@playwright/test';
import { basePlaywrightConfig, E2E_SERVER_TIMEOUT } from '../../tools/playwright/playwright.base';

/**
 * The suite runs its own server through its own Nx target: Nx serialises a target with itself, so
 * borrowing `serve` would queue the test server behind an open dev server until it timed out.
 */
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
  },
});
