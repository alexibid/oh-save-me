import { CategoryInfo, CategoryType } from '@domain/models/category';
import { Transaction } from '@domain/models/transaction';

export function isTransferCategory(category: CategoryType): boolean {
  return category === 'Transfers';
}

export function isInvestmentCategory(category: CategoryInfo): boolean {
  return !!category.accountTypes?.includes('investment');
}

const LEGACY_RENAMED_CATEGORY_IDS: ReadonlySet<CategoryType> = new Set(['AssetPurchase']);

export function isLegacyOrphanedCategory(categoryId: CategoryType): boolean {
  return LEGACY_RENAMED_CATEGORY_IDS.has(categoryId);
}

const RECURRING_EXPENSE_CATEGORY_IDS: ReadonlySet<CategoryType> = new Set(['Utilities', 'Income', 'Taxes']);

export function isRecurringExpenseCategory(categoryId: CategoryType): boolean {
  return RECURRING_EXPENSE_CATEGORY_IDS.has(categoryId);
}

export interface TransferLinkPatch {
  readonly linkedTransactionId: string;
  readonly transferAccountId: string;
  readonly category: CategoryType;
}

const MAX_TRANSFER_DATE_DIFF_DAYS = 3;
const AMOUNT_MATCH_TOLERANCE = 0.02;

export function findTransferLinks(transactions: readonly Transaction[]): ReadonlyMap<string, TransferLinkPatch> {
  const candidates = transactions.filter(t => !t.linkedTransactionId && !t.transferAccountId);
  const patches = new Map<string, TransferLinkPatch>();

  for (const txA of candidates) {
    if (patches.has(txA.id)) continue;
    const dateA = new Date(txA.date);

    for (const txB of candidates) {
      if (txB.id === txA.id || patches.has(txB.id) || txB.accountId === txA.accountId) continue;

      const dateB = new Date(txB.date);
      const diffDays = Math.abs(dateA.getTime() - dateB.getTime()) / (1000 * 3600 * 24);

      if (diffDays <= MAX_TRANSFER_DATE_DIFF_DAYS && Math.abs(txA.amount + txB.amount) < AMOUNT_MATCH_TOLERANCE) {
        patches.set(txA.id, { linkedTransactionId: txB.id, transferAccountId: txB.accountId ?? '', category: 'Transfers' });
        patches.set(txB.id, { linkedTransactionId: txA.id, transferAccountId: txA.accountId ?? '', category: 'Transfers' });
        break;
      }
    }
  }

  return patches;
}

export function repairAsymmetricTransferLinks(transactions: readonly Transaction[]): ReadonlyMap<string, TransferLinkPatch> {
  const byId = new Map(transactions.map(t => [t.id, t]));
  const patches = new Map<string, TransferLinkPatch>();

  for (const tx of transactions) {
    if (!tx.linkedTransactionId) continue;

    const counterpart = byId.get(tx.linkedTransactionId);
    if (!counterpart) continue;
    if (counterpart.linkedTransactionId === tx.id) continue;

    if (counterpart.linkedTransactionId) {
      const countersCounterpart = byId.get(counterpart.linkedTransactionId);
      if (countersCounterpart?.linkedTransactionId === counterpart.id) continue;
    }

    patches.set(counterpart.id, { linkedTransactionId: tx.id, transferAccountId: tx.accountId ?? '', category: 'Transfers' });
  }

  return patches;
}
