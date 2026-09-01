import { Transaction } from '@domain/models/transaction';
import { SortDirection, TableSortField } from '@domain/models/record-list';

export function sortRecords(
  transactions: readonly Transaction[],
  field: TableSortField,
  direction: SortDirection,
  selectedIds?: ReadonlySet<string>
): readonly Transaction[] {
  const multiplier = direction === 'asc' ? 1 : -1;

  return [...transactions].sort((a, b) => multiplier * compareByField(a, b, field, selectedIds));
}

function compareByField(a: Transaction, b: Transaction, field: TableSortField, selectedIds?: ReadonlySet<string>): number {
  switch (field) {
    case 'date':
      return a.date.localeCompare(b.date);
    case 'description':
      return a.description.localeCompare(b.description);
    case 'category':
      return a.category.localeCompare(b.category);
    case 'amount':
      return a.amount - b.amount;
    case 'balance':
      return (a.balance ?? 0) - (b.balance ?? 0);
    case 'selected': {
      const aSel = selectedIds?.has(a.id) ? 1 : (a.isRecurring ? 1 : 0);
      const bSel = selectedIds?.has(b.id) ? 1 : (b.isRecurring ? 1 : 0);
      return aSel - bSel;
    }
  }
}
