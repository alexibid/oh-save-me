import { Component, ElementRef, computed, inject, signal, viewChild, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CsvParserService, ColumnMapping } from '@application/csv-parser.service';
import { CategoryMlService } from '@application/services/category-ml.service';
import { Transaction } from '@domain/models/transaction';
import { CategoryInfo } from '@domain/models/category';
import { AccountType } from '@domain/models/account';
import { TRANSACTION_REPOSITORY_TOKEN, CATEGORY_REPOSITORY_TOKEN } from '@application/tokens';
import { I18N_SHARED, I18nService } from '@ui/shared/i18n-shared';
import { BudgetSelectors, BudgetProgress } from '@application/selectors/budget.selectors';
import { PortfolioSelectors } from '@application/selectors/portfolio.selectors';
import { useStore } from '@application/app-store';
import { MetricsGridComponent } from '@ui/components/organisms/metrics-grid/metrics-grid';
import { DashboardInsightsComponent } from '@ui/components/organisms/dashboard-insights/dashboard-insights';
import { TransactionsTableComponent } from '@ui/components/organisms/transactions-table/transactions-table';
import { CategoryCreateDialogComponent } from '@ui/components/organisms/category-create-dialog/category-create-dialog';
import { AccountSummaryCardComponent } from '@ui/components/molecules/account-summary-card/account-summary-card';
import { BudgetSummaryRowComponent } from '@ui/components/molecules/budget-summary-row/budget-summary-row';
import { isTransferCategory } from '@domain/shared/transfer.utils';
import { CategoryAppliedEvent } from '@ui/components/organisms/category-recategorize/category-recategorize';
import { BudgetActionsBanner } from '@ui/components/organisms/budget-actions-banner/budget-actions-banner';
import { ShareAccessManagerComponent } from '@ui/components/organisms/share-access-manager/share-access-manager';
import { BottomSheetDialogComponent, CurrencyExplanationRow } from 'ibid-ui';

@Component({
  selector: 'ohsaveme-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MetricsGridComponent,
    DashboardInsightsComponent,
    TransactionsTableComponent,
    CategoryCreateDialogComponent,
    AccountSummaryCardComponent,
    BudgetSummaryRowComponent,
    BudgetActionsBanner,
    ShareAccessManagerComponent,
    BottomSheetDialogComponent,
    ...I18N_SHARED
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  public readonly showShareModal = signal<boolean>(false);
  public readonly selectedAccountIdForShare = signal<string | null>(null);
  private readonly csvParser = inject(CsvParserService);
  private readonly mlService = inject(CategoryMlService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  @Input() focusInsight?: string;

  private readonly insightsSection = viewChild('insightsSection', { read: ElementRef });
  protected readonly store = useStore();
  private readonly repository = inject(TRANSACTION_REPOSITORY_TOKEN);
  private readonly categoryRepository = inject(CATEGORY_REPOSITORY_TOKEN);

  protected readonly i18n = inject(I18nService);

  protected readonly categoryOptions = this.store.categories;
  protected readonly transactions = this.store.transactions;

  protected readonly showCreateCategoryDialog = signal<boolean>(false);

  protected readonly budgetSelectors = inject(BudgetSelectors);
  private readonly portfolioSelectors = inject(PortfolioSelectors);

  protected readonly totalPatrimony = computed<number>(() => this.portfolioSelectors.totalPatrimony());
  protected readonly investedValue = computed<number>(() => this.portfolioSelectors.investedValue());
  protected readonly assetsValue = computed<number>(() => this.portfolioSelectors.assetsValue());

  protected readonly budgetLimit = computed<number>(() => this.totalActiveLimit());

  private subscriptions: Subscription[] = [];

  protected readonly maxAvailableDate = this.store.maxAvailableDate;

  protected readonly filteredTransactions = computed(() => {
    const all = this.transactions();
    if (all.length === 0) return [];

    const startStr = this.store.startDate();
    const endStr = this.store.endDate();

    if (!startStr || !endStr) return [...all];

    return [...all]
      .filter(t => t.date >= startStr && t.date <= endStr)
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  });

  protected readonly periodStart = computed(() => {
    const txs = this.filteredTransactions();
    if (txs.length === 0) return '';
    return txs[txs.length - 1].date;
  });

  protected readonly periodEnd = computed(() => {
    const txs = this.filteredTransactions();
    if (txs.length === 0) return '';
    return txs[0].date;
  });

  protected readonly totalIncome = computed(() => {
    return this.filteredTransactions()
      .filter(t => t.amount > 0 && !isTransferCategory(t.category))
      .reduce((acc, t) => acc + t.amount, 0);
  });

  protected readonly totalExpenses = computed(() => {
    return this.filteredTransactions()
      .filter(t => t.amount < 0 && !isTransferCategory(t.category))
      .reduce((acc, t) => acc + t.amount, 0);
  });

  protected readonly startingBalance = computed(() => {
    const txs = this.filteredTransactions();
    if (txs.length === 0) return 0;
    const oldestTx = txs[txs.length - 1];
    return (oldestTx.balance !== undefined && oldestTx.balance !== null)
      ? oldestTx.balance - oldestTx.amount
      : 0;
  });

  protected readonly endingBalance = computed(() => {
    const txs = this.filteredTransactions();
    if (txs.length === 0) return 0;
    const newestTx = txs[0];
    return newestTx.balance !== undefined && newestTx.balance !== null ? newestTx.balance : 0;
  });

  protected readonly balance = computed(() => {
    return this.totalIncome() + this.totalExpenses();
  });

  protected readonly newestTransactionDate = computed(() => {
    const txs = this.filteredTransactions();
    if (txs.length === 0) return '';
    return txs[0].date;
  });

  protected readonly oldestTransactionDate = computed(() => {
    const txs = this.filteredTransactions();
    if (txs.length === 0) return '';
    return txs[txs.length - 1].date;
  });

  get lang(): string {
    return this.i18n.currentLang();
  }

  protected getAccountTypeLabel(type: AccountType): string {
    const labels: Record<AccountType, string> = {
      bank_account: this.i18n.translate('accountTypeBankAccount'),
      credit_card: this.i18n.translate('accountTypeCreditCard'),
      meal_card: this.i18n.translate('accountTypeMealCard'),
      investment: this.i18n.translate('accountTypeInvestment')
    };
    return labels[type];
  }

  protected readonly allBudgetsProgress = computed(() => this.budgetSelectors.budgetsProgress());
  protected readonly periodBudgetsProgress = computed(() =>
    this.budgetSelectors.budgetsProgressForPeriod()
  );

  private readonly activeSpendingBudgets = computed(() =>
    this.periodBudgetsProgress().filter(item => item.status === 'active')
  );

  protected readonly totalActiveAccumulatedReserve = computed<number>(() => {
    return this.budgetSelectors.activeProjectReserve();
  });

  protected readonly totalActiveSpent = computed<number>(() => {
    return this.activeSpendingBudgets().reduce((sum, item) => sum + item.spent, 0);
  });

  protected readonly totalActiveLimit = computed<number>(() => {
    return this.activeSpendingBudgets().reduce((sum, item) => sum + item.budget.amount, 0);
  });

  protected readonly totalActiveMonthlyAllocation = computed<number>(() => {
    return this.activeSpendingBudgets().reduce((sum, item) => sum + (item.budget.monthlyAllocation || 0), 0);
  });

  protected readonly totalWalletBalance = computed<number>(() => this.budgetSelectors.walletBalance());
  protected readonly totalWalletBalanceExplanation = computed<readonly CurrencyExplanationRow[]>(() =>
    this.budgetSelectors.accountBalances()
      .filter(a => a.account.type !== 'investment' || a.account.includeInConsolidatedBalance)
      .map(a => ({ label: a.account.name, value: this.i18n.formatCurrency(a.balance) }))
  );
  protected readonly investmentBalance = computed<number>(() => this.budgetSelectors.investmentBalance());
  protected readonly accountBalances = computed(() => this.budgetSelectors.accountBalances());
  protected readonly accountPeriodMetrics = computed(() => this.budgetSelectors.accountPeriodMetrics());

  protected readonly freeBalance = computed<number>(() => this.budgetSelectors.freeBalance());
  protected readonly categoryCommittedRemaining = computed<number>(() => this.budgetSelectors.categoryCommittedRemaining());

  protected readonly freeBalanceWithInvestments = computed<number>(() =>
    this.freeBalance() + this.investmentBalance()
  );

  protected readonly budgetPercent = computed<number>(() => {
    const totalLimit = this.totalActiveLimit();
    if (totalLimit <= 0) return 0;
    return Math.round((this.totalActiveSpent() / totalLimit) * 100);
  });

  async ngOnInit() {
    try {

      await this.store.loadInitialData();

      this.subscriptions.push(
        this.store.resetImports$.subscribe(() => this.onResetImports()),
        this.store.cycleStartDayChange$.subscribe(day => this.onCycleStartDayChange(day))
      );
    } catch (err) {
      console.error('[DashboardComponent] Failed to load transactions:', err);
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  onInsightFocusApplied(): void {
    this.scrollInsightsIntoView();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { focusInsight: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private scrollInsightsIntoView(): void {
    const section = this.insightsSection()?.nativeElement as HTMLElement | undefined;
    if (typeof section?.scrollIntoView !== 'function') return;

    requestAnimationFrame(() =>
      section.scrollIntoView({ behavior: 'smooth', block: 'center' })
    );
  }

  onCycleStartDayChange(day: number) {
    this.store.setCycleStartDay(day);
  }

  onBudgetRowClick(): void {
    this.router.navigate(['/budget']);
  }

  onNewBudgetDashboard(): void {
    this.router.navigate(['/budget'], { queryParams: { new: 'true' } });
  }

  async onCategoryApplied(event: CategoryAppliedEvent) {
    const { updatedTransactions, keyword, targetCategory } = event;
    const cat = targetCategory ?? updatedTransactions[0]?.category;
    if (keyword && cat) {
      this.mlService.learn(keyword, cat);
    }

    if (updatedTransactions.length > 0) {
      await this.store.applyTransactionCategories(updatedTransactions);
    }
  }

  async onCategoryCreated(newCategory: CategoryInfo) {
    this.showCreateCategoryDialog.set(false);
    try {
      await this.categoryRepository.save(newCategory);
      const cats = await this.categoryRepository.getAll();
      this.store.setCategories([...cats]);
    } catch (err) {
      console.error('[DashboardComponent] Failed to save custom category:', err);
    }
  }

  onManageSharing(accountId: string): void {
    this.selectedAccountIdForShare.set(accountId);
    this.showShareModal.set(true);
  }

  async onResetImports() {
    if (confirm(this.i18n.translate('resetConfirm'))) {
      try {
        await this.repository.clear();
        this.store.setTransactions([]);
        localStorage.removeItem('imported_fingerprints');
      } catch (err) {
        console.error('[DashboardComponent] Failed to clear repository:', err);
      }
    }
  }
}