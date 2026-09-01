import { Component, OnInit, Input, inject, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { useStore } from '@application/app-store';
import { BudgetProgress, BudgetSelectors } from '@application/selectors/budget.selectors';
import { Transaction } from '@domain/models/transaction';
import { TRANSACTION_LIST_SCHEMA } from '@domain/models/transaction-list-schema';
import { formatDateLocal } from '@ibid/utils';
import { I18N_SHARED, I18nService } from '@ui/shared/i18n-shared';
import { MovementsChartComponent } from '@ui/components/organisms/movements-chart/movements-chart';
import { TransactionsTableComponent } from '@ui/components/organisms/transactions-table/transactions-table';
import { CategoryAppliedEvent } from '@ui/components/organisms/category-recategorize/category-recategorize';
import { TransactionSumSelection } from '@ui/shared/transaction-sum-selection';
import { RecordColumnState } from '@ui/shared/record-column-state';
import { ActiveFilterChipsComponent, ActiveFilterChip } from '@ui/components/molecules/active-filter-chips/active-filter-chips';
import { buildActiveFilterChips } from '@ui/components/molecules/active-filter-chips/active-filter-chips.utils';
import { ColumnManagerPanelComponent } from '@ui/components/molecules/column-manager-panel/column-manager-panel';
import { interpolate } from '@domain/services/suggestion-resolver';
import { parseRouteQueryParams, injectParsedRouteFilters } from '@ui/shared/route-query.utils';
import { TransactionClassificationSelectors } from '@application/selectors/transaction-classification.selectors';
import { ConfirmRecurringExpenseUseCase } from '@application/use-cases/confirm-recurring-expense.use-case';
import { PerformanceMonitorService } from '@application/services/performance-monitor.service';
import { countsAsIncome } from '@domain/shared/essential-spending.utils';
import {
  ALL_FILTER_VALUE,
  NO_TRANSACTION_IDS,
  SpecialTransactionFilter,
  filterTransactions
} from '@domain/shared/transaction-filter.utils';
import { IconComponent, SelectComponent, SelectOption } from 'ibid-ui';

const SPECIAL_FILTER_LABEL_KEYS: Record<SpecialTransactionFilter, string> = {
  pending_review: 'movementsFilterPendingReview',
  uncategorized: 'movementsFilterUncategorized',
  outlier: 'movementsFilterOutlier',
  recurring: 'movementsFilterRecurring',
  income: 'movementsFilterIncome'
};

@Component({
  selector: 'ohsaveme-movements',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IconComponent,
    SelectComponent,
    MovementsChartComponent,
    TransactionsTableComponent,
    ActiveFilterChipsComponent,
    ColumnManagerPanelComponent,
    ...I18N_SHARED
  ],
  templateUrl: './movements.html',
  styleUrl: './movements.scss',
})
export class MovementsComponent implements OnInit {
  protected readonly store = useStore();
  protected readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly budgetSelectors = inject(BudgetSelectors);
  private readonly classifications = inject(TransactionClassificationSelectors);
  private readonly recurrence = inject(ConfirmRecurringExpenseUseCase);
  private readonly perfMonitor = inject(PerformanceMonitorService);

  @Input() accountId?: string;
  @Input() filter?: string;
  @Input() category?: string;
  @Input() categoryId?: string;
  @Input() projectId?: string;
  @Input() search?: string;
  @Input() overspend?: string;
  @Input() startDate?: string;
  @Input() endDate?: string;
  @Input() insightId?: string;

  protected readonly selectedAccount = signal<string>('all');
  protected readonly selectedAccountFilter = signal<string>('all');
  protected readonly selectedCategoryFilter = signal<string>('all');
  protected readonly selectedProjectFilter = signal<string>('all');
  protected readonly searchQuery = signal<string>('');
  protected readonly activeSpecialFilter = signal<SpecialTransactionFilter | null>(null);
  protected readonly showOverspendBanner = signal(false);

  protected readonly sumSelection = new TransactionSumSelection();
  protected readonly routeFilters = injectParsedRouteFilters(this.route);

  protected readonly isRecurringSelectionMode = computed(() => {
    return this.insightId === 'active_subscriptions'
      || this.activeSpecialFilter() === 'recurring'
      || this.routeFilters().insightId === 'active_subscriptions'
      || (!!this.routeFilters().insightId && !!this.routeFilters().search);
  });

  protected readonly selectedRecurringIds = computed<ReadonlySet<string>>(() => {
    const ids = new Set<string>();
    for (const t of this.store.transactions()) {
      if (t.isRecurring) {
        ids.add(t.id);
      }
    }
    return ids;
  });

  protected readonly columns = new RecordColumnState<Transaction>(TRANSACTION_LIST_SCHEMA, ['icon']);

  protected async onRecurringCheckboxToggle(txId: string): Promise<void> {
    const transaction = this.store.transactions().find(t => t.id === txId);
    if (!transaction) return;
    if (transaction.isRecurring) {
      await this.recurrence.reject(transaction);
    } else {
      await this.recurrence.confirm(transaction);
    }
  }

  constructor() {
    effect(() => {
      const accountFilter = this.selectedAccount();
      const categoryFilter = this.selectedCategoryFilter();
      const projectFilter = this.selectedProjectFilter();
      const specialFilter = this.activeSpecialFilter();
      const search = this.searchQuery().trim();
      const overspend = this.showOverspendBanner();

      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          accountId: accountFilter === ALL_FILTER_VALUE ? null : accountFilter,
          category: categoryFilter === ALL_FILTER_VALUE ? null : categoryFilter,
          categoryId: null,
          projectId: projectFilter === ALL_FILTER_VALUE ? null : projectFilter,
          filter: specialFilter ?? null,
          search: search ? search : null,
          overspend: overspend ? 'true' : null,
        },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    });
  }

  get lang() {
    return this.i18n.currentLang();
  }

  protected onAccountFilterChange(value: string) {
    this.selectedAccountFilter.set(value);
    this.selectedAccount.set(value);
  }

  protected onCategoryFilterChange(value: string) {
    this.selectedCategoryFilter.set(value);
  }

  protected onProjectFilterChange(value: string) {
    this.selectedProjectFilter.set(value);
  }

  private readonly overspentCategoryProgress = computed<BudgetProgress | null>(() => {
    if (!this.showOverspendBanner()) return null;
    const categoryId = this.selectedCategoryFilter();
    if (categoryId === 'all') return null;
    return this.budgetSelectors.categoryBudgetsProgress()
      .find(progress => progress.budget.categoryId === categoryId && progress.isOverBudget) ?? null;
  });

  protected readonly overspendBannerText = computed<string>(() => {
    const progress = this.overspentCategoryProgress();
    if (!progress) return '';
    return interpolate(this.i18n.translate('movementsOverspendBanner'), {
      name: progress.categoryName ?? progress.budget.name,
      amount: this.i18n.formatCurrency(Math.abs(progress.remaining))
    });
  });

  protected readonly accountFilterOptions = computed<SelectOption[]>(() =>
    this.withAllOption('movementsAccountAll', this.store.accounts().map(a => ({ value: a.id, label: a.name })))
  );

  protected readonly categoryFilterOptions = computed<SelectOption[]>(() =>
    this.withAllOption('movementsCategoryAll', this.store.categories().map(c => ({ value: c.id, label: this.i18n.getCategoryName(c.id) })))
  );

  protected readonly activeProjects = this.budgetSelectors.activeProjects;

  protected readonly projectFilterOptions = computed<SelectOption[]>(() =>
    this.withAllOption('movementsProjectAll', this.activeProjects().map(p => ({ value: p.id, label: p.name })))
  );

  protected readonly specialFilterOptions = computed<SelectOption[]>(() => [
    { value: ALL_FILTER_VALUE, label: this.i18n.translate('movementsFilterSpecialAll') },
    { value: 'pending_review', label: this.i18n.translate('movementsFilterPendingReviewOption') },
    { value: 'recurring', label: this.i18n.translate('movementsFilterRecurringOption') },
    { value: 'uncategorized', label: this.i18n.translate('movementsFilterUncategorizedOption') },
    { value: 'outlier', label: this.i18n.translate('movementsFilterOutlierOption') },
    { value: 'income', label: this.i18n.translate('movementsFilterIncomeOption') },
  ]);

  protected onSpecialFilterChange(value: string): void {
    this.activeSpecialFilter.set(value === ALL_FILTER_VALUE ? null : (value as SpecialTransactionFilter));
  }

  protected readonly availableAccounts = this.store.accounts;

  private withAllOption(allLabelKey: string, options: readonly SelectOption[]): SelectOption[] {
    return [{ value: ALL_FILTER_VALUE, label: this.i18n.translate(allLabelKey) }, ...options];
  }

  private readonly effectivePeriod = computed(() => {
    const route = this.routeFilters();
    return {
      start: route.startDate ?? this.store.startDate(),
      end: route.endDate ?? this.store.endDate()
    };
  });

  private readonly selectedProject = computed(() => {
    const projectFilter = this.selectedProjectFilter();
    return projectFilter === ALL_FILTER_VALUE ? undefined : this.activeProjects().find(p => p.id === projectFilter);
  });

  protected readonly accountAndSearchFiltered = computed(() => {
    const special = this.activeSpecialFilter();
    return filterTransactions(this.store.transactions(), {
      accountId: this.selectedAccount() !== ALL_FILTER_VALUE ? this.selectedAccount() : this.selectedAccountFilter(),
      categoryId: this.selectedCategoryFilter(),
      project: this.selectedProject(),
      projectEndDate: this.store.endDate(),
      isRecurring: this.classifications.isRecurring(),
      special,
      outlierIds: special === 'outlier' ? this.classifications.outlierExpenseIds() : NO_TRANSACTION_IDS,
      recurringIds: special === 'recurring' ? this.classifications.recurringExpenseIds() : NO_TRANSACTION_IDS,
      query: this.searchQuery()
    });
  });

  protected readonly specialFilterLabelKey = computed(() => {
    const special = this.activeSpecialFilter();
    return special ? SPECIAL_FILTER_LABEL_KEYS[special] : null;
  });

  protected clearSpecialFilter(): void {
    this.activeSpecialFilter.set(null);
  }

  protected toggleSpecialFilter(filter: SpecialTransactionFilter): void {
    this.activeSpecialFilter.set(this.activeSpecialFilter() === filter ? null : filter);
  }

  protected readonly filteredTransactions = computed(() => {
    const { start, end } = this.effectivePeriod();
    const records = this.accountAndSearchFiltered();
    if (start && end) {
      return records.filter(t => t.date >= start && t.date <= end);
    }
    if (start) {
      return records.filter(t => t.date >= start);
    }
    if (end) {
      return records.filter(t => t.date <= end);
    }
    return records;
  });

  protected readonly chartAsOfDate = computed(() => this.effectivePeriod().end);

  protected readonly chartWindowStart = computed(() => this.effectivePeriod().start);

  private readonly selectedCategory = computed(() => {
    const categoryFilter = this.selectedCategoryFilter();
    return categoryFilter === ALL_FILTER_VALUE ? undefined : this.store.categories().find(c => c.id === categoryFilter);
  });

  protected readonly activeFilterChips = computed<ActiveFilterChip[]>(() => {
    const category = this.selectedCategory();
    const accountFilter = this.selectedAccountFilter();
    const specialLabelKey = this.specialFilterLabelKey();
    return buildActiveFilterChips({
      specialFilter: specialLabelKey ? { label: this.i18n.translate(specialLabelKey) } : undefined,
      account: accountFilter === ALL_FILTER_VALUE ? undefined : this.store.accounts().find(a => a.id === accountFilter),
      category: category && { label: this.i18n.getCategoryName(category.id), color: category.color },
      project: this.selectedProject(),
      search: this.searchQuery().trim() || undefined,
      overspend: this.showOverspendBanner(),
      dateRange: this.startDate && this.endDate ? { start: this.startDate, end: this.endDate } : undefined
    });
  });

  protected onRemoveFilterChip(id: string): void {
    if (id === 'special') this.activeSpecialFilter.set(null);
    if (id === 'account') this.onAccountFilterChange(ALL_FILTER_VALUE);
    if (id === 'category') this.onCategoryFilterChange(ALL_FILTER_VALUE);
    if (id === 'project') this.onProjectFilterChange(ALL_FILTER_VALUE);
    if (id === 'search') this.searchQuery.set('');
    if (id === 'overspend') this.showOverspendBanner.set(false);
    if (id === 'dates') this.clearDateRange();
  }

  protected onClearAllFilterChips(): void {
    this.onAccountFilterChange(ALL_FILTER_VALUE);
    this.onCategoryFilterChange(ALL_FILTER_VALUE);
    this.onProjectFilterChange(ALL_FILTER_VALUE);
    this.activeSpecialFilter.set(null);
    this.searchQuery.set('');
    this.showOverspendBanner.set(false);
    this.clearDateRange();
  }

  private clearDateRange(): void {
    if (!this.startDate && !this.endDate) return;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { startDate: null, endDate: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
    this.startDate = undefined;
    this.endDate = undefined;
  }

  async ngOnInit() {
    this.route.queryParams.subscribe(rawParams => {
      const parsed = parseRouteQueryParams(rawParams);
      if (parsed.accountId) {
        this.selectedAccount.set(parsed.accountId);
        this.selectedAccountFilter.set(parsed.accountId);
      }
      if (parsed.category) {
        this.selectedCategoryFilter.set(parsed.category);
      }
      if (parsed.budgetId) {
        this.selectedProjectFilter.set(parsed.budgetId);
      }
      if (parsed.filter && parsed.filter in SPECIAL_FILTER_LABEL_KEYS) {
        this.activeSpecialFilter.set(parsed.filter as SpecialTransactionFilter);
      }
      if (parsed.search) {
        this.searchQuery.set(parsed.search);
      }
      if (rawParams['overspend'] !== undefined) {
        this.showOverspendBanner.set(rawParams['overspend'] === 'true');
      }
    });

    if (this.accountId) {
      this.selectedAccount.set(this.accountId);
      this.selectedAccountFilter.set(this.accountId);
    }
    const categoryFilter = this.category || this.categoryId;
    if (categoryFilter) {
      this.selectedCategoryFilter.set(categoryFilter);
    }
    if (this.projectId) {
      this.selectedProjectFilter.set(this.projectId);
    }
    if (this.filter && this.filter in SPECIAL_FILTER_LABEL_KEYS) {
      this.activeSpecialFilter.set(this.filter as SpecialTransactionFilter);
    }
    if (this.search) {
      this.searchQuery.set(this.search);
    }
    if (this.overspend !== undefined) {
      this.showOverspendBanner.set(this.overspend === 'true');
    }
    await this.perfMonitor.measureAsync('Carregar movimentos', () => this.store.loadInitialData());
  }

  protected async onCategoryApplied(event: CategoryAppliedEvent) {
    if (event.updatedTransactions.length > 0) {
      await this.store.applyTransactionCategories(event.updatedTransactions);
    }
    const cat = event.targetCategory ?? event.updatedTransactions[0]?.category;
    if (event.keyword && cat) {
      this.store.learnCategoryRule(event.keyword, cat);
    }
  }

  protected async onBudgetApplied(event: { transactionId: string; budgetId: string | undefined }) {
    const tx = this.store.transactions().find(t => t.id === event.transactionId);
    if (tx) {
      await this.store.updateTransactionBudget(tx, event.budgetId);
    }
  }

  protected async onIncomeToggle(tx: Transaction): Promise<void> {
    await this.store.updateTransactionIncomeInclusion(tx, !countsAsIncome(tx));
  }

  protected async onRecurringToggle(tx: Transaction): Promise<void> {
    const isRecurring = this.classifications.isRecurring()(tx);
    await (isRecurring
      ? this.recurrence.reject(tx)
      : this.recurrence.confirm(tx));
  }

  protected toggleSumSelectAll(selectAll: boolean): void {
    if (selectAll) {
      this.sumSelection.selectAll(this.filteredTransactions().map(t => t.id));
    } else {
      this.sumSelection.clear();
    }
  }

  protected isAllSumSelected(): boolean {
    return this.sumSelection.areAllSelected(this.filteredTransactions().map(t => t.id));
  }
}
