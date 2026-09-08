import { FinancialAccount, CustomAccount, Account } from '@domain/models/account';

export const MOCK_ACCOUNT_BANK: FinancialAccount = {
  id: 'acc-bank-main',
  name: 'Primary Bank Account',
  updatedAt: 1704067200000,
  kind: 'financial',
  type: 'bank_account',
  scope: 'individual',
  includeInConsolidatedBalance: true,
  unit: 'EUR',
  openingBalance: 2000.00
};

export const MOCK_ACCOUNT_INVESTMENT: FinancialAccount = {
  id: 'acc-invest-main',
  name: 'Investment Account',
  updatedAt: 1704067200000,
  kind: 'financial',
  type: 'investment',
  scope: 'individual',
  includeInConsolidatedBalance: true,
  unit: 'EUR',
  openingBalance: 0.00
};

export const MOCK_ACCOUNT_MEAL: FinancialAccount = {
  id: 'acc-meal-main',
  name: 'Meal Card',
  updatedAt: 1704067200000,
  kind: 'financial',
  type: 'meal_card',
  scope: 'individual',
  includeInConsolidatedBalance: false,
  unit: 'EUR',
  openingBalance: 150.00
};

export const MOCK_ACCOUNT_CUSTOM: CustomAccount = {
  id: 'acc-custom-main',
  name: 'Registos Personalizados',
  updatedAt: 1704067200000,
  kind: 'custom',
  purpose: 'Readings and Metrics Tracking'
};

export const MOCK_ACCOUNTS: readonly Account[] = [
  MOCK_ACCOUNT_BANK,
  MOCK_ACCOUNT_INVESTMENT,
  MOCK_ACCOUNT_MEAL,
  MOCK_ACCOUNT_CUSTOM
];
