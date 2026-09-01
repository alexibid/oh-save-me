import { vi } from 'vitest';
import { MOCK_ACCOUNTS } from './accounts.mock';
import { MOCK_CATEGORIES } from './categories.mock';
import { MOCK_BUDGETS } from './budgets.mock';
import { MOCK_TRANSACTIONS } from './transactions.mock';
import { MOCK_CUSTOM_RECORDS } from './custom-records.mock';
import { MOCK_IMPORT_BATCHES } from './import-batches.mock';
import { MOCK_CUSTOMIZATIONS } from './customizations.mock';
import { AccountRepository } from '@domain/repositories/account.repository';
import { CategoryRepository } from '@domain/repositories/category.repository';
import { BudgetRepository } from '@domain/repositories/budget.repository';
import { TransactionRepository } from '@domain/repositories/transaction.repository';
import { CustomRecordRepository } from '@domain/repositories/custom-record.repository';
import { HistoryLogRepository } from '@domain/repositories/history-log.repository';
import { CustomizationRepository } from '@domain/repositories/customization.repository';
import { ImportBatchRepository } from '@domain/repositories/import-batch.repository';

export const createMockAccountRepository = (overrides?: Partial<AccountRepository>): AccountRepository => ({
  save: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  getAll: vi.fn().mockResolvedValue([...MOCK_ACCOUNTS]),
  delete: vi.fn().mockResolvedValue(undefined),
  ...overrides
});

export const createMockCategoryRepository = (overrides?: Partial<CategoryRepository>): CategoryRepository => ({
  save: vi.fn().mockResolvedValue(undefined),
  getAll: vi.fn().mockResolvedValue([...MOCK_CATEGORIES]),
  delete: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
  ...overrides
});

export const createMockBudgetRepository = (overrides?: Partial<BudgetRepository>): BudgetRepository => ({
  save: vi.fn().mockResolvedValue(undefined),
  getAll: vi.fn().mockResolvedValue([...MOCK_BUDGETS]),
  delete: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
  ...overrides
});

export const createMockTransactionRepository = (overrides?: Partial<TransactionRepository>): TransactionRepository => ({
  saveAll: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  getAll: vi.fn().mockResolvedValue([...MOCK_TRANSACTIONS]),
  delete: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
  ...overrides
});

export const createMockCustomRecordRepository = (overrides?: Partial<CustomRecordRepository>): CustomRecordRepository => ({
  save: vi.fn().mockResolvedValue(undefined),
  saveMany: vi.fn().mockResolvedValue(undefined),
  getAll: vi.fn().mockResolvedValue([...MOCK_CUSTOM_RECORDS]),
  getByAccountId: vi.fn().mockImplementation((accId: string) => Promise.resolve(MOCK_CUSTOM_RECORDS.filter(r => r.accountId === accId))),
  delete: vi.fn().mockResolvedValue(undefined),
  ...overrides
});

export const createMockHistoryLogRepository = (overrides?: Partial<HistoryLogRepository>): HistoryLogRepository => ({
  save: vi.fn().mockResolvedValue(undefined),
  getAll: vi.fn().mockResolvedValue([]),
  delete: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
  ...overrides
});

export const createMockCustomizationRepository = (overrides?: Partial<CustomizationRepository>): CustomizationRepository => ({
  save: vi.fn().mockResolvedValue(undefined),
  getAll: vi.fn().mockResolvedValue([...MOCK_CUSTOMIZATIONS]),
  delete: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
  ...overrides
});

export const createMockImportBatchRepository = (overrides?: Partial<ImportBatchRepository>): ImportBatchRepository => ({
  save: vi.fn().mockResolvedValue(undefined),
  getAll: vi.fn().mockResolvedValue([...MOCK_IMPORT_BATCHES]),
  delete: vi.fn().mockResolvedValue(undefined),
  ...overrides
});
