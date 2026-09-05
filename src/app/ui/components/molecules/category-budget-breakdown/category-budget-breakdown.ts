import { Component, Input, Output, EventEmitter, inject, computed, signal, effect } from '@angular/core';

import { BudgetSelectors } from '@application/selectors/budget.selectors';
import { useStore } from '@application/app-store';
import {
  computeAverageForSelection,
  classifyOutliers,
  SuggestedCategoryBudget
} from '../../../../domain/shared/budget-suggestion.utils';
import { Transaction } from '@domain/models/transaction';
import { I18N_SHARED, I18nService } from '@ui/shared/i18n-shared';
import { CurrencyDisplayComponent } from 'ibid-ui';

export interface MovementInclusionRow {
  readonly id: string;
  readonly date: string;
  readonly description: string;
  readonly amount: number;
  readonly monthKey: string;
  readonly monthLabel: string;
  readonly isOutlier: boolean;
  readonly included: boolean;
  readonly isOtherCategory?: boolean;
  readonly originalCategory?: string;
}

export interface CategoryBudgetExplanationMetrics {
  readonly historicalAverage: number;
  readonly recent6mAverage: number;
  readonly maxMonthTotal: number;
  readonly minMonthTotal: number;
  readonly recent6mBreakdown: readonly { monthKey: string; monthLabel: string; total: number }[];
  readonly totalMonthsAnalyzed: number;
}

import { TransactionsTableComponent } from '@ui/components/organisms/transactions-table/transactions-table';

export interface MovementInclusionRow {
  readonly id: string;
  readonly date: string;
  readonly description: string;
  readonly amount: number;
  readonly monthKey: string;
  readonly monthLabel: string;
  readonly isOutlier: boolean;
  readonly included: boolean;
  readonly isOtherCategory?: boolean;
  readonly originalCategory?: string;
}

export interface CategoryBudgetExplanationMetrics {
  readonly historicalAverage: number;
  readonly recent6mAverage: number;
  readonly maxMonthTotal: number;
  readonly minMonthTotal: number;
  readonly recent6mBreakdown: readonly { monthKey: string; monthLabel: string; total: number }[];
  readonly totalMonthsAnalyzed: number;
}

export type SortField = 'date' | 'description' | 'month' | 'amount' | 'included';
export type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'ohsaveme-category-budget-breakdown',
  standalone: true,
  imports: [CurrencyDisplayComponent, TransactionsTableComponent, ...I18N_SHARED],
  templateUrl: './category-budget-breakdown.html',
  styleUrl: './category-budget-breakdown.scss'
})
export class CategoryBudgetBreakdownComponent {
  @Input({ required: true }) categoryId!: string;
  @Input({ required: true }) categoryName!: string;

  @Output() readonly suggestionChange = new EventEmitter<SuggestedCategoryBudget>();

  protected readonly i18n = inject(I18nService);
  protected readonly budgetSelectors = inject(BudgetSelectors);
  protected readonly store = useStore();

  protected readonly searchQuery = signal('');
  protected readonly sortField = signal<SortField>('included');
  protected readonly sortDirection = signal<SortDirection>('asc');
  protected readonly expandedMonth = signal<string | null>(null);

  private readonly txOverrides = signal<ReadonlyMap<string, boolean>>(new Map());
  private readonly monthOverrides = signal<ReadonlyMap<string, boolean>>(new Map());

  protected readonly breakdown = computed(() => this.budgetSelectors.categoryMonthlyBreakdown(this.categoryId));

  protected readonly allMovements = computed<readonly MovementInclusionRow[]>(() => {
    const months = this.breakdown();
    const allTxs: { tx: Partial<Transaction>; monthKey: string; monthIsOutlier: boolean; amount: number }[] = [];
    for (const m of months) {
      if (!m.transactions || m.transactions.length === 0) {
        allTxs.push({
          tx: { id: `m-${m.monthKey}`, date: `${m.monthKey}-01`, description: m.monthKey },
          monthKey: m.monthKey,
          monthIsOutlier: m.isOutlier,
          amount: m.total
        });
      } else {
        for (const tx of m.transactions) {
          const val = typeof tx.amount === 'number' ? (tx.amount < 0 ? -tx.amount : tx.amount) : m.total;
          allTxs.push({
            tx,
            monthKey: m.monthKey,
            monthIsOutlier: m.isOutlier,
            amount: val
          });
        }
      }
    }

    const values = allTxs.map(item => item.amount);
    const classified = classifyOutliers(values);
    const txOverrides = this.txOverrides();
    const monthOverrides = this.monthOverrides();

    return allTxs.map((item, i) => {
      const tx = item.tx;
      const txId = tx.id || `tx-${i}`;
      const amount = item.amount;
      const isOutlier = item.monthIsOutlier || classified[i].isOutlier;

      const txOverride = txOverrides.get(txId);
      const monthOverride = monthOverrides.get(item.monthKey);
      let included: boolean;
      if (txOverride !== undefined) {
        included = txOverride;
      } else if (monthOverride !== undefined) {
        included = monthOverride;
      } else {
        included = !isOutlier;
      }

      return {
        id: txId,
        date: tx.date || `${item.monthKey}-01`,
        description: tx.description || item.monthKey,
        amount,
        monthKey: item.monthKey,
        monthLabel: this.formatMonthLabel(item.monthKey),
        isOutlier,
        included
      };
    });
  });

  protected readonly metrics = computed<CategoryBudgetExplanationMetrics>(() => {
    const movements = this.allMovements().filter(m => m.included);
    if (movements.length === 0) {
      return {
        historicalAverage: 0,
        recent6mAverage: 0,
        maxMonthTotal: 0,
        minMonthTotal: 0,
        recent6mBreakdown: [],
        totalMonthsAnalyzed: 0
      };
    }

    const byMonth = new Map<string, number>();
    for (const m of movements) {
      byMonth.set(m.monthKey, (byMonth.get(m.monthKey) ?? 0) + m.amount);
    }

    const monthKeys = Array.from(byMonth.keys()).sort();
    const totals = Array.from(byMonth.values());
    const totalSpend = totals.reduce((sum, v) => sum + v, 0);
    const historicalAverage = Math.round((totalSpend / Math.max(1, monthKeys.length)) * 100) / 100;

    const recentKeys = monthKeys.slice(-6);
    const recentSpend = recentKeys.reduce((sum, k) => sum + (byMonth.get(k) ?? 0), 0);
    const recent6mAverage = Math.round((recentSpend / Math.max(1, recentKeys.length)) * 100) / 100;

    const maxMonthTotal = Math.round(Math.max(...totals) * 100) / 100;
    const minMonthTotal = Math.round(Math.min(...totals) * 100) / 100;

    const recent6mBreakdown = recentKeys.map(k => ({
      monthKey: k,
      monthLabel: this.formatMonthLabel(k),
      total: Math.round((byMonth.get(k) ?? 0) * 100) / 100
    }));

    return {
      historicalAverage,
      recent6mAverage,
      maxMonthTotal,
      minMonthTotal,
      recent6mBreakdown,
      totalMonthsAnalyzed: monthKeys.length
    };
  });

  protected readonly otherCategoryMovements = computed<readonly MovementInclusionRow[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return [];

    const existingIds = new Set(this.allMovements().map(m => m.id));
    const allStoreTxs = this.store.transactions();

    return allStoreTxs
      .filter(t => !existingIds.has(t.id) && t.description.toLowerCase().includes(query))
      .map(t => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: Math.abs(t.amount),
        monthKey: t.date.slice(0, 7),
        monthLabel: this.formatMonthLabel(t.date.slice(0, 7)),
        isOutlier: false,
        included: false,
        isOtherCategory: true,
        originalCategory: t.category
      }));
  });

  protected readonly filteredMovements = computed<readonly MovementInclusionRow[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const movements = this.allMovements();
    let list = [...movements];

    if (query) {
      list = list.filter(m =>
        m.description.toLowerCase().includes(query) ||
        m.monthLabel.toLowerCase().includes(query) ||
        m.date.includes(query) ||
        m.amount.toString().includes(query)
      );

      const others = this.otherCategoryMovements();
      list = [...list, ...others];
    }

    const field = this.sortField();
    const mult = this.sortDirection() === 'asc' ? 1 : -1;

    return list.sort((a, b) => {
      if (field === 'included') {
        const incDiff = mult * ((a.included ? 1 : 0) - (b.included ? 1 : 0));
        if (incDiff !== 0) return incDiff;
        return b.date.localeCompare(a.date);
      }
      if (field === 'date') {
        return mult * a.date.localeCompare(b.date);
      }
      if (field === 'description') {
        return mult * a.description.localeCompare(b.description);
      }
      if (field === 'month') {
        return mult * a.monthKey.localeCompare(b.monthKey);
      }
      if (field === 'amount') {
        return mult * (a.amount - b.amount);
      }
      return 0;
    });
  });

  protected readonly categoryOptions = computed(() => this.store.categories());

  protected readonly transactionsForTable = computed<readonly Transaction[]>(() => {
    return this.filteredMovements().map(m => ({
      id: m.id,
      date: m.date,
      description: m.description,
      amount: m.amount,
      category: this.categoryId,
      type: 'debit' as const
    }));
  });

  protected readonly liveSuggestion = computed<SuggestedCategoryBudget>(() => {
    const movements = this.allMovements();
    if (movements.length === 0) {
      return { average: 0, includedMonths: 0, excludedOutlierMonths: 0 };
    }
    return computeAverageForSelection(
      movements.map(m => ({ value: m.amount, included: m.included, monthKey: m.monthKey }))
    );
  });

  constructor() {
    effect(() => this.suggestionChange.emit(this.liveSuggestion()));
  }

  protected toggleSort(field: SortField): void {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set(field === 'included' ? 'asc' : (field === 'amount' || field === 'date' ? 'desc' : 'asc'));
    }
  }

  protected onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }

  protected async assignToCategory(txId: string, event: Event): Promise<void> {
    event.stopPropagation();
    const tx = this.store.transactions().find(t => t.id === txId);
    if (!tx) return;
    await this.store.updateTransactionCategory(tx, this.categoryId);
  }

  protected formatMonthLabel(monthKey: string): string {
    const [year, month] = monthKey.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const locale = this.i18n.currentLang() === 'pt' ? 'pt-PT' : 'en-US';
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
  }

  protected toggleTxInclusion(txId: string, event: Event): void {
    event.stopPropagation();
    const tx = this.allMovements().find(m => m.id === txId);
    if (!tx) return;

    const nextTx = new Map(this.txOverrides());
    nextTx.set(txId, !tx.included);
    this.txOverrides.set(nextTx);
  }

  protected toggleMonth(monthKey: string): void {
    this.expandedMonth.set(this.expandedMonth() === monthKey ? null : monthKey);
  }

  protected isExpanded(monthKey: string): boolean {
    return this.expandedMonth() === monthKey;
  }

  protected isIncluded(monthKey: string): boolean {
    const movs = this.allMovements().filter(m => m.monthKey === monthKey);
    return movs.some(m => m.included);
  }

  protected toggleInclusion(monthKey: string, _event: Event): void {
    const movs = this.allMovements().filter(m => m.monthKey === monthKey);
    const currentlyIncluded = movs.some(m => m.included);
    const targetState = !currentlyIncluded;

    const nextMonth = new Map(this.monthOverrides());
    nextMonth.set(monthKey, targetState);
    this.monthOverrides.set(nextMonth);

    const nextTx = new Map(this.txOverrides());
    for (const m of movs) {
      nextTx.delete(m.id);
    }
    this.txOverrides.set(nextTx);
  }
}
