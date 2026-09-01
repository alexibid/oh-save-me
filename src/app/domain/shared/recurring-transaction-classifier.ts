import { Transaction } from '@domain/models/transaction';
import { defaultSimilarityKeyword, matchesSimilarityKeyword } from '@domain/shared/similar-transactions.utils';
import { isRecurringExpenseCategory } from '@domain/shared/transfer.utils';
import { DEFAULT_INSIGHT_CONFIG } from '@domain/services/insight-config';

interface FeatureLikelihoods {
  readonly recurring: number;
  readonly nonRecurring: number;
}

type OccurrenceBin = 'low' | 'medium' | 'high';
type IntervalBin = 'monthly' | 'irregular' | 'unknown';
type VarianceBin = 'low' | 'medium' | 'high' | 'unknown';
type CategoryBin = 'fixed' | 'other';

export const RECURRING_CLASSIFIER_PRIOR = DEFAULT_INSIGHT_CONFIG.recurrence.priorProbability;

const OCCURRENCE_COUNT_LIKELIHOODS: Record<OccurrenceBin, FeatureLikelihoods> = {
  low: { recurring: 0.05, nonRecurring: 0.7 },
  medium: { recurring: 0.35, nonRecurring: 0.25 },
  high: { recurring: 0.6, nonRecurring: 0.05 }
};

const INTERVAL_REGULARITY_LIKELIHOODS: Record<IntervalBin, FeatureLikelihoods> = {
  monthly: { recurring: 0.75, nonRecurring: 0.1 },
  irregular: { recurring: 0.1, nonRecurring: 0.6 },
  unknown: { recurring: 0.15, nonRecurring: 0.3 }
};

const AMOUNT_VARIANCE_LIKELIHOODS: Record<VarianceBin, FeatureLikelihoods> = {
  low: { recurring: 0.65, nonRecurring: 0.2 },
  medium: { recurring: 0.25, nonRecurring: 0.35 },
  high: { recurring: 0.1, nonRecurring: 0.44 },
  unknown: { recurring: 0.15, nonRecurring: 0.3 }
};

const CATEGORY_LIKELIHOODS: Record<CategoryBin, FeatureLikelihoods> = {
  fixed: { recurring: 0.55, nonRecurring: 0.1 },
  other: { recurring: 0.45, nonRecurring: 0.9 }
};

function occurrenceBin(count: number): OccurrenceBin {
  if (count <= 1) return 'low';
  if (count <= 3) return 'medium';
  return 'high';
}

function averageIntervalDays(dates: readonly string[]): number | null {
  if (dates.length < 2) return null;
  const sorted = [...dates].sort();
  let totalGapDays = 0;
  for (let i = 1; i < sorted.length; i++) {
    totalGapDays += (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / (1000 * 3600 * 24);
  }
  return totalGapDays / (sorted.length - 1);
}

function intervalBin(avgDays: number | null): IntervalBin {
  if (avgDays === null) return 'unknown';
  return avgDays >= 24 && avgDays <= 36 ? 'monthly' : 'irregular';
}

function amountCoefficientOfVariation(amounts: readonly number[]): number | null {
  if (amounts.length < 2) return null;
  const abs = amounts.map(a => Math.abs(a));
  const mean = abs.reduce((sum, a) => sum + a, 0) / abs.length;
  if (mean === 0) return null;
  const variance = abs.reduce((sum, a) => sum + (a - mean) ** 2, 0) / abs.length;
  return Math.sqrt(variance) / mean;
}

function varianceBin(coefficientOfVariation: number | null): VarianceBin {
  if (coefficientOfVariation === null) return 'unknown';
  if (coefficientOfVariation < 0.05) return 'low';
  if (coefficientOfVariation < 0.15) return 'medium';
  return 'high';
}

export interface RecurringClassification {
  readonly isRecurring: boolean;
  readonly confidence: number;
  readonly confirmedByOwner: boolean;
}

function classifyCluster(transaction: Transaction, cluster: readonly Transaction[]): RecurringClassification {
  const occurrences = occurrenceBin(cluster.length);
  const interval = intervalBin(averageIntervalDays(cluster.map(t => t.date)));
  const variance = varianceBin(amountCoefficientOfVariation(cluster.map(t => t.amount)));
  const category: CategoryBin = isRecurringExpenseCategory(transaction.category) ? 'fixed' : 'other';

  const features: FeatureLikelihoods[] = [
    OCCURRENCE_COUNT_LIKELIHOODS[occurrences],
    INTERVAL_REGULARITY_LIKELIHOODS[interval],
    AMOUNT_VARIANCE_LIKELIHOODS[variance],
    CATEGORY_LIKELIHOODS[category]
  ];

  const logOddsPrior = Math.log(RECURRING_CLASSIFIER_PRIOR / (1 - RECURRING_CLASSIFIER_PRIOR));
  const logOdds = features.reduce((sum, f) => sum + Math.log(f.recurring / f.nonRecurring), logOddsPrior);
  const confidence = 1 / (1 + Math.exp(-logOdds));

  return { isRecurring: confidence > 0.5, confidence, confirmedByOwner: false };
}

function resolveRecurrence(
  transaction: Transaction,
  cluster: readonly Transaction[]
): RecurringClassification {
  if (transaction.isRecurring !== undefined) {
    return { isRecurring: transaction.isRecurring, confidence: 1, confirmedByOwner: true };
  }
  return classifyCluster(transaction, cluster);
}

export function classifyRecurringTransactions(allTransactions: readonly Transaction[]): ReadonlyMap<string, RecurringClassification> {
  const result = new Map<string, RecurringClassification>();
  const clusterCache = new Map<string, Transaction[]>();

  for (const transaction of allTransactions) {
    const keyword = defaultSimilarityKeyword(transaction.description);
    let cluster = clusterCache.get(keyword);
    if (!cluster) {
      cluster = allTransactions.filter(t => matchesSimilarityKeyword(t.description, keyword));
      clusterCache.set(keyword, cluster);
    }
    result.set(transaction.id, resolveRecurrence(transaction, cluster));
  }

  return result;
}
