import type { Meta, StoryObj } from '@storybook/angular';
import { TransactionsTableComponent } from './transactions-table';
import { Transaction } from '@domain/models/transaction';
import { CategoryInfo } from '@domain/models/category';

const meta: Meta<TransactionsTableComponent> = { component: TransactionsTableComponent, tags: ['autodocs'] };
export default meta;

const categoryOptions: CategoryInfo[] = [
  { id: 'Groceries', name: 'Groceries', color: '#10b981', icon: 'shopping_cart' },
  { id: 'Transport', name: 'Transport', color: '#f59e0b', icon: 'directions_car' },
  { id: 'Salary', name: 'Salary', color: '#22c55e', icon: 'savings' },
  { id: 'Entertainment', name: 'Entertainment', color: '#ec4899', icon: 'play_circle' }
];

const transactions: Transaction[] = [
  { id: 't1', date: '2026-08-10', description: 'Continente Bom Dia', amount: -42.3, category: 'Groceries', balance: 1200 },
  { id: 't2', date: '2026-08-09', description: 'Salário Agosto', amount: 1800, category: 'Salary', balance: 1242.3 },
  { id: 't3', date: '2026-08-08', description: 'Uber viagem centro', amount: -8.5, category: 'Transport', balance: -557.7 },
  { id: 't4', date: '2026-08-07', description: 'Netflix assinatura mensal', amount: -12.99, category: 'Entertainment', balance: -549.2 },
  { id: 't5', date: '2026-08-05', description: 'Lidl compras da semana', amount: -63.1, category: 'Groceries', balance: -536.21 }
];

export const Primary: StoryObj<TransactionsTableComponent> = {
  args: { transactions, categoryOptions }
};

export const WithSearchAndTabsCentered: StoryObj<TransactionsTableComponent> = {
  args: { transactions, categoryOptions, showSearch: true, searchQuery: '' }
};

export const CompactSortRow: StoryObj<TransactionsTableComponent> = {
  args: { transactions, categoryOptions, showTitle: false, showTabs: false }
};

export const SumModeSplit: StoryObj<TransactionsTableComponent> = {
  args: {
    transactions,
    categoryOptions,
    showSumToggle: true,
    sumModeEnabled: true,
    selectedForSum: new Set(['t1', 't2'])
  }
};

const transactionsWithTransfer: Transaction[] = [
  ...transactions,
  { id: 't6', date: '2026-08-11', description: 'Transferência para poupança', amount: -300, category: 'Transfers', linkedTransactionId: 't7' }
];

export const SumModeExcludingTransfers: StoryObj<TransactionsTableComponent> = {
  args: {
    transactions: transactionsWithTransfer,
    categoryOptions,
    showSumToggle: true,
    sumModeEnabled: true,
    selectedForSum: new Set(['t1', 't2', 't6']),
    excludeTransfers: true
  }
};
