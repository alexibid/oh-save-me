import { Transaction } from '@domain/models/transaction';
import { classifyOutliers } from './budget-suggestion.utils';
import { DEFAULT_INSIGHT_CONFIG } from '@domain/services/insight-config';
import { isLegacyOrphanedCategory, isTransferCategory } from './transfer.utils';

const MIN_RATIO_TO_TYPICAL = DEFAULT_INSIGHT_CONFIG.thresholds.anomalyMultipleOfCategoryMedian;

export function outlierExpenseIds(transactions: readonly Transaction[]): ReadonlySet<string> {
  const ids = new Set<string>();

  for (const expenses of groupExpensesByCategory(transactions).values()) {
    for (const expense of unusuallyLargeExpenses(expenses)) {
      ids.add(expense.id);
    }
  }

  return ids;
}

function groupExpensesByCategory(
  transactions: readonly Transaction[]
): ReadonlyMap<string, readonly Transaction[]> {
  const groups = new Map<string, Transaction[]>();

  for (const transaction of transactions) {
    if (transaction.amount >= 0) continue;
    if (isTransferCategory(transaction.category)) continue;
    if (isLegacyOrphanedCategory(transaction.category)) continue;

    const group = groups.get(transaction.category);
    if (group) {
      group.push(transaction);
    } else {
      groups.set(transaction.category, [transaction]);
    }
  }

  return groups;
}

function unusuallyLargeExpenses(expenses: readonly Transaction[]): readonly Transaction[] {
  const magnitudes = expenses.map(expense => Math.log(Math.abs(expense.amount)));
  const classified = classifyOutliers(magnitudes);
  const noticeablyLarge = median(magnitudes) + Math.log(MIN_RATIO_TO_TYPICAL);

  return expenses.filter(
    (_, index) => classified[index].isOutlier && magnitudes[index] > noticeablyLarge
  );
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}
