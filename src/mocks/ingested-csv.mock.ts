import { Transaction } from '@domain/models/transaction';
import { FinancialAccount } from '@domain/models/account';
import { CategoryInfo } from '@domain/models/category';
import { Budget } from '@domain/models/budget';

export const MOCK_INGESTED_ACCOUNTS: readonly FinancialAccount[] = [
  {
    id: 'acc_cgd',
    name: 'CGD Conta Ordem',
    type: 'bank_account',
    scope: 'individual',
    kind: 'financial',
    includeInConsolidatedBalance: true,
    unit: 'EUR',
    updatedAt: Date.now()
  },
  {
    id: 'acc_activo',
    name: 'ActivoBank Poupança',
    type: 'bank_account',
    scope: 'individual',
    kind: 'financial',
    includeInConsolidatedBalance: true,
    unit: 'EUR',
    updatedAt: Date.now()
  }
];

export const MOCK_INGESTED_CATEGORIES: readonly CategoryInfo[] = [
  {
    id: 'cat_groceries',
    name: 'Supermercado & Alimentação',
    color: '#059669',
    icon: 'category-groceries'
  },
  {
    id: 'cat_salary',
    name: 'Salário & Vencimento',
    color: '#2563eb',
    icon: 'category-income'
  }
];

export const MOCK_INGESTED_BUDGETS: readonly Budget[] = [
  {
    id: 'bud_vacation',
    name: 'Férias Algarve',
    amount: 1500,
    type: 'project',
    isClosed: false
  }
];

export const MOCK_INGESTED_TRANSACTIONS: readonly Transaction[] = [
  {
    id: 'tx_1',
    date: '2026-08-15',
    description: 'COMPRA PINGO DOCE GAIA, PT',
    amount: -45.80,
    category: 'cat_groceries',
    accountId: 'acc_cgd',
    budgetId: 'bud_vacation',
    notes: 'Jantar de amigos',
    importBatchId: 'batch_20260815'
  },
  {
    id: 'tx_2',
    date: '2026-08-20',
    description: 'TRANSFERENCIA RECEBIDA - ORDENADO',
    amount: 2150.00,
    category: 'cat_salary',
    accountId: 'acc_cgd',
    countsAsIncome: true,
    importBatchId: 'batch_20260815'
  }
];
