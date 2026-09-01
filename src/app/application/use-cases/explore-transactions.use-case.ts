import { Transaction } from '@domain/models/transaction';
import { RecordListSchema } from '@domain/models/record-list-schema';
import { TableSortField, TableTab, SortDirection } from '@domain/models/record-list';
import { filterByTab } from '@domain/services/record-filter.service';
import { sortRecords } from '@domain/services/record-sort.service';
import { applyPinPriority } from '@domain/services/record-pin.service';
import { matchesQuery } from '@domain/services/record-search.service';

export interface ExploreTransactionsQuery {
  readonly transactions: readonly Transaction[];
  readonly schema: RecordListSchema<Transaction>;
  readonly searchQuery: string;
  readonly tab: TableTab;
  readonly sortField: TableSortField | null;
  readonly sortDirection: SortDirection;
  readonly pinnedIds: ReadonlySet<string>;
  readonly selectedIds?: ReadonlySet<string>;
}

export function exploreTransactions(query: ExploreTransactionsQuery): readonly Transaction[] {
  const searched = query.searchQuery.trim()
    ? query.transactions.filter(t => matchesQuery(t, query.schema, query.searchQuery))
    : query.transactions;

  const filtered = filterByTab(searched, query.tab);
  const sorted = query.sortField ? sortRecords(filtered, query.sortField, query.sortDirection, query.selectedIds) : filtered;

  return applyPinPriority(sorted, query.pinnedIds);
}
