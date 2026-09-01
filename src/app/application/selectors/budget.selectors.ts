import { Injectable, computed, inject } from '@angular/core';
import { useStore } from '@application/app-store';
import { TransactionClassificationSelectors } from './transaction-classification.selectors';
import { I18nService } from '@application/i18n.service';
import { PerformanceMonitorService } from '@application/services/performance-monitor.service';
import { Budget } from '@domain/models/budget';
import { CategoryInfo } from '@domain/models/category';
import { FinancialAccount, isFinancialAccount } from '@domain/models/account';
import { calculateCashBalance, calculateInvestedValue } from '@domain/shared/investment-valuation';
import { isTransferCategory, isInvestmentCategory, isLegacyOrphanedCategory } from '@domain/shared/transfer.utils';
import { matchesProjectBudget, isLinkedToAnyActiveProject } from '@domain/shared/project-transaction.utils';
import { computeSuggestedCategoryBudget, computeSuggestedCategoryBudgetFromMovements, classifyOutliers, SuggestedCategoryBudget } from '@domain/shared/budget-suggestion.utils';
import { Transaction } from '@domain/models/transaction';
import { slugify } from '@ibid/utils';

export interface CategoryMonthBreakdown {
  readonly monthKey: string;
  readonly total: number;
  readonly isOutlier: boolean;
  readonly transactions: readonly Transaction[];
}

export interface AccountBalance {
  readonly account: FinancialAccount;
  readonly balance: number;
}

export interface AccountPeriodMetrics {
  readonly account: FinancialAccount;
  readonly walletBalance: number;
  readonly periodCashflow: number;
  readonly totalIncome: number;
  readonly totalExpenses: number;
  readonly lastUpdateDate: string;
  readonly periodStartDate: string;
  readonly periodEndDate: string;
}

export interface BudgetProgress {
  readonly budget: Budget;
  readonly spent: number;
  readonly percentage: number;
  readonly remaining: number;
  readonly isOverBudget: boolean;
  readonly categoryName?: string;
  readonly categoryColor?: string;
  readonly categoryIcon?: string;
  readonly status: 'active' | 'expired' | 'archived';
  readonly executionResult?: 'success' | 'warning' | 'danger';
  readonly monthlyAllocation?: number;
  readonly accumulatedReserve: number;
  readonly periodAllocation: number;
  readonly progressColor: string;
}

interface ProgressContext {
  readonly transactions: readonly Transaction[];
  readonly categories: readonly CategoryInfo[];
  readonly startDate: string;
  readonly endDate: string;
  readonly monthsInPeriod: number;
  readonly isRecurring: (t: Transaction) => boolean;
  readonly isProjectTransaction: (t: Transaction) => boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BudgetSelectors {
  private readonly store = useStore();
  private readonly i18n = inject(I18nService);
  private readonly classifications = inject(TransactionClassificationSelectors);
  private readonly performanceMonitor = inject(PerformanceMonitorService);

  readonly activeProjects = computed<readonly Budget[]>(() =>
    this.store.budgets().filter(b => b.type === 'project' && !b.isClosed)
  );

  readonly isProjectTransaction = computed<(t: Transaction) => boolean>(() => {
    const activeProjects = this.activeProjects();
    const endDate = this.store.endDate();
    const isRecurring = this.classifications.isRecurring();
    return (t: Transaction) => isLinkedToAnyActiveProject(t, activeProjects, endDate, isRecurring);
  });

  readonly budgetsProgress = computed<readonly BudgetProgress[]>(() => {
    return this.buildProgress(this.store.budgets());
  });

  readonly categoryBudgetsProgress = computed<readonly BudgetProgress[]>(() => {
    return this.budgetsProgress().filter(bp => bp.budget.type === 'category');
  });

  readonly projectBudgetsProgress = computed<readonly BudgetProgress[]>(() => {
    return this.budgetsProgress().filter(bp => bp.budget.type === 'project');
  });

  readonly categoryPeriodProgress = computed<readonly BudgetProgress[]>(() => {
    return this.budgetsProgressForPeriod().filter(bp => bp.budget.type === 'category');
  });

  readonly allCategoryExecutionsForPeriod = computed<readonly BudgetProgress[]>(() => {
    const budgeted = this.categoryPeriodProgress().filter(item => item.status === 'active');
    const budgetedCategoryIds = new Set(budgeted.map(item => item.budget.categoryId));

    const unbudgeted = this.store.categories()
      .filter(cat => !budgetedCategoryIds.has(cat.id) && !isTransferCategory(cat.id) && !isInvestmentCategory(cat))
      .map(cat => {
        const suggestion = this.suggestedBudgetAmount(cat.id);
        return suggestion.average > 0 ? this.categoryProgress(cat.id, Math.round(suggestion.average)) : null;
      })
      .filter((progress): progress is BudgetProgress => !!progress);

    return [...budgeted, ...unbudgeted];
  });

  readonly categoryRemainingReserve = computed<number>(() => {
    const items = this.categoryPeriodProgress();
    const totalTarget = items.reduce((sum, item) => sum + item.budget.amount, 0);
    const totalSpent = items.reduce((sum, item) => sum + item.spent, 0);
    return Math.round((totalTarget - totalSpent) * 100) / 100;
  });

  readonly categoryBudgetedTotal = computed<number>(() => {
    const total = this.allCategoryExecutionsForPeriod()
      .reduce((sum, item) => sum + item.budget.amount, 0);
    return Math.round(total * 100) / 100;
  });

  readonly categoryCommittedRemaining = computed<number>(() => {
    const total = this.allCategoryExecutionsForPeriod()
      .reduce((sum, item) => sum + Math.max(0, item.budget.amount - item.spent), 0);
    return Math.round(total * 100) / 100;
  });

  readonly categorySpentWithinBudget = computed<number>(() => {
    const total = this.allCategoryExecutionsForPeriod()
      .reduce((sum, item) => sum + Math.min(item.spent, item.budget.amount), 0);
    return Math.round(total * 100) / 100;
  });

  readonly categoryOverspendTotal = computed<number>(() => {
    const total = this.allCategoryExecutionsForPeriod()
      .reduce((sum, item) => sum + Math.max(0, item.spent - item.budget.amount), 0);
    return Math.round(total * 100) / 100;
  });

  readonly activeProjectReserve = computed<number>(() => {
    return this.budgetsProgressForPeriod()
      .filter(item => item.budget.type === 'project' && item.status === 'active')
      .reduce((sum, item) => sum + Math.max(0, item.accumulatedReserve - item.spent), 0);
  });

  readonly budgetsProgressForPeriod = computed<readonly BudgetProgress[]>(() => {
    const endDate = this.store.endDate();
    return this.budgetsProgress().filter(bp => !(bp.budget.startDate && endDate && bp.budget.startDate > endDate));
  });

  readonly accountBalances = computed<readonly AccountBalance[]>(() => {
    const filterEndDate = this.store.endDate();
    const allTxs = this.store.transactions();

    return this.store.accounts().filter(isFinancialAccount).map(account => {
      const openingBalance = account.openingBalance ?? 0;
      const accountTxs = allTxs.filter(t => t.accountId === account.id);
      if (accountTxs.length === 0) return { account, balance: openingBalance };

      const txsAsOfFilterEnd = filterEndDate
        ? accountTxs.filter(t => t.date <= filterEndDate)
        : accountTxs;

      if (account.type === 'investment') {
        const balance = calculateCashBalance(txsAsOfFilterEnd) + openingBalance + calculateInvestedValue(txsAsOfFilterEnd);
        return { account, balance: Math.round(balance * 100) / 100 };
      }

      const txsWithBalance = accountTxs.filter(t => t.balance !== undefined && t.balance !== null);

      let balance: number;
      if (txsWithBalance.length > 0) {
        const mostRecentDate = txsWithBalance.reduce((max, t) => t.date > max ? t.date : max, '');
        const onMostRecentDate = txsWithBalance.filter(t => t.date === mostRecentDate);
        const referenceBalance = onMostRecentDate.reduce((max, t) => t.balance! > max ? t.balance! : max, onMostRecentDate[0].balance!);
        balance = referenceBalance;
      } else {
        balance = openingBalance + accountTxs.reduce((sum, t) => sum + t.amount, 0);
      }

      if (filterEndDate) {
        const afterFilterSum = accountTxs
          .filter(t => t.date > filterEndDate)
          .reduce((sum, t) => sum + t.amount, 0);
        balance -= afterFilterSum;
      }

      return { account, balance: Math.round(balance * 100) / 100 };
    });
  });

  readonly walletBalance = computed<number>(() => {
    const total = this.accountBalances()
      .filter(a => a.account.type !== 'investment' || a.account.includeInConsolidatedBalance)
      .reduce((sum, a) => sum + a.balance, 0);
    return Math.round(total * 100) / 100;
  });

  readonly spendableBalance = computed<number>(() =>
    Math.round(Math.max(0, this.walletBalance() - this.activeProjectReserve()) * 100) / 100
  );

  readonly freeBalance = computed<number>(() =>
    Math.round(
      (this.walletBalance() - this.activeProjectReserve() - this.categoryCommittedRemaining()) * 100
    ) / 100
  );

  readonly investmentBalance = computed<number>(() => {
    const total = this.accountBalances()
      .filter(a => a.account.type === 'investment' && !a.account.includeInConsolidatedBalance)
      .reduce((sum, a) => sum + a.balance, 0);
    return Math.round(total * 100) / 100;
  });

  readonly accountPeriodMetrics = computed<readonly AccountPeriodMetrics[]>(() => {
    const startDate = this.store.startDate();
    const endDate = this.store.endDate();
    const allTxs = this.store.transactions();

    return this.accountBalances().map(({ account, balance }) => {
      const accountTxs = allTxs.filter(t => t.accountId === account.id);

      const txsAsOfFilterEnd = endDate ? accountTxs.filter(t => t.date <= endDate) : accountTxs;
      const lastUpdateDate = txsAsOfFilterEnd.reduce((max, t) => (t.date > max ? t.date : max), '');

      const periodTxs = accountTxs.filter(t => (!startDate || t.date >= startDate) && (!endDate || t.date <= endDate));
      const totalIncome = periodTxs.filter(t => t.amount > 0 && !isTransferCategory(t.category)).reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = periodTxs.filter(t => t.amount < 0 && !isTransferCategory(t.category)).reduce((sum, t) => sum + t.amount, 0);

      return {
        account,
        walletBalance: balance,
        periodCashflow: Math.round((totalIncome + totalExpenses) * 100) / 100,
        totalIncome: Math.round(totalIncome * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        lastUpdateDate,
        periodStartDate: startDate,
        periodEndDate: endDate
      };
    });
  });

  categoryMonthlySpend(categoryId: string): readonly number[] {
    const targetSlug = slugify(categoryId);
    const transactions = this.store.transactions().filter(t =>
      t.category === categoryId || (t.category && slugify(t.category) === targetSlug)
    );
    const netByMonth = new Map<string, number>();

    for (const t of transactions) {
      const monthKey = t.date.slice(0, 7);
      netByMonth.set(monthKey, (netByMonth.get(monthKey) ?? 0) + t.amount);
    }

    return Array.from(netByMonth.values())
      .map(net => (net < 0 ? -net : 0))
      .filter(spent => spent > 0);
  }

  suggestedBudgetAmount(categoryId: string): SuggestedCategoryBudget {
    const targetSlug = slugify(categoryId);
    const transactions = this.store.transactions().filter(t =>
      (t.category === categoryId || (t.category && slugify(t.category) === targetSlug)) && t.amount < 0
    );
    const movements = transactions.map(t => ({
      value: -t.amount,
      monthKey: t.date.slice(0, 7)
    }));
    return computeSuggestedCategoryBudgetFromMovements(movements);
  }

  categoryMonthlyBreakdown(categoryId: string): readonly CategoryMonthBreakdown[] {
    const targetSlug = slugify(categoryId);
    const transactions = this.store.transactions().filter(t =>
      t.category === categoryId || (t.category && slugify(t.category) === targetSlug)
    );
    const byMonth = new Map<string, Transaction[]>();

    for (const t of transactions) {
      const monthKey = t.date.slice(0, 7);
      const group = byMonth.get(monthKey) ?? [];
      group.push(t);
      byMonth.set(monthKey, group);
    }

    const monthKeys = Array.from(byMonth.keys()).sort();
    if (monthKeys.length === 0) return [];

    const totals = monthKeys.map(monthKey => {
      const txs = byMonth.get(monthKey)!;
      const net = txs.reduce((sum, t) => sum + t.amount, 0);
      const totalSpend = net < 0 ? -net : txs.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      return Math.round(totalSpend * 100) / 100;
    });
    const classified = classifyOutliers(totals);

    return monthKeys.map((monthKey, i) => ({
      monthKey,
      total: classified[i].value,
      isOutlier: classified[i].isOutlier,
      transactions: byMonth.get(monthKey)!
    }));
  }

  categoryBudgetProgress(categoryId: string): BudgetProgress | null {
    return this.budgetsProgress().find(bp => bp.budget.type === 'category' && bp.budget.categoryId === categoryId) ?? null;
  }

  categoryProgress(categoryId: string, amount: number): BudgetProgress {
    const budget: Budget = {
      id: `temp-${categoryId}`,
      name: this.i18n.getCategoryName(categoryId),
      type: 'category',
      categoryId,
      amount,
      isClosed: false
    };
    return this.buildBudgetProgress(budget, this.progressContext());
  }

  private readonly progressContext = computed<ProgressContext>(() => {
    const startDate = this.store.startDate();
    const endDate = this.store.endDate();
    const preset = this.store.preset?.() ?? '';

    let monthsInPeriod = 1;
    if (preset === 'current_month' || preset === 'last_month') {
      monthsInPeriod = 1;
    } else if (preset === 'quarter') {
      monthsInPeriod = 3;
    } else if (preset === 'semester') {
      monthsInPeriod = 6;
    } else if (preset === 'year') {
      monthsInPeriod = 12;
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffMs = Math.max(0, end.getTime() - start.getTime());
      const diffDays = Math.round(diffMs / (1000 * 3600 * 24));
      monthsInPeriod = Math.max(1, Math.round(diffDays / 30));
    }

    return {
      transactions: this.store.transactions(),
      categories: this.store.categories(),
      startDate,
      endDate,
      monthsInPeriod,
      isRecurring: this.classifications.isRecurring(),
      isProjectTransaction: this.isProjectTransaction(),
    };
  });

  private buildProgress(budgets: readonly Budget[]): readonly BudgetProgress[] {
    return this.performanceMonitor.measureSync('BudgetSelectors.buildProgress', () => {
      const context = this.progressContext();
      return budgets
        .filter(b => this.isEligibleBudget(b, context.categories))
        .map(b => this.buildBudgetProgress(b, context));
    });
  }

  private isEligibleBudget(b: Budget, categories: readonly CategoryInfo[]): boolean {
    if (b.type === 'investment') return false;
    if (b.type !== 'category' || !b.categoryId) return true;
    if (isTransferCategory(b.categoryId) || isLegacyOrphanedCategory(b.categoryId)) return false;
    const category = categories.find(c => c.id === b.categoryId);
    return !category || !isInvestmentCategory(category);
  }

  private buildBudgetProgress(b: Budget, context: ProgressContext): BudgetProgress {
    const { transactions, categories, startDate, endDate, monthsInPeriod, isRecurring, isProjectTransaction } = context;

    let spent = 0;
    if (b.type === 'category' && b.categoryId) {
      const activeTransactions = transactions.filter(t => t.date >= startDate && t.date <= endDate);
      const catTxs = activeTransactions.filter(t => t.category === b.categoryId && !isProjectTransaction(t));
      const netAmount = catTxs.reduce((sum, t) => sum + t.amount, 0);
      spent = netAmount < 0 ? -netAmount : 0;
    } else {
      const projectTxs = transactions.filter(t => matchesProjectBudget(t, b, endDate, isRecurring));
      const netAmount = projectTxs.reduce((sum, t) => sum + t.amount, 0);
      spent = netAmount < 0 ? -netAmount : 0;
    }

    let accumulatedReserve = 0;
    if (b.monthlyAllocation && b.monthlyAllocation > 0) {
      if (b.startDate) {
        const start = new Date(b.startDate);
        const analysisEnd = endDate ? new Date(endDate) : new Date();
        const end = b.endDate && new Date(b.endDate) < analysisEnd ? new Date(b.endDate) : analysisEnd;
        const yearsDiff = end.getFullYear() - start.getFullYear();
        const monthsDiff = end.getMonth() - start.getMonth();
        const months = Math.max(1, (yearsDiff * 12) + monthsDiff + 1);
        accumulatedReserve = months * b.monthlyAllocation;
      } else {
        accumulatedReserve = b.monthlyAllocation;
      }
    }

    let periodAllocation = 0;
    if (b.type === 'category') {
      periodAllocation = b.amount * monthsInPeriod;
    } else if (b.monthlyAllocation && b.monthlyAllocation > 0) {
      const projStartStr = b.startDate || startDate;
      const projEndStr = b.endDate || endDate;
      const startStr = projStartStr > startDate ? projStartStr : startDate;
      const endStr = projEndStr < endDate ? projEndStr : endDate;
      if (startStr <= endStr) {
        const start = new Date(startStr);
        const end = new Date(endStr);
        const yearsDiff = end.getFullYear() - start.getFullYear();
        const monthsDiff = end.getMonth() - start.getMonth();
        const months = Math.max(1, (yearsDiff * 12) + monthsDiff + 1);
        periodAllocation = months * b.monthlyAllocation;
      }
    }

    const targetAmount = b.type === 'category' ? periodAllocation : b.amount;

    const isExpired = b.kind === 'vacation' && b.projectEndDate
      ? b.projectEndDate <= endDate
      : (!!b.endDate && b.endDate <= endDate);
    const status = b.isClosed ? 'archived' : (isExpired ? 'expired' : 'active');

    const remaining = Math.round((targetAmount - spent) * 100) / 100;
    const isOverBudget = spent > targetAmount;
    const percentage = targetAmount > 0 ? (spent / targetAmount) * 100 : 0;

    let progressColor = '#10b981';
    if (percentage >= 85 && percentage <= 100) {
      progressColor = '#f59e0b';
    } else if (percentage > 100) {
      progressColor = '#ef4444';
    }

    let executionResult: 'success' | 'warning' | 'danger' | undefined;
    if (status === 'expired' || isOverBudget) {
      if (percentage <= 100) {
        executionResult = 'success';
      } else if (percentage <= 130) {
        executionResult = 'warning';
      } else {
        executionResult = 'danger';
      }
    }

    let categoryColor = '#3b82f6';
    let categoryName = b.name;
    let categoryIcon: string | undefined;

    if (b.type === 'category' && b.categoryId) {
      const category = categories.find(c => c.id === b.categoryId);
      categoryName = category ? this.i18n.getCategoryName(category.id) : b.name;
      categoryColor = category?.color || '#3b82f6';
      categoryIcon = category?.icon;
    }

    return {
      budget: b,
      spent,
      percentage,
      remaining,
      isOverBudget,
      categoryName,
      categoryColor,
      categoryIcon,
      status,
      executionResult,
      monthlyAllocation: b.monthlyAllocation,
      accumulatedReserve,
      periodAllocation,
      progressColor
    };
  }
}
