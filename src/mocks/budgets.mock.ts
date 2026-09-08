import { Budget } from '@domain/models/budget';

export const MOCK_BUDGET_PROJECT_HOME: Budget = {
  id: 'bud-proj-home',
  name: 'Obras Casa',
  amount: 1000,
  type: 'project',
  tags: ['obras'],
  monthlyAllocation: 100,
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  kind: 'works'
};

export const MOCK_BUDGET_PROJECT_VACATION: Budget = {
  id: 'bud-proj-vacation',
  name: 'Summer Holiday',
  amount: 1500,
  type: 'project',
  tags: ['viagem', 'ferias'],
  monthlyAllocation: 150,
  startDate: '2026-01-01',
  endDate: '2026-08-31',
  projectStartDate: '2026-08-10',
  projectEndDate: '2026-08-20',
  kind: 'vacation'
};

export const MOCK_BUDGET_CATEGORY_GROCERIES: Budget = {
  id: 'bud-cat-groceries',
  name: 'Groceries & Supermarket',
  amount: 400,
  type: 'category',
  categoryId: 'Groceries'
};

export const MOCK_BUDGET_CATEGORY_RESTAURANTS: Budget = {
  id: 'bud-cat-restaurants',
  name: 'Dining & Restaurants',
  amount: 150,
  type: 'category',
  categoryId: 'Restaurants'
};

export const MOCK_BUDGET_CATEGORY_UTILITIES: Budget = {
  id: 'bud-cat-utilities',
  name: 'Services & Utilities',
  amount: 200,
  type: 'category',
  categoryId: 'Utilities'
};

export const MOCK_BUDGET_WALLET_HOUSE: Budget = {
  id: 'bud-wallet-house',
  name: 'Casa Duarte Dos Santos',
  amount: 250000,
  type: 'investment',
  kind: 'house',
  outstandingDebt: 200000,
  contractedInstalments: 360,
  paidInstalments: 24,
  currentValue: 260000
};

export const MOCK_BUDGETS: readonly Budget[] = [
  MOCK_BUDGET_PROJECT_HOME,
  MOCK_BUDGET_PROJECT_VACATION,
  MOCK_BUDGET_CATEGORY_GROCERIES,
  MOCK_BUDGET_CATEGORY_RESTAURANTS,
  MOCK_BUDGET_CATEGORY_UTILITIES,
  MOCK_BUDGET_WALLET_HOUSE
];
