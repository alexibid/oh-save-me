import { Transaction } from '@domain/models/transaction';
import { TableTab } from '@domain/models/record-list';

const TOP_N_LIMIT = 20;

export function filterByTab(transactions: readonly Transaction[], tab: TableTab): readonly Transaction[] {
  switch (tab) {
    case 'all':
      return [...transactions].sort((a, b) => b.date.localeCompare(a.date));
    case 'top20':
      return [...transactions]
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
        .slice(0, TOP_N_LIMIT);
    case 'credit':
      return transactions.filter(t => t.amount > 0);
    case 'debit':
      return transactions.filter(t => t.amount < 0);
  }
}
