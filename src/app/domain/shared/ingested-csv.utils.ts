import { Transaction } from '@domain/models/transaction';
import { Account } from '@domain/models/account';
import { CategoryInfo } from '@domain/models/category';
import { Budget } from '@domain/models/budget';

export interface CsvEntityLookup {
  readonly accounts: readonly Account[];
  readonly categories: readonly CategoryInfo[];
  readonly budgets: readonly Budget[];
}

function escapeCsvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function serializeIngestedTransactionsToCsv(
  transactions: readonly Transaction[],
  lookup: CsvEntityLookup
): string {
  const accountMap = new Map(lookup.accounts.map(a => [a.id, a.name]));
  const categoryMap = new Map(lookup.categories.map(c => [c.id, c.name]));
  const budgetMap = new Map(lookup.budgets.map(b => [b.id, b.name]));

  const headers = [
    'Date',
    'Description',
    'Amount',
    'Type',
    'Account',
    'Category',
    'Budget',
    'Notes',
    'IsInternalTransfer',
    'TransactionId'
  ];

  const rows = transactions.map(tx => {
    const isExpense = tx.amount < 0;
    const type = isExpense ? 'expense' : 'income';
    const accountName = (tx.accountId && accountMap.get(tx.accountId)) || tx.account || '';
    const categoryName = (tx.category && categoryMap.get(tx.category)) || tx.category || '';
    const budgetName = (tx.budgetId && budgetMap.get(tx.budgetId)) || '';
    const isTransfer = Boolean(tx.transferAccountId || tx.linkedTransactionId);

    return [
      escapeCsvField(tx.date),
      escapeCsvField(tx.description),
      escapeCsvField(tx.amount.toFixed(2)),
      escapeCsvField(type),
      escapeCsvField(accountName),
      escapeCsvField(categoryName),
      escapeCsvField(budgetName),
      escapeCsvField(tx.notes ?? ''),
      escapeCsvField(isTransfer),
      escapeCsvField(tx.id)
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function buildImportBatchFileName(
  rawFileName: string,
  accountName: string,
  timestamp: Date = new Date()
): string {
  const year = timestamp.getUTCFullYear();
  const month = String(timestamp.getUTCMonth() + 1).padStart(2, '0');
  const day = String(timestamp.getUTCDate()).padStart(2, '0');
  const hours = String(timestamp.getUTCHours()).padStart(2, '0');
  const minutes = String(timestamp.getUTCMinutes()).padStart(2, '0');

  const sanitize = (val: string) => val.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanAccount = sanitize(accountName || 'account');
  const cleanRaw = sanitize(rawFileName.replace(/\.[^/.]+$/, ''));

  return `${year}-${month}-${day}_${hours}${minutes}_${cleanAccount}_${cleanRaw}.csv`;
}
