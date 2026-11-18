import { Page } from '@playwright/test';
import { MOCK_ACCOUNTS } from '../../src/mocks/accounts.mock';
import { MOCK_BUDGETS } from '../../src/mocks/budgets.mock';
import { MOCK_CATEGORIES } from '../../src/mocks/categories.mock';
import { MOCK_CUSTOM_RECORDS } from '../../src/mocks/custom-records.mock';
import { MOCK_CUSTOMIZATIONS } from '../../src/mocks/customizations.mock';
import { MOCK_IMPORT_BATCHES } from '../../src/mocks/import-batches.mock';
import { MOCK_TRANSACTIONS } from '../../src/mocks/transactions.mock';

export const E2E_NOW = new Date('2026-08-18T10:00:00.000Z');

export const E2E_SEED_DATA = {
  accounts: MOCK_ACCOUNTS,
  categories: MOCK_CATEGORIES,
  budgets: MOCK_BUDGETS,
  transactions: MOCK_TRANSACTIONS,
  customRecords: MOCK_CUSTOM_RECORDS,
  importBatches: MOCK_IMPORT_BATCHES,
  customizations: MOCK_CUSTOMIZATIONS,
};

export async function seedE2eDatabase(
  page: Page,
  overrides: Partial<typeof E2E_SEED_DATA> = {},
  now: Date | null = E2E_NOW,
): Promise<void> {
  if (now) await page.clock.setFixedTime(now);

  const data = { ...E2E_SEED_DATA, ...overrides };
  await page.addInitScript((seedData) => {
    (window as unknown as { __E2E_SEED_DATA__?: typeof seedData }).__E2E_SEED_DATA__ = seedData;
  }, data);
}
