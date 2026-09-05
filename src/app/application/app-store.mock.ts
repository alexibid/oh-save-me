import { Account } from '@domain/models/account';
import { Transaction } from '@domain/models/transaction';
import { CategoryInfo } from '@domain/models/category';
import { Budget } from '@domain/models/budget';
import { CustomRecord } from '@domain/models/custom-record';
import { DbImportPreview, DbSnapshot } from '@domain/shared/db-snapshot.utils';
import { MOCK_ACCOUNT_BANK } from '@/mocks/accounts.mock';
import { MOCK_CATEGORIES } from '@/mocks/categories.mock';
import { MOCK_BUDGET_PROJECT_HOME } from '@/mocks/budgets.mock';
import { MOCK_TX_SALARY } from '@/mocks/transactions.mock';

export const MOCK_SAVVY_STORE = {
  account: MOCK_ACCOUNT_BANK as Account,
  transaction: MOCK_TX_SALARY as Transaction,
  category: MOCK_CATEGORIES[0] as CategoryInfo,
  budget: MOCK_BUDGET_PROJECT_HOME as Budget,
  customRecord: { id: 'r1', accountId: MOCK_ACCOUNT_BANK.id, date: '2026-07-01', dimensions: {}, measures: {}, updatedAt: 0 } as CustomRecord,

  get preview(): DbImportPreview {
    return {
      accountsToImport: [this.account],
      categoriesToImport: [this.category],
      budgetsToImport: [this.budget],
      customRecordsToImport: [this.customRecord],
      transactionsToImport: [this.transaction],
      skippedCounts: { accounts: 0, categories: 0, budgets: 0, customRecords: 0, transactions: 0 }
    };
  },

  get emptyPreview(): DbImportPreview {
    return {
      accountsToImport: [], categoriesToImport: [], budgetsToImport: [],
      customRecordsToImport: [], transactionsToImport: [],
      skippedCounts: { accounts: 1, categories: 1, budgets: 1, customRecords: 1, transactions: 1 }
    };
  },

  get foreignSnapshot(): DbSnapshot {
    return {
      version: 1,
      exportDate: '2026-08-05T09:46:12.771Z',
      data: {
        accounts: [
          { id: 'acc_foreign_bank', name: 'Conta Bancária Externa', updatedAt: 0, kind: 'financial', type: 'bank_account', scope: 'individual', includeInConsolidatedBalance: true, unit: 'EUR' },
          { id: 'acc_foreign_invest', name: 'Conta de Investimentos Externa', updatedAt: 0, kind: 'financial', type: 'investment', scope: 'individual', includeInConsolidatedBalance: true, unit: 'EUR' }
        ],
        transactions: [
          { id: 'tx_foreign_hash_a', date: '2026-06-01', description: 'Farmácia', amount: -12, category: 'Healthcare', accountId: 'acc_foreign_bank' },
          { id: 'tx_foreign_hash_c', date: '2026-07-01', description: 'Restaurante', amount: -30, category: 'Restaurants', accountId: 'acc_foreign_bank' },
          { id: 'tx_foreign_hash_tr', date: '2026-07-02', description: 'Depósito', amount: 500, category: 'Others', accountId: 'acc_foreign_invest' }
        ],
        categories: [], budgets: [], customRecords: []
      }
    };
  }
};
