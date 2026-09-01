import { Budget, isLoanBackedKind, walletPaidAmount } from '@domain/models/budget';
import { isFinancialAccount } from '@domain/models/account';
import { Transaction } from '@domain/models/transaction';
import {
  AssistantSuggestionTemplate,
  SuggestionKind,
} from '../models/assistant-suggestion.model';
import {
  AssistantTaskKind,
  OperationalTaskTemplate,
} from '../models/assistant-task.model';
import {
  AssetEquityItem,
  ComparisonBar,
  CompositionSlice,
  RetrospectiveDay,
  SubscriptionItem,
  FinancialInsightTemplate,
} from '../models/financial-insight.model';
import { outlierExpenseIds } from '@domain/shared/outlier-transaction.utils';
import { detectRecurringIncome } from '@domain/shared/recurring-income.utils';
import {
  detectEmergencyFund,
  detectEssentialVsLifestyle,
  detectFixedCostRatio,
  detectSavingsRate,
} from './detectors/financial-health.detectors';
import {
  detectCategoryPressure,
  detectProjectRetrospective,
} from './detectors/budget-progress.detectors';
import { buildMonthlyNetFlow } from '@domain/shared/balance-average.utils';
import { computeSuggestedCategoryBudgetFromMovements } from '@domain/shared/budget-suggestion.utils';
import { classifyRecurringTransactions, RecurringClassification } from '@domain/shared/recurring-transaction-classifier';
import { isInvestmentCategory, isTransferCategory, isLegacyOrphanedCategory } from '@domain/shared/transfer.utils';
import { isUncategorized } from '@domain/shared/transaction-filter.utils';
import { normalizeDescription, hasConsistentAmount } from '@domain/shared/similar-transactions.utils';
import { sumExpenses, sumIncome, sumCategoryBudgets, totalPatrimonyOf } from '@domain/shared/financial-aggregation.utils';
import {
  filterTransactionsByPeriod,
  effectiveToday,
  recentWindow,
  periodProgressInDays,
  weeksIn,
} from '@domain/shared/transaction-period.utils';
import { formatDateLocal } from '@ibid/utils';
import {
  RecurringCandidate,
  SuggestionEngineParams,
  ICON_MAP,
  RECURRING_AMOUNT_TOLERANCE_RATIO,
  RECURRING_ASK_MAX_CONFIDENCE,
  RECURRING_CONFIRMED_CONFIDENCE,
  RECURRING_ASK_MIN_CONFIDENCE,
  MIN_SIGNIFICANT_UNBUDGETED_SPEND,
  MOVEMENTS_ROUTE,
  MIN_BALANCE_AVERAGE_MONTHS,
  DAYS_PER_WEEK,
  SUBSCRIPTION_SILENCE_DAYS,
  EMERGENCY_FUND_LOOKBACK_MONTHS,
  CATEGORY_PRESSURE_THRESHOLD,
  MAX_PRESSURE_BARS,
  RETROSPECTIVE_DAY_COUNT,
  OUTLIER_WINDOW_DAYS,
} from './suggestion-engine.types';
import { DEFAULT_INSIGHT_CONFIG, InsightCardKind } from './insight-config';

function spendingBeyondEnvelopes(
  transactions: readonly Transaction[],
  budgets: readonly Budget[],
  startDate: string,
  endDate: string
): number {
  const periodTxs = filterTransactionsByPeriod(transactions, startDate, endDate);

  const overProjects = budgets
    .filter(budget => budget.type === 'project')
    .reduce((sum, budget) => {
      const spent = sumExpenses(periodTxs.filter(t => t.budgetId === budget.id));
      return sum + Math.max(0, spent - budget.amount);
    }, 0);

  const overCategories = budgets
    .filter(budget => budget.type === 'category' && !!budget.categoryId)
    .reduce((sum, budget) => {
      const spent = sumExpenses(periodTxs.filter(t => t.category === budget.categoryId));
      return sum + Math.max(0, spent - budget.amount);
    }, 0);

  return Math.round((overProjects + overCategories) * 100) / 100;
}

function isEnabled(kind: InsightCardKind, params: SuggestionEngineParams): boolean {
  return params.config?.cards[kind]?.enabled ?? true;
}

function withConfig(params: SuggestionEngineParams): SuggestionEngineParams {
  return params.config ? params : { ...params, config: DEFAULT_INSIGHT_CONFIG };
}

export class SuggestionEngine {
  private readonly recurringClassificationCache = new WeakMap<
    readonly Transaction[],
    ReadonlyMap<string, RecurringClassification>
  >();

  private recurringClassificationsFor(transactions: readonly Transaction[]): ReadonlyMap<string, RecurringClassification> {
    const cached = this.recurringClassificationCache.get(transactions);
    if (cached) return cached;

    const classifications = classifyRecurringTransactions(transactions);
    this.recurringClassificationCache.set(transactions, classifications);
    return classifications;
  }

  buildOperationalTasks(rawParams: SuggestionEngineParams): readonly OperationalTaskTemplate[] {
    const params = withConfig(rawParams);

    const detectors = [
      this.detectNoAccounts,
      this.detectPendingTriage,
      this.detectUncategorized,
      this.detectCategoryNeedsBudget,
      this.detectDuplicateCharge,
      this.detectUnmatchedTransfer,
      this.detectVacationRecentlyEndedTask,
      this.detectConfirmRecurring,
      this.detectConfirmSalary,
      this.detectBrokerTransfer,
      this.detectBrokerIdleCash,
      this.detectStructuralSurplus,
      this.detectStaleAssetRevaluation,
      this.detectTargetProfitReached,
    ] as const;

    return detectors
      .map(detect => detect.call(this, params))
      .filter((s): s is OperationalTaskTemplate => s !== null)
      .filter(template => isEnabled(template.kind, params));
  }

  buildFinancialInsights(rawParams: SuggestionEngineParams): readonly FinancialInsightTemplate[] {
    const params = withConfig(rawParams);

    const detectors = [
      this.detectSafeToSpend,
      this.detectCategoryOverspendInsight,
      this.detectSpendingVelocity,
      this.detectGroceryForecast,
      this.detectVacationActiveInsight,
      this.detectActiveSubscriptions,
      this.detectBillIncrease,
      this.detectOutlierTransactionsInsight,
      this.detectPositiveSavingsInsight,
      this.detectBalanceAverage,
      this.detectPatrimonySplit,
      this.detectPropertyEquity,
      this.detectPortfolioIncome,
      detectSavingsRate,
      detectEssentialVsLifestyle,
      detectEmergencyFund,
      detectFixedCostRatio,
      detectCategoryPressure,
      detectProjectRetrospective,
    ] as const;

    return detectors
      .map(detect => detect.call(this, params))
      .filter((s): s is FinancialInsightTemplate => s !== null)
      .filter(template => isEnabled(template.kind, params));
  }

  buildSuggestions(rawParams: SuggestionEngineParams): readonly AssistantSuggestionTemplate[] {
    const params = withConfig(rawParams);

    const detectors = [
      this.detectNoAccountsSuggestion,
      this.detectVacationActive,
      this.detectVacationRecentlyEnded,
      this.detectPendingTriageSuggestion,
      this.detectUncategorizedSuggestion,
      this.detectOutlierTransactions,
      this.detectCategoryOverspend,
      this.detectRecurringExpense,
      this.detectCategoryNeedsBudgetSuggestion,
      this.detectPositiveSavings,
    ] as const;

    return detectors
      .map(detect => detect.call(this, params))
      .filter((s): s is AssistantSuggestionTemplate => s !== null)
      .filter(template => isEnabled(template.kind, params));
  }

  private detectNoAccountsSuggestion({ accounts }: SuggestionEngineParams): AssistantSuggestionTemplate | null {
    if (accounts.length > 0) return null;
    return this.build('no_accounts', {
      questionKey: 'assistantNoAccountsTitle',
      subtextKey: 'assistantNoAccountsBody',
      params: {},
      filter: null,
      route: null,
      action: 'open_add_entry',
    });
  }

  private detectPendingTriageSuggestion({ transactions }: SuggestionEngineParams): AssistantSuggestionTemplate | null {
    const count = transactions.filter(t => t.pendingReview).length;
    if (count === 0) return null;
    return this.build('pending_triage', {
      questionKey: count === 1 ? 'assistantPendingTriageOne' : 'assistantPendingTriageOther',
      subtextKey: 'assistantPendingTriageBody',
      params: { count },
      filter: { pendingReview: true },
      route: MOVEMENTS_ROUTE,
      action: null,
    });
  }

  private detectUncategorizedSuggestion({ transactions }: SuggestionEngineParams): AssistantSuggestionTemplate | null {
    const count = transactions.filter(isUncategorized).length;
    if (count === 0) return null;
    return this.build('uncategorized', {
      questionKey: count === 1 ? 'assistantUncategorizedOne' : 'assistantUncategorizedOther',
      subtextKey: 'assistantUncategorizedBody',
      params: { count },
      filter: { uncategorized: true },
      route: MOVEMENTS_ROUTE,
      action: null,
    });
  }

  private detectCategoryNeedsBudgetSuggestion({ transactions, budgets, categories }: SuggestionEngineParams): AssistantSuggestionTemplate | null {
    const budgetedCategoryIds = new Set(budgets.map(b => b.categoryId).filter((id): id is string => !!id));
    const categoryById = new Map(categories.map(c => [c.id, c]));

    const totalsByCategory = new Map<string, number>();
    for (const t of transactions) {
      if (t.amount >= 0 || isUncategorized(t) || budgetedCategoryIds.has(t.category)) continue;
      if (isTransferCategory(t.category) || isLegacyOrphanedCategory(t.category)) continue;
      const category = categoryById.get(t.category);
      if (category && isInvestmentCategory(category)) continue;
      totalsByCategory.set(t.category, (totalsByCategory.get(t.category) ?? 0) + Math.abs(t.amount));
    }

    const top = [...totalsByCategory.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!top || top[1] < MIN_SIGNIFICANT_UNBUDGETED_SPEND) return null;

    const [categoryId, amount] = top;
    return this.build('category_needs_budget', {
      questionKey: 'assistantNeedsBudgetTitle',
      subtextKey: 'assistantNeedsBudgetBody',
      params: { categoryId, amount },
      filter: { categoryId },
      route: '/budget',
      action: null,
    });
  }

  private detectNoAccounts({ accounts }: SuggestionEngineParams): OperationalTaskTemplate | null {
    if (accounts.length > 0) return null;
    return this.buildTask('no_accounts', {
      titleKey: 'assistantNoAccountsTitle',
      subtextKey: 'assistantNoAccountsBody',
      params: {},
      filter: null,
      route: null,
      action: 'open_add_entry',
    });
  }

  private detectPendingTriage({ transactions }: SuggestionEngineParams): OperationalTaskTemplate | null {
    const count = transactions.filter(t => t.pendingReview).length;
    if (count === 0) return null;
    return this.buildTask('pending_triage', {
      titleKey: count === 1 ? 'assistantPendingTriageOne' : 'assistantPendingTriageOther',
      subtextKey: 'assistantPendingTriageBody',
      params: { count },
      filter: { pendingReview: true },
      route: MOVEMENTS_ROUTE,
      action: null,
    });
  }

  private detectUncategorized({ transactions }: SuggestionEngineParams): OperationalTaskTemplate | null {
    const count = transactions.filter(isUncategorized).length;
    if (count === 0) return null;
    return this.buildTask('uncategorized', {
      titleKey: count === 1 ? 'assistantUncategorizedOne' : 'assistantUncategorizedOther',
      subtextKey: 'assistantUncategorizedBody',
      params: { count },
      filter: { uncategorized: true },
      route: MOVEMENTS_ROUTE,
      action: null,
    });
  }

  private detectCategoryNeedsBudget({ transactions, budgets, categories, startDate, endDate }: SuggestionEngineParams): OperationalTaskTemplate | null {
    const budgetedCategoryIds = new Set(budgets.map(b => b.categoryId).filter((id): id is string => !!id));
    const categoryById = new Map(categories.map(c => [c.id, c]));

    const periodTransactions = filterTransactionsByPeriod(transactions, startDate, endDate);

    const totalsByCategory = new Map<string, number>();
    for (const t of periodTransactions) {
      if (t.amount >= 0 || isUncategorized(t) || budgetedCategoryIds.has(t.category)) continue;
      if (isTransferCategory(t.category) || isLegacyOrphanedCategory(t.category)) continue;
      const category = categoryById.get(t.category);
      if (category && isInvestmentCategory(category)) continue;
      totalsByCategory.set(t.category, (totalsByCategory.get(t.category) ?? 0) + Math.abs(t.amount));
    }

    const top = [...totalsByCategory.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!top || top[1] < MIN_SIGNIFICANT_UNBUDGETED_SPEND) return null;

    const [categoryId, amount] = top;
    const catMovements = transactions
      .filter(t => t.category === categoryId && t.amount < 0)
      .map(t => ({ value: -t.amount, monthKey: t.date.slice(0, 7) }));
    const suggested = computeSuggestedCategoryBudgetFromMovements(catMovements);
    const suggestedAmount = Math.round(suggested.average > 0 ? suggested.average : amount);

    return this.buildTask('category_needs_budget', {
      titleKey: 'assistantNeedsBudgetTitle',
      subtextKey: 'assistantNeedsBudgetBody',
      params: { categoryId, amount, suggestedAmount },
      filter: { categoryId },
      route: '/budget',
      action: null,
    });
  }

  private detectDuplicateCharge({ transactions }: SuggestionEngineParams): OperationalTaskTemplate | null {
    const expenses = transactions.filter(t => t.amount < 0 && t.isDuplicate === undefined);
    const seen = new Map<string, Transaction[]>();

    for (const tx of expenses) {
      const key = `${normalizeDescription(tx.description)}_${Math.abs(tx.amount)}_${tx.accountId ?? ''}`;
      const list = seen.get(key);
      if (list) {
        const txTime = new Date(tx.date).getTime();
        const duplicate = list.find(prev => Math.abs(txTime - new Date(prev.date).getTime()) <= 2 * 24 * 60 * 60 * 1000);
        if (duplicate) {
          return this.buildTask('duplicate_charge', {
            titleKey: 'assistantDuplicateChargeTitle',
            subtextKey: 'assistantDuplicateChargeBody',
            params: { description: tx.description, amount: Math.abs(tx.amount), transactionId: tx.id },
            filter: { descriptionContains: tx.description },
            route: MOVEMENTS_ROUTE,
            action: 'open_reconcile_dialog',
            answer: {
              kind: 'confirm_duplicate',
              acceptLabelKey: 'assistantAnswerIsDuplicate',
              rejectLabelKey: 'assistantAnswerNotDuplicate',
            },
          });
        }
        list.push(tx);
      } else {
        seen.set(key, [tx]);
      }
    }
    return null;
  }

  private detectUnmatchedTransfer({ transactions }: SuggestionEngineParams): OperationalTaskTemplate | null {
    const transfers = transactions.filter(t => isTransferCategory(t.category));
    const unmatched = transfers.find(t => !t.linkedTransactionId);
    if (!unmatched) return null;

    return this.buildTask('unmatched_transfer', {
      titleKey: 'assistantUnmatchedTransferTitle',
      subtextKey: 'assistantUnmatchedTransferBody',
      params: { description: unmatched.description, amount: Math.abs(unmatched.amount), transactionId: unmatched.id },
      filter: { categoryId: unmatched.category },
      route: MOVEMENTS_ROUTE,
      action: 'open_reconcile_dialog',
      answer: {
        kind: 'confirm_transfer_link',
        acceptLabelKey: 'assistantAnswerLinkTransfer',
        rejectLabelKey: 'assistantAnswerNotTransfer',
      },
    });
  }

  private detectVacationRecentlyEndedTask({ budgets, transactions }: SuggestionEngineParams): OperationalTaskTemplate | null {
    const legacy = this.detectVacationRecentlyEnded({ budgets, transactions, accounts: [], categories: [], startDate: '', endDate: '' });
    if (!legacy) return null;
    return {
      id: legacy.id,
      kind: 'vacation_budget_ended',
      icon: ICON_MAP['vacation_budget_ended'],
      titleKey: legacy.questionKey,
      subtextKey: legacy.subtextKey,
      params: legacy.params,
      filter: legacy.filter,
      route: legacy.route,
      action: 'open_vacation_detail',
      answer: {
        kind: 'close_project',
        acceptLabelKey: 'assistantAnswerCloseProject',
        rejectLabelKey: 'assistantAnswerKeepProject',
      },
    };
  }

  private detectSafeToSpend({ transactions, budgets, startDate, endDate }: SuggestionEngineParams): FinancialInsightTemplate | null {
    if (transactions.length === 0 && budgets.length === 0) return null;

    const periodTxs = filterTransactionsByPeriod(transactions, startDate, endDate);
    const totalIncome = periodTxs.filter(t => t.amount > 0 && !isTransferCategory(t.category) && !isLegacyOrphanedCategory(t.category)).reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = sumExpenses(periodTxs);
    const targetBudget = sumCategoryBudgets(budgets);
    const availablePool = targetBudget > 0 ? targetBudget - totalExpenses : totalIncome - totalExpenses;
    if (availablePool <= 0) return null;

    const today = new Date();
    const end = endDate ? new Date(endDate) : new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const diffMs = Math.max(0, end.getTime() - today.getTime());
    const daysRemaining = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const weeksRemaining = weeksIn(daysRemaining, DAYS_PER_WEEK);
    const weeklySafeAmount = Math.round((availablePool / weeksRemaining) * 100) / 100;

    return {
      id: 'safe_to_spend',
      kind: 'safe_to_spend',
      visualArchetype: 'highlight_metric',
      icon: ICON_MAP['safe_to_spend'],
      titleKey: 'insightsSafeToSpendTitle',
      subtextKey: weeksRemaining === 1 ? 'insightsSafeToSpendLastWeek' : 'insightsSafeToSpendBody',
      params: { amount: weeklySafeAmount, weeksRemaining, daysRemaining },
      filter: null,
      route: '/budget',
      actionLabelKey: 'insightsActionViewBudget',
      action: null,
      payload: {
        value: weeklySafeAmount,
        labelKey: 'insightsSafeToSpendLabel',
        subtextKey: 'insightsSafeToSpendSubtext',
        isPositive: weeklySafeAmount > 0,
      },
    };
  }

  private detectCategoryOverspendInsight(params: SuggestionEngineParams): FinancialInsightTemplate | null {
    const periodTxs = filterTransactionsByPeriod(params.transactions, params.startDate, params.endDate);
    const overspentBudget = params.budgets.find(budget => {
      if (budget.type !== 'category' || !budget.categoryId) return false;
      const spent = sumExpenses(periodTxs.filter(t => t.category === budget.categoryId));
      return spent > budget.amount;
    });

    if (!overspentBudget || !overspentBudget.categoryId) return null;
    const spent = sumExpenses(periodTxs.filter(t => t.category === overspentBudget.categoryId));
    const overspendAmount = Math.round((spent - overspentBudget.amount) * 100) / 100;
    const percentageExceeded = Math.round((spent / overspentBudget.amount) * 100);

    return {
      id: `category_overspend_${overspentBudget.categoryId}`,
      kind: 'category_overspend',
      visualArchetype: 'overspend_alert',
      icon: ICON_MAP['category_overspend'],
      titleKey: 'assistantOverspendTitle',
      subtextKey: 'assistantOverspendBody',
      params: { name: overspentBudget.name, overspend: overspendAmount },
      filter: { categoryId: overspentBudget.categoryId, overspend: true },
      route: MOVEMENTS_ROUTE,
      action: null,
      payload: {
        categoryId: overspentBudget.categoryId,
        categoryName: overspentBudget.name,
        budgetAmount: overspentBudget.amount,
        spentAmount: spent,
        overspendAmount,
        percentageExceeded,
      },
    };
  }

  private detectSpendingVelocity({ transactions, budgets, startDate, endDate, spendableBalance, config }: SuggestionEngineParams): FinancialInsightTemplate | null {
    const periodTxs = filterTransactionsByPeriod(transactions, startDate, endDate);
    const totalExpenses = sumExpenses(periodTxs);
    const totalBudget = sumCategoryBudgets(budgets);

    const pastTxs = transactions.filter(t => t.date && t.date < startDate);
    const monthlyExpenses = new Map<string, number>();
    for (const t of pastTxs) {
      if (t.amount >= 0 || isTransferCategory(t.category) || isLegacyOrphanedCategory(t.category)) continue;
      const monthKey = t.date.slice(0, 7);
      monthlyExpenses.set(monthKey, (monthlyExpenses.get(monthKey) ?? 0) + Math.abs(t.amount));
    }
    const pastMonthsCount = monthlyExpenses.size;
    const historicalMonthlyAverage = pastMonthsCount > 0
      ? Array.from(monthlyExpenses.values()).reduce((sum, val) => sum + val, 0) / pastMonthsCount
      : 0;

    const paceDays = config?.windows.paceWindowDays ?? DAYS_PER_WEEK;
    const window = recentWindow(transactions, endDate, paceDays);
    const projectIds = new Set(budgets.filter(b => b.type === 'project').map(b => b.id));
    const currentWeeklyRate = sumExpenses(
      window.filter(t => !t.budgetId || !projectIds.has(t.budgetId))
    );
    if (currentWeeklyRate <= 0) return null;

    const envelopeOverspend = spendingBeyondEnvelopes(transactions, budgets, startDate, endDate);

    const plannedLimit = totalBudget > 0 ? totalBudget : historicalMonthlyAverage;
    const referenceLimit = spendableBalance === undefined
      ? plannedLimit
      : Math.min(plannedLimit, spendableBalance);
    if (referenceLimit <= 0) return null;

    const { elapsed: daysElapsed, total: daysInPeriod } = periodProgressInDays(startDate, endDate);
    const percentageTimeElapsed = Math.min(100, Math.round((daysElapsed / daysInPeriod) * 100));
    const percentageSpent = Math.round((totalExpenses / referenceLimit) * 100);

    const weeksInPeriod = weeksIn(daysInPeriod, paceDays);
    const recommendedWeeklyRate = Math.round((referenceLimit / weeksInPeriod) * 100) / 100;
    const daysRemaining = Math.max(0, daysInPeriod - daysElapsed);

    const paceRatio = currentWeeklyRate / recommendedWeeklyRate;
    const status: 'critical' | 'warning' | 'on_track' =
      paceRatio > 1.15 ? 'critical' : (paceRatio > 1 ? 'warning' : 'on_track');

    return {
      id: 'spending_velocity',
      kind: 'spending_velocity',
      visualArchetype: 'run_rate',
      icon: ICON_MAP['spending_velocity'],
      titleKey: 'insightsSpendingVelocityTitle',
      subtextKey: envelopeOverspend > 0
        ? 'insightsSpendingVelocityWithOverspend'
        : 'insightsSpendingVelocityBody',
      params: {
        currentRate: currentWeeklyRate,
        recommendedRate: recommendedWeeklyRate,
        spent: envelopeOverspend,
      },
      filter: null,
      route: MOVEMENTS_ROUTE,
      action: null,
      payload: {
        currentRate: currentWeeklyRate,
        recommendedRate: recommendedWeeklyRate,
        percentageSpent,
        percentageTimeElapsed,
        status,
        targetAmount: referenceLimit,
        spentAmount: totalExpenses,
        daysRemaining,
      },
    };
  }

  private detectGroceryForecast({ transactions, budgets, startDate, endDate }: SuggestionEngineParams): FinancialInsightTemplate | null {
    const groceryBudget = budgets.find(b => b.type === 'category' && (b.categoryId === 'groceries' || b.name.toLowerCase().includes('supermercado')));
    if (!groceryBudget) return null;

    const periodTxs = filterTransactionsByPeriod(transactions, startDate, endDate);
    const groceryTxs = periodTxs.filter(t => t.category === groceryBudget.categoryId || t.category === 'groceries');
    const spent = sumExpenses(groceryTxs);

    if (spent <= 0) return null;

    const { elapsed: daysElapsed, total: totalDays } = periodProgressInDays(startDate, endDate);
    const percentageTimeElapsed = Math.round((daysElapsed / totalDays) * 100);
    const percentageSpent = groceryBudget.amount > 0 ? Math.round((spent / groceryBudget.amount) * 100) : 0;
    const currentRate = Math.round((spent / daysElapsed) * DAYS_PER_WEEK * 100) / 100;
    const recommendedRate = Math.round((groceryBudget.amount / totalDays) * DAYS_PER_WEEK * 100) / 100;

    return {
      id: 'grocery_forecast',
      kind: 'grocery_forecast',
      visualArchetype: 'run_rate',
      icon: ICON_MAP['grocery_forecast'],
      titleKey: 'insightsGroceryForecastTitle',
      subtextKey: 'insightsGroceryForecastBody',
      params: { spent, target: groceryBudget.amount },
      filter: { categoryId: groceryBudget.categoryId },
      route: MOVEMENTS_ROUTE,
      action: null,
      payload: {
        currentRate,
        recommendedRate,
        percentageSpent,
        percentageTimeElapsed,
        status: percentageSpent > percentageTimeElapsed ? 'warning' : 'on_track',
        targetAmount: groceryBudget.amount,
        spentAmount: spent,
        daysRemaining: Math.max(0, totalDays - daysElapsed),
      },
    };
  }

  private detectVacationActiveInsight(params: SuggestionEngineParams): FinancialInsightTemplate | null {
    const legacy = this.detectVacationActive(params);
    if (!legacy) return null;

    const budgetId = legacy.params['budgetId'] as string;
    const activeVacationBudget = params.budgets.find(b => b.id === budgetId);
    if (!activeVacationBudget || !activeVacationBudget.projectStartDate || !activeVacationBudget.projectEndDate) return null;

    const start = new Date(activeVacationBudget.projectStartDate);
    const end = new Date(activeVacationBudget.projectEndDate);
    const today = new Date();

    const totalDurationMs = end.getTime() - start.getTime();
    const totalDays = Math.max(1, Math.ceil(totalDurationMs / (1000 * 60 * 60 * 24)));

    const elapsedDurationMs = today.getTime() - start.getTime();
    const elapsedDays = Math.max(1, Math.ceil(elapsedDurationMs / (1000 * 60 * 60 * 24)));

    const remainingDurationMs = end.getTime() - today.getTime();
    const daysRemaining = Math.max(0, Math.ceil(remainingDurationMs / (1000 * 60 * 60 * 24)));

    const percentageTimeElapsed = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
    const targetAmount = Number(legacy.params['target']) || 0;
    const spentAmount = Number(legacy.params['spent']) || 0;
    const percentageSpent = targetAmount > 0 ? Math.round((spentAmount / targetAmount) * 100) : 0;

    const currentRate = Math.round((spentAmount / elapsedDays) * 100) / 100;
    const recommendedRate = Math.round((targetAmount / totalDays) * 100) / 100;

    const status = percentageSpent > percentageTimeElapsed + 15 ? 'critical' : (percentageSpent > percentageTimeElapsed ? 'warning' : 'on_track');

    return {
      id: legacy.id,
      kind: 'vacation_budget_active',
      visualArchetype: 'run_rate',
      icon: ICON_MAP['vacation_budget_active'],
      titleKey: legacy.questionKey,
      subtextKey: legacy.subtextKey,
      params: legacy.params,
      filter: legacy.filter,
      route: legacy.route,
      action: legacy.action,
      payload: {
        currentRate,
        recommendedRate,
        percentageSpent,
        percentageTimeElapsed,
        status,
        targetAmount,
        spentAmount,
        daysRemaining,
      },
    };
  }

  private detectActiveSubscriptions({ transactions, config }: SuggestionEngineParams): FinancialInsightTemplate | null {
    const sortedTxs = [...transactions].filter(t => t.date).sort((a, b) => b.date.localeCompare(a.date));
    const referenceDate = sortedTxs.length > 0 ? new Date(sortedTxs[0].date) : new Date();
    const silenceDays = config?.windows.subscriptionSilenceDays ?? SUBSCRIPTION_SILENCE_DAYS;
    const autoClassifications = this.recurringClassificationsFor(transactions);

    const groups = new Map<string, Transaction[]>();
    for (const t of transactions) {
      if (t.amount >= 0) continue;
      const key = normalizeDescription(t.description);
      if (!key) continue;
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(t);
    }

    const items: SubscriptionItem[] = [];
    for (const txs of groups.values()) {
      const months = new Set(txs.map(t => t.date.slice(0, 7))).size;
      if (months >= 2 && hasConsistentAmount(txs, RECURRING_AMOUNT_TOLERANCE_RATIO)) {
        const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date));
        const latestTx = sorted[0];
        const latestTxDate = new Date(latestTx.date);
        const diffDays = (referenceDate.getTime() - latestTxDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > silenceDays) continue;

        if (latestTx.isRecurring === false) continue;
        const autoConfidence = autoClassifications.get(latestTx.id)?.confidence ?? 0;
        if (latestTx.isRecurring !== true && autoConfidence < RECURRING_CONFIRMED_CONFIDENCE) continue;

        items.push({
          description: txs[0].description,
          date: txs[0].date,
          amount: Math.abs(txs[0].amount),
          transactionId: latestTx.id,
          isRecurring: latestTx.isRecurring === true,
        });
      }
    }

    if (items.length === 0) return null;
    const totalAmount = Math.round(items.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;

    return {
      id: 'active_subscriptions',
      kind: 'active_subscriptions',
      visualArchetype: 'trend_table',
      icon: ICON_MAP['active_subscriptions'],
      titleKey: 'insightsActiveSubscriptionsTitle',
      subtextKey: items.length === 1 ? 'insightsActiveSubscriptionsOne' : 'insightsActiveSubscriptionsBody',
      params: { count: items.length, total: totalAmount },
      filter: { descriptionContains: items[0]?.description },
      route: MOVEMENTS_ROUTE,
      action: null,
      payload: {
        items,
        totalAmount,
        averageAmount: Math.round((totalAmount / items.length) * 100) / 100,
      },
    };
  }

  private detectBillIncrease({ transactions, config }: SuggestionEngineParams): FinancialInsightTemplate | null {
    const sortedTxs = [...transactions].filter(t => t.date).sort((a, b) => b.date.localeCompare(a.date));
    const referenceDate = sortedTxs.length > 0 ? new Date(sortedTxs[0].date) : new Date();
    const silenceDays = config?.windows.subscriptionSilenceDays ?? SUBSCRIPTION_SILENCE_DAYS;
    const autoClassifications = this.recurringClassificationsFor(transactions);

    const groups = new Map<string, Transaction[]>();
    for (const t of transactions) {
      if (t.amount >= 0) continue;
      const key = normalizeDescription(t.description);
      if (!key) continue;
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(t);
    }

    for (const txs of groups.values()) {
      if (txs.length < 2) continue;
      const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date));
      const latestTx = sorted[0];
      const latestTxDate = new Date(latestTx.date);
      const diffDays = (referenceDate.getTime() - latestTxDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > silenceDays) continue;

      const autoConfidence = autoClassifications.get(latestTx.id)?.confidence ?? 0;
      if (autoConfidence < RECURRING_CONFIRMED_CONFIDENCE) continue;

      const latest = Math.abs(sorted[0].amount);
      const previous = Math.abs(sorted[1].amount);
      if (previous > 20 && latest > previous * 1.15) {
        const changePercentage = Math.round(((latest - previous) / previous) * 100);
        return {
          id: `bill_increase_${sorted[0].id}`,
          kind: 'bill_increase',
          visualArchetype: 'trend_table',
          icon: ICON_MAP['bill_increase'],
          titleKey: 'insightsBillIncreaseTitle',
          subtextKey: 'insightsBillIncreaseBody',
          params: { description: sorted[0].description, change: changePercentage },
          filter: { descriptionContains: sorted[0].description },
          route: MOVEMENTS_ROUTE,
          action: null,
          payload: {
            items: [
              { description: sorted[0].description, date: sorted[0].date, amount: latest, changePercentage },
              { description: sorted[1].description, date: sorted[1].date, amount: previous },
            ],
            averageAmount: Math.round(((latest + previous) / 2) * 100) / 100,
          },
        };
      }
    }
    return null;
  }

  private detectOutlierTransactionsInsight(params: SuggestionEngineParams): FinancialInsightTemplate | null {
    const legacy = this.detectOutlierTransactions(params);
    if (!legacy) return null;

    const outlierIds = outlierExpenseIds(params.transactions);
    const anomalyDays = params.config?.windows.anomalyWindowDays ?? OUTLIER_WINDOW_DAYS;
    const recent = recentWindow(params.transactions, params.endDate, anomalyDays);
    const outliersInWindow = recent
      .filter(t => outlierIds.has(t.id))
      .sort((a, b) => b.date.localeCompare(a.date));

    if (outliersInWindow.length === 0) return null;

    const items = outliersInWindow.map(t => ({
      description: t.description,
      date: t.date,
      amount: Math.abs(t.amount),
    }));

    return {
      id: legacy.id,
      kind: 'outlier_transactions',
      visualArchetype: 'trend_table',
      icon: ICON_MAP['outlier_transactions'],
      titleKey: items.length === 1 ? 'assistantOutlierOne' : 'assistantOutlierOther',
      subtextKey: legacy.subtextKey,
      params: { count: items.length, change: anomalyDays },
      filter: legacy.filter,
      route: legacy.route,
      action: null,
      payload: {
        items,
      },
    };
  }

  private detectPositiveSavingsInsight(params: SuggestionEngineParams): FinancialInsightTemplate | null {
    const legacy = this.detectPositiveSavings(params);
    if (!legacy) return null;

    return {
      id: legacy.id,
      kind: 'positive_savings',
      visualArchetype: 'highlight_metric',
      icon: ICON_MAP['positive_savings'],
      titleKey: legacy.questionKey,
      subtextKey: legacy.subtextKey,
      params: legacy.params,
      filter: legacy.filter,
      route: legacy.route,
      action: null,
      payload: {
        value: Number(legacy.params['amount']) || 0,
        isPositive: true,
      },
    };
  }

  private detectVacationActive({ budgets, transactions }: SuggestionEngineParams): AssistantSuggestionTemplate | null {
    const todayStr = effectiveToday(transactions);

    const activeVacationBudget = budgets.find(b =>
      b.type === 'project' &&
      b.kind === 'vacation' &&
      !b.isClosed &&
      b.projectStartDate &&
      b.projectEndDate &&
      todayStr >= b.projectStartDate &&
      todayStr <= b.projectEndDate
    );

    if (!activeVacationBudget) return null;

    const atypicalExpenses = transactions.filter(t => {
      if (t.amount >= 0) return false;
      if (!t.date || t.date < activeVacationBudget.projectStartDate! || t.date > activeVacationBudget.projectEndDate!) return false;

      const key = normalizeDescription(t.description);
      if (!key) return false;

      const matchedMonths = new Set(
        transactions
          .filter(tx => tx.amount < 0 && normalizeDescription(tx.description) === key)
          .map(tx => tx.date.slice(0, 7))
      );

      return matchedMonths.size <= 1;
    });

    const totalSpent = atypicalExpenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      ...this.build('vacation_budget_active', {
        questionKey: 'assistantVacationBudgetActiveTitle',
        subtextKey: 'assistantVacationBudgetActiveBody',
        params: {
          name: activeVacationBudget.name,
          spent: totalSpent,
          target: activeVacationBudget.amount,
          budgetId: activeVacationBudget.id
        },
        filter: {
          startDate: activeVacationBudget.projectStartDate,
          endDate: activeVacationBudget.projectEndDate
        },
        route: '/movements',
        action: null,
      }),
      id: `vacation_budget_active_${activeVacationBudget.id}`
    };
  }

  private detectVacationRecentlyEnded({ budgets, transactions }: SuggestionEngineParams): AssistantSuggestionTemplate | null {
    const todayStr = formatDateLocal(new Date());

    const endedVacationBudget = budgets.find(b =>
      b.type === 'project' &&
      b.kind === 'vacation' &&
      !b.isClosed &&
      b.projectEndDate &&
      b.projectEndDate < todayStr
    );

    if (!endedVacationBudget) return null;

    const projectTxs = transactions.filter(t => {
      if (t.budgetId === endedVacationBudget.id) return true;
      if (endedVacationBudget.projectStartDate && endedVacationBudget.projectEndDate && t.date >= endedVacationBudget.projectStartDate && t.date <= endedVacationBudget.projectEndDate) return true;
      if (t.tags && t.tags.length > 0 && endedVacationBudget.tags && endedVacationBudget.tags.length > 0) {
        return t.tags.some(tag => endedVacationBudget.tags?.includes(tag));
      }
      return false;
    });

    const spent = projectTxs.reduce((sum, t) => sum + (t.amount < 0 ? -t.amount : 0), 0);
    const remaining = Math.max(0, endedVacationBudget.amount - spent);

    return {
      ...this.build('vacation_budget_ended', {
        questionKey: 'assistantVacationBudgetEndedTitle',
        subtextKey: 'assistantVacationBudgetEndedBody',
        params: {
          name: endedVacationBudget.name,
          remaining,
          budgetId: endedVacationBudget.id
        },
        filter: {
          startDate: endedVacationBudget.projectStartDate,
          endDate: endedVacationBudget.projectEndDate
        },
        route: '/movements',
        action: null,
      }),
      id: `vacation_budget_ended_${endedVacationBudget.id}`
    };
  }

  private detectOutlierTransactions({ transactions }: SuggestionEngineParams): AssistantSuggestionTemplate | null {
    const outlierCount = outlierExpenseIds(transactions).size;
    if (outlierCount === 0) return null;
    return this.build('outlier_transactions', {
      questionKey: outlierCount === 1 ? 'assistantOutlierOne' : 'assistantOutlierOther',
      subtextKey: 'assistantOutlierBody',
      params: { count: outlierCount },
      filter: { amountOutlier: true },
      route: MOVEMENTS_ROUTE,
      action: null,
    });
  }

  private detectCategoryOverspend({ transactions, budgets }: SuggestionEngineParams): AssistantSuggestionTemplate | null {
    const overspentBudget = budgets.find(budget => {
      if (!budget.categoryId) return false;
      const spent = sumExpenses(transactions.filter(t => t.category === budget.categoryId));
      return spent > budget.amount;
    });

    if (!overspentBudget) return null;
    return this.build('category_overspend', {
      questionKey: 'assistantOverspendTitle',
      subtextKey: 'assistantOverspendBody',
      params: { name: overspentBudget.name },
      filter: { categoryId: overspentBudget.categoryId, overspend: true },
      route: MOVEMENTS_ROUTE,
      action: null,
    });
  }

  private detectConfirmSalary({ transactions, config }: SuggestionEngineParams): OperationalTaskTemplate | null {
    const lookback = config?.windows.emergencyFundLookbackMonths ?? EMERGENCY_FUND_LOOKBACK_MONTHS;
    const group = detectRecurringIncome(transactions, lookback * 2);
    if (!group) return null;

    return this.buildTask('confirm_salary', {
      titleKey: 'assistantConfirmSalaryTitle',
      subtextKey: 'assistantConfirmSalaryBody',
      params: {
        amount: group.averageAmount,
        count: group.months,
        description: group.latest.description,
        transactionId: group.latest.id,
      },
      filter: { incomeOnly: true },
      route: MOVEMENTS_ROUTE,
      action: null,
      answer: {
        kind: 'confirm_salary',
        acceptLabelKey: 'assistantAnswerIsSalary',
        rejectLabelKey: 'assistantAnswerNotSalary',
      },
    });
  }

  private detectConfirmRecurring(params: SuggestionEngineParams): OperationalTaskTemplate | null {
    const candidate = this.recurringCandidate(params);
    if (!candidate) return null;

    return this.buildTask('confirm_recurring', {
      titleKey: 'assistantRecurringTitle',
      subtextKey: 'assistantRecurringBody',
      params: {
        description: candidate.description,
        count: candidate.months,
        amount: candidate.amount,
        transactionId: candidate.transactionId,
      },
      filter: { descriptionContains: candidate.description },
      route: MOVEMENTS_ROUTE,
      action: null,
      answer: {
        kind: 'confirm_recurring',
        acceptLabelKey: 'assistantAnswerIsRecurring',
        rejectLabelKey: 'assistantAnswerNotRecurring',
      },
    });
  }

  private detectBrokerTransfer({ transactions }: SuggestionEngineParams): OperationalTaskTemplate | null {
    const brokerKeywords = ['degiro', 'xtb', 'trading 212', 'interactive brokers', 'trade republic', 'revolut invest', 'etoro', 'binance', 'coinbase', 'kraken'];
    const candidates = transactions.filter(t =>
      t.amount < 0 &&
      !t.budgetId &&
      !t.linkedTransactionId &&
      brokerKeywords.some(kw => t.description.toLowerCase().includes(kw))
    );
    const candidate = candidates[0];
    if (!candidate) return null;

    return this.buildTask('broker_transfer', {
      titleKey: 'assistantBrokerTransferTitle',
      subtextKey: 'assistantBrokerTransferBody',
      params: {
        description: candidate.description,
        amount: Math.abs(candidate.amount),
        transactionId: candidate.id,
      },
      filter: { descriptionContains: candidate.description },
      route: '/portfolio',
      action: null,
      answer: {
        kind: 'associate_asset',
        acceptLabelKey: 'assistantAnswerAssociateAsset',
        rejectLabelKey: 'assistantAnswerOther',
      },
    });
  }

  private detectBrokerIdleCash({ accounts, transactions }: SuggestionEngineParams): OperationalTaskTemplate | null {
    const brokerAccounts = accounts.filter(isFinancialAccount).filter(a => a.type === 'investment');
    for (const acc of brokerAccounts) {
      const accTxs = transactions.filter(t => t.accountId === acc.id);
      const balance = (acc.openingBalance ?? 0) + accTxs.reduce((sum, t) => sum + t.amount, 0);
      if (balance > 50) {
        return this.buildTask('broker_idle_cash', {
          titleKey: 'assistantBrokerIdleCashTitle',
          subtextKey: 'assistantBrokerIdleCashBody',
          params: {
            name: acc.name,
            amount: balance,
            accountId: acc.id,
          },
          filter: null,
          route: '/portfolio',
          action: null,
          answer: {
            kind: 'broker_cash_policy',
            acceptLabelKey: 'assistantAnswerCountAsInvestment',
            rejectLabelKey: 'assistantAnswerCountAsFreeBalance',
          },
        });
      }
    }
    return null;
  }

  private detectStructuralSurplus({ transactions, budgets, startDate, endDate }: SuggestionEngineParams): OperationalTaskTemplate | null {
    const periodTxs = filterTransactionsByPeriod(transactions, startDate, endDate);
    const income = sumIncome(periodTxs);
    const expenses = sumExpenses(periodTxs);
    const budgeted = sumCategoryBudgets(budgets);
    const surplus = income - expenses - budgeted;
    if (surplus < 500) return null;

    return this.buildTask('structural_surplus', {
      titleKey: 'assistantStructuralSurplusTitle',
      subtextKey: 'assistantStructuralSurplusBody',
      params: {
        amount: Math.round(surplus),
      },
      filter: null,
      route: '/budget',
      action: null,
      answer: {
        kind: 'create_savings_goal',
        acceptLabelKey: 'assistantAnswerCreateGoal',
        rejectLabelKey: 'assistantAnswerKeepAvailable',
      },
    });
  }

  private detectStaleAssetRevaluation({ budgets }: SuggestionEngineParams): OperationalTaskTemplate | null {
    const physicalAssets = budgets.filter(b => b.type === 'investment' && (b.kind === 'house' || b.kind === 'car' || b.kind === 'other'));
    const oneYearAgoMs = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const stale = physicalAssets.find(a => !a.startDate || new Date(a.startDate).getTime() < oneYearAgoMs);
    if (!stale) return null;

    return this.buildTask('stale_asset_revaluation', {
      titleKey: 'assistantStaleAssetTitle',
      subtextKey: 'assistantStaleAssetBody',
      params: {
        name: stale.name,
        amount: stale.amount,
      },
      filter: null,
      route: '/portfolio',
      action: null,
      answer: {
        kind: 'confirm_asset_value',
        acceptLabelKey: 'assistantAnswerKeepValue',
        rejectLabelKey: 'assistantAnswerUpdateValue',
      },
    });
  }

  private detectTargetProfitReached({ budgets }: SuggestionEngineParams): OperationalTaskTemplate | null {
    const investmentAssets = budgets.filter(b => b.type === 'investment' && !b.isClosed);

    for (const asset of investmentAssets) {
      if (asset.amount <= 0) continue;

      const currentVal = asset.currentValue ?? asset.amount;
      const profitVal = currentVal - asset.amount;
      const profitPct = Math.round((profitVal / asset.amount) * 100);

      const targetPct = asset.targetProfitPct;
      const targetPrice = asset.targetPrice;

      const targetReached = (targetPct !== undefined && profitPct >= targetPct) ||
                            (targetPrice !== undefined && currentVal >= targetPrice);

      if (targetReached) {
        const displayTarget = targetPct ?? (targetPrice ? Math.round(((targetPrice - asset.amount) / asset.amount) * 100) : profitPct);
        return this.buildTask('target_profit_reached', {
          titleKey: 'assistantTargetProfitReachedTitle',
          subtextKey: 'assistantTargetProfitReachedBody',
          params: {
            name: asset.name,
            target: displayTarget,
            currentProfit: profitPct,
            amount: currentVal,
            budgetId: asset.id,
          },
          filter: null,
          route: '/portfolio',
          action: 'open_sell_simulator',
          answer: {
            kind: 'simulate_sell',
            acceptLabelKey: 'assistantAnswerSimulateSell',
            rejectLabelKey: 'assistantAnswerKeepPosition',
          },
        });
      }
    }
    return null;
  }

  private recurringCandidate({ transactions, config }: SuggestionEngineParams): RecurringCandidate | null {
    const sortedTxs = [...transactions].filter(t => t.date).sort((a, b) => b.date.localeCompare(a.date));
    const referenceDate = sortedTxs.length > 0 ? new Date(sortedTxs[0].date) : new Date();
    const silenceDays = config?.windows.subscriptionSilenceDays ?? SUBSCRIPTION_SILENCE_DAYS;
    const autoClassifications = this.recurringClassificationsFor(transactions);

    const groups = new Map<string, Transaction[]>();
    for (const t of transactions) {
      if (t.amount >= 0) continue;
      const key = normalizeDescription(t.description);
      if (!key) continue;
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(t);
    }

    let best: RecurringCandidate | null = null;
    for (const txs of groups.values()) {
      const months = new Set(txs.map(t => t.date.slice(0, 7))).size;
      if (months < 2 || !hasConsistentAmount(txs, RECURRING_AMOUNT_TOLERANCE_RATIO)) continue;

      const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date));
      const latestTx = sorted[0];
      const latestTxDate = new Date(latestTx.date);
      const diffDays = (referenceDate.getTime() - latestTxDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > silenceDays) continue;

      const classification = autoClassifications.get(latestTx.id);
      if (classification?.confirmedByOwner) continue;

      const autoConfidence = classification?.confidence ?? 0;
      if (autoConfidence < RECURRING_ASK_MIN_CONFIDENCE || autoConfidence >= RECURRING_ASK_MAX_CONFIDENCE) continue;

      if (!best || months > best.months) {
        best = {
          description: txs[0].description,
          months,
          amount: Math.abs(txs[0].amount),
          transactionId: latestTx.id,
        };
      }
    }

    return best;
  }

  private detectRecurringExpense(params: SuggestionEngineParams): AssistantSuggestionTemplate | null {
    const best = this.recurringCandidate(params);
    if (!best) return null;

    return this.build('recurring_expense', {
      questionKey: 'assistantRecurringTitle',
      subtextKey: 'assistantRecurringBody',
      params: { description: best.description, count: best.months, amount: best.amount },
      filter: { descriptionContains: best.description },
      route: MOVEMENTS_ROUTE,
      action: null,
    });
  }
  private detectPositiveSavings({ transactions, startDate, endDate }: SuggestionEngineParams): AssistantSuggestionTemplate | null {
    const periodTxs = filterTransactionsByPeriod(transactions, startDate, endDate);
    const income = periodTxs.filter(t => t.amount > 0 && !isTransferCategory(t.category) && !isLegacyOrphanedCategory(t.category)).reduce((s, t) => s + t.amount, 0);
    const expenses = sumExpenses(periodTxs);
    const savings = income - expenses;

    if (savings <= 0) return null;

    return this.build('positive_savings', {
      questionKey: 'assistantSavingsTitle',
      subtextKey: 'assistantSavingsBody',
      params: {
        amount: savings,
        income,
        expenses,
        startDate: startDate ?? '',
        endDate: endDate ?? '',
      },
      filter: startDate && endDate ? { startDate, endDate } : null,
      route: MOVEMENTS_ROUTE,
      action: null,
    });
  }

  private build(
    kind: SuggestionKind,
    payload: Pick<AssistantSuggestionTemplate, 'questionKey' | 'subtextKey' | 'params' | 'filter' | 'route' | 'action'>
  ): AssistantSuggestionTemplate {
    return { id: kind, kind, icon: ICON_MAP[kind] ?? 'wallet', ...payload };
  }

  private buildTask(
    kind: AssistantTaskKind,
    payload: Pick<OperationalTaskTemplate, 'titleKey' | 'subtextKey' | 'params' | 'filter' | 'route' | 'action' | 'answer'>
  ): OperationalTaskTemplate {
    return { id: kind, kind, icon: ICON_MAP[kind] ?? 'wallet', ...payload };
  }

  private detectBalanceAverage({ transactions, accounts }: SuggestionEngineParams): FinancialInsightTemplate | null {
    const series = {
      quarter: buildMonthlyNetFlow(transactions, accounts, 'quarter'),
      semester: buildMonthlyNetFlow(transactions, accounts, 'semester'),
      year: buildMonthlyNetFlow(transactions, accounts, 'year'),
      all: buildMonthlyNetFlow(transactions, accounts, 'all'),
    };

    if (series.all.length < MIN_BALANCE_AVERAGE_MONTHS) return null;

    const latest = series.all[series.all.length - 1];

    return {
      id: 'balance_average',
      kind: 'balance_average',
      visualArchetype: 'balance_average',
      icon: ICON_MAP['balance_average'],
      titleKey: 'insightsBalanceAverageTitle',
      subtextKey: 'insightsBalanceAverageBody',
      params: { amount: latest.averageNetFlow, balance: latest.realBalance },
      filter: null,
      route: MOVEMENTS_ROUTE,
      action: null,
      payload: { series },
    };
  }

  private detectPatrimonySplit({ patrimony }: SuggestionEngineParams): FinancialInsightTemplate | null {
    if (!patrimony) return null;

    const total = totalPatrimonyOf(patrimony);
    if (total <= 0 || patrimony.invested + patrimony.property <= 0) return null;

    return {
      id: 'patrimony_split',
      kind: 'patrimony_split',
      visualArchetype: 'composition',
      icon: ICON_MAP['patrimony_split'],
      titleKey: 'insightsPatrimonySplitTitle',
      subtextKey: 'insightsPatrimonySplitBody',
      params: { amount: patrimony.accessible, total },
      filter: null,
      route: '/portfolio',
      actionLabelKey: 'insightsActionViewPortfolio',
      action: null,
      payload: {
        total,
        unit: 'currency',
        slices: ([
          { labelKey: 'insightsSliceAccessible', amount: patrimony.accessible, tone: 'owned' },
          { labelKey: 'insightsSliceReserved', amount: patrimony.reserved, tone: 'committed' },
          { labelKey: 'insightsSliceInvested', amount: patrimony.invested, tone: 'committed' },
          { labelKey: 'insightsSliceProperty', amount: patrimony.property, tone: 'locked' },
        ] as readonly CompositionSlice[]).filter(slice => slice.amount > 0),
      },
    };
  }

  private detectPropertyEquity({ budgets, patrimony }: SuggestionEngineParams): FinancialInsightTemplate | null {
    const loanAssets = (budgets || []).filter(b => isLoanBackedKind(b.kind));

    if (loanAssets.length === 0) {
      if (!patrimony || patrimony.contractedInstalments <= 0) return null;
      const paid = Math.min(patrimony.paidInstalments, patrimony.contractedInstalments);
      const remaining = patrimony.contractedInstalments - paid;
      const paidPercentage = Math.round((paid / patrimony.contractedInstalments) * 100);

      return {
        id: 'property_equity',
        kind: 'property_equity',
        visualArchetype: 'composition',
        icon: ICON_MAP['property_equity'],
        titleKey: 'insightsPropertyEquityTitle',
        subtextKey: 'insightsPropertyEquityBody',
        params: {
          change: paidPercentage,
          count: paid,
          total: patrimony.contractedInstalments,
        },
        filter: null,
        route: '/portfolio',
        actionLabelKey: 'insightsActionViewPortfolio',
        action: null,
        payload: {
          total: patrimony.contractedInstalments,
          unit: 'count',
          slices: [
            { labelKey: 'insightsSliceInstalmentsPaid', amount: paid, tone: 'owned' },
            { labelKey: 'insightsSliceInstalmentsLeft', amount: remaining, tone: 'locked' },
          ] as readonly CompositionSlice[],
        },
      };
    }

    const items: AssetEquityItem[] = loanAssets.map(asset => {
      const debt = asset.outstandingDebt ?? 0;
      const paid = walletPaidAmount(asset);
      const total = paid + debt;
      const paidPercentage = total > 0 ? Math.round((paid / total) * 100) : 0;
      return {
        name: asset.name,
        kind: asset.kind ?? 'house',
        paidAmount: paid,
        outstandingDebt: debt,
        paidPercentage,
        debtPercentage: 100 - paidPercentage,
        paidInstalments: asset.paidInstalments,
        contractedInstalments: asset.contractedInstalments,
      };
    });

    const totalPaid = items.reduce((sum, i) => sum + i.paidAmount, 0);
    const totalDebt = items.reduce((sum, i) => sum + i.outstandingDebt, 0);
    const totalValue = totalPaid + totalDebt;
    if (totalValue <= 0) return null;

    const paidPercentage = Math.round((totalPaid / totalValue) * 100);
    const totalPaidInst = items.reduce((sum, i) => sum + (i.paidInstalments ?? 0), 0);
    const totalContractedInst = items.reduce((sum, i) => sum + (i.contractedInstalments ?? 0), 0);
    const assetsSummary = items.map(i => i.name).join(', ');

    return {
      id: 'property_equity',
      kind: 'property_equity',
      visualArchetype: 'composition',
      icon: ICON_MAP['property_equity'],
      titleKey: 'insightsPropertyEquityTitle',
      subtextKey: 'insightsPropertyEquityBody',
      params: {
        change: paidPercentage,
        paid: totalPaid,
        debt: totalDebt,
        count: totalPaidInst || (patrimony?.paidInstalments ?? 0),
        total: totalContractedInst || (patrimony?.contractedInstalments ?? 0),
        assetsSummary,
      },
      filter: null,
      route: '/portfolio',
      actionLabelKey: 'insightsActionViewPortfolio',
      action: null,
      payload: {
        total: totalValue,
        unit: 'currency',
        slices: [
          { labelKey: 'insightsSliceEquityOwned', amount: totalPaid, tone: 'owned' },
          { labelKey: 'insightsSliceEquityDebt', amount: totalDebt, tone: 'committed' },
        ] as readonly CompositionSlice[],
        items,
      },
    };
  }

  private detectPortfolioIncome({ patrimony }: SuggestionEngineParams): FinancialInsightTemplate | null {
    if (!patrimony || patrimony.receivedIncome <= 0) return null;

    return {
      id: 'portfolio_income',
      kind: 'portfolio_income',
      visualArchetype: 'highlight_metric',
      icon: ICON_MAP['portfolio_income'],
      titleKey: 'insightsPortfolioIncomeTitle',
      subtextKey: patrimony.firstIncomeDate
        ? 'insightsPortfolioIncomeSince'
        : 'insightsPortfolioIncomeBody',
      params: {
        amount: patrimony.receivedIncome,
        since: patrimony.firstIncomeDate ?? '',
      },
      filter: null,
      route: '/portfolio',
      actionLabelKey: 'insightsActionViewPortfolio',
      action: null,
      payload: {
        value: patrimony.receivedIncome,
        labelKey: 'insightsPortfolioIncomeLabel',
        isPositive: true,
      },
    };
  }

}
