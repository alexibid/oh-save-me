import { Account, isFinancialAccount } from '@domain/models/account';
import { Transaction } from '@domain/models/transaction';
import { CategoryInfo } from '@domain/models/category';
import { Budget } from '@domain/models/budget';
import { CustomRecord } from '@domain/models/custom-record';

export interface DbSnapshot {
  readonly version: 1;
  readonly exportDate: string;
  readonly data: {
    readonly accounts: readonly Account[];
    readonly transactions: readonly Transaction[];
    readonly categories: readonly CategoryInfo[];
    readonly budgets: readonly Budget[];
    readonly customRecords: readonly CustomRecord[];
  };
}

export interface DbSnapshotState {
  readonly accounts: readonly Account[];
  readonly transactions: readonly Transaction[];
  readonly categories: readonly CategoryInfo[];
  readonly budgets: readonly Budget[];
  readonly customRecords: readonly CustomRecord[];
}

export interface DbImportPreview {
  readonly accountsToImport: readonly Account[];
  readonly categoriesToImport: readonly CategoryInfo[];
  readonly budgetsToImport: readonly Budget[];
  readonly customRecordsToImport: readonly CustomRecord[];
  readonly transactionsToImport: readonly Transaction[];
  readonly skippedCounts: {
    readonly accounts: number;
    readonly categories: number;
    readonly budgets: number;
    readonly customRecords: number;
    readonly transactions: number;
  };
}

export function computeDbImportPreview(snapshot: DbSnapshot, current: DbSnapshotState): DbImportPreview {
  const { accountsToImport, skippedCount: skippedAccounts, accountIdRemap } =
    resolveAccounts(snapshot.data.accounts, current.accounts);

  const categories = partitionByExistingIds(snapshot.data.categories, idsOf(current.categories));
  const budgets = partitionByExistingIds(snapshot.data.budgets, idsOf(current.budgets));

  const remappedCustomRecords = snapshot.data.customRecords.map(r => remapAccountId(r, accountIdRemap));
  const customRecords = partitionByExistingIds(remappedCustomRecords, idsOf(current.customRecords));

  const remappedTransactions = snapshot.data.transactions.map(t => remapAccountId(t, accountIdRemap));
  const transactions = partitionByContent(remappedTransactions, current.transactions);

  return {
    accountsToImport,
    categoriesToImport: categories.toImport,
    budgetsToImport: budgets.toImport,
    customRecordsToImport: customRecords.toImport,
    transactionsToImport: transactions.toImport,
    skippedCounts: {
      accounts: skippedAccounts,
      categories: categories.skippedCount,
      budgets: budgets.skippedCount,
      customRecords: customRecords.skippedCount,
      transactions: transactions.skippedCount
    }
  };
}

interface AccountResolution {
  readonly accountsToImport: readonly Account[];
  readonly skippedCount: number;
  readonly accountIdRemap: ReadonlyMap<string, string>;
}

function resolveAccounts(incoming: readonly Account[], current: readonly Account[]): AccountResolution {
  const currentById = new Map(current.map(a => [a.id, a]));
  const currentByIdentity = new Map(current.map(a => [accountIdentityKey(a), a]));

  const accountsToImport: Account[] = [];
  const accountIdRemap = new Map<string, string>();
  let skippedCount = 0;

  for (const account of incoming) {
    const existingById = currentById.get(account.id);
    const matched = existingById ?? currentByIdentity.get(accountIdentityKey(account));

    if (matched) {
      skippedCount++;
      accountIdRemap.set(account.id, matched.id);
      continue;
    }

    accountsToImport.push(account);
    accountIdRemap.set(account.id, account.id);
  }

  return { accountsToImport, skippedCount, accountIdRemap };
}

function accountIdentityKey(account: Account): string {
  const name = account.name.trim().toLowerCase();
  return isFinancialAccount(account) ? `financial:${name}:${account.type}` : `custom:${name}:${account.purpose}`;
}

function remapAccountId<T extends { readonly accountId?: string }>(entity: T, remap: ReadonlyMap<string, string>): T {
  if (!entity.accountId) return entity;
  const remapped = remap.get(entity.accountId);
  if (!remapped || remapped === entity.accountId) return entity;
  return { ...entity, accountId: remapped };
}

export function partitionSnapshotByScope(snapshot: DbSnapshot): {
  readonly privateSnapshot: DbSnapshot;
  readonly jointSnapshot: DbSnapshot;
} {
  const jointAccounts = snapshot.data.accounts.filter(a => isFinancialAccount(a) && a.scope === 'joint');
  const privateAccounts = snapshot.data.accounts.filter(a => !isFinancialAccount(a) || a.scope !== 'joint');

  const jointAccountIds = new Set(jointAccounts.map(a => a.id));

  const jointTransactions = snapshot.data.transactions.filter(t => t.accountId && jointAccountIds.has(t.accountId));
  const privateTransactions = snapshot.data.transactions.filter(t => !t.accountId || !jointAccountIds.has(t.accountId));

  const jointCustomRecords = snapshot.data.customRecords.filter(r => jointAccountIds.has(r.accountId));
  const privateCustomRecords = snapshot.data.customRecords.filter(r => !jointAccountIds.has(r.accountId));

  const jointBudgets = snapshot.data.budgets.filter(b => b.type === 'project');
  const privateBudgets = snapshot.data.budgets.filter(b => b.type !== 'project');

  const privateSnapshot: DbSnapshot = {
    version: 1,
    exportDate: snapshot.exportDate,
    data: {
      accounts: privateAccounts,
      transactions: privateTransactions,
      categories: snapshot.data.categories,
      budgets: privateBudgets,
      customRecords: privateCustomRecords
    }
  };

  const jointSnapshot: DbSnapshot = {
    version: 1,
    exportDate: snapshot.exportDate,
    data: {
      accounts: jointAccounts,
      transactions: jointTransactions,
      categories: snapshot.data.categories,
      budgets: jointBudgets,
      customRecords: jointCustomRecords
    }
  };

  return { privateSnapshot, jointSnapshot };
}

export function mergeScopedSnapshots(
  privateSnapshot: DbSnapshot | null,
  jointSnapshot: DbSnapshot | null
): DbSnapshot {
  const accounts = [
    ...(privateSnapshot?.data.accounts ?? []),
    ...(jointSnapshot?.data.accounts ?? [])
  ];

  const transactions = [
    ...(privateSnapshot?.data.transactions ?? []),
    ...(jointSnapshot?.data.transactions ?? [])
  ];

  const budgets = [
    ...(privateSnapshot?.data.budgets ?? []),
    ...(jointSnapshot?.data.budgets ?? [])
  ];

  const customRecords = [
    ...(privateSnapshot?.data.customRecords ?? []),
    ...(jointSnapshot?.data.customRecords ?? [])
  ];

  const categoryMap = new Map<string, CategoryInfo>();
  for (const cat of privateSnapshot?.data.categories ?? []) {
    categoryMap.set(cat.id, cat);
  }
  for (const cat of jointSnapshot?.data.categories ?? []) {
    categoryMap.set(cat.id, cat);
  }

  return {
    version: 1,
    exportDate: new Date().toISOString(),
    data: {
      accounts,
      transactions,
      categories: Array.from(categoryMap.values()),
      budgets,
      customRecords
    }
  };
}

function transactionContentKey(t: Transaction): string {
  return `${t.date}|${t.description}|${t.amount}|${t.accountId ?? ''}`;
}

function partitionByContent(
  incoming: readonly Transaction[],
  existing: readonly Transaction[]
): { readonly toImport: readonly Transaction[]; readonly skippedCount: number } {
  const existingCounts = new Map<string, number>();
  for (const t of existing) {
    const key = transactionContentKey(t);
    existingCounts.set(key, (existingCounts.get(key) ?? 0) + 1);
  }

  const toImport: Transaction[] = [];
  let skippedCount = 0;

  for (const t of incoming) {
    const key = transactionContentKey(t);
    const remaining = existingCounts.get(key) ?? 0;
    if (remaining > 0) {
      existingCounts.set(key, remaining - 1);
      skippedCount++;
    } else {
      toImport.push(t);
    }
  }

  return { toImport, skippedCount };
}

function idsOf(records: readonly { readonly id: string }[]): ReadonlySet<string> {
  return new Set(records.map(r => r.id));
}

function partitionByExistingIds<T extends { readonly id: string }>(
  incoming: readonly T[],
  existingIds: ReadonlySet<string>
): { readonly toImport: readonly T[]; readonly skippedCount: number } {
  const toImport = incoming.filter(r => !existingIds.has(r.id));
  return { toImport, skippedCount: incoming.length - toImport.length };
}
