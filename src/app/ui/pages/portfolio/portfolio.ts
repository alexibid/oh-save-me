import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { Budget } from '@domain/models/budget';
import { useStore } from '@application/app-store';
import { BudgetSelectors } from '@application/selectors/budget.selectors';
import { PortfolioSelectors } from '@application/selectors/portfolio.selectors';
import { I18N_SHARED, I18nService } from '@ui/shared/i18n-shared';
import { BalanceSummaryCard } from '@ui/components/organisms/balance-summary-card/balance-summary-card';
import { BalanceBarChart } from '@ui/components/organisms/balance-bar-chart/balance-bar-chart';
import { ChartPoint } from '@domain/models/chart-series';
import { AllocationsDashboard } from '@ui/components/organisms/allocations-dashboard/allocations-dashboard';
import { BudgetActionsBanner } from '@ui/components/organisms/budget-actions-banner/budget-actions-banner';
import { AllocationWizardDialogComponent } from '@ui/components/organisms/allocation-wizard-dialog/allocation-wizard-dialog';
import { AllocationDetailedCardsComponent } from '@ui/components/organisms/allocation-detailed-cards/allocation-detailed-cards';
import { CategoryBudgetWizardDialogComponent } from '@ui/components/organisms/category-budget-wizard-dialog/category-budget-wizard-dialog';
import { AllocationEditDialogComponent } from '@ui/components/organisms/allocation-edit-dialog/allocation-edit-dialog';
import { AllocationMovementsDialogComponent } from '@ui/components/organisms/allocation-movements-dialog/allocation-movements-dialog';
import { isTransferCategory, isInvestmentCategory, isLegacyOrphanedCategory } from '@domain/shared/transfer.utils';
import { parseRouteQueryParams } from '@ui/shared/route-query.utils';

import { ActivatedRoute, Router } from '@angular/router';
import { CurrencyExplanationRow } from 'ibid-ui';

@Component({
  selector: 'ohsaveme-portfolio',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    BalanceSummaryCard,
    BalanceBarChart,
    AllocationsDashboard,
    BudgetActionsBanner,
    AllocationDetailedCardsComponent,
    ...I18N_SHARED
  ],
  templateUrl: './portfolio.html',
  styleUrl: './portfolio.scss',
})
export class PortfolioComponent implements OnInit {
  protected readonly store = useStore();
  protected readonly budgetSelectors = inject(BudgetSelectors);
  private readonly portfolioSelectors = inject(PortfolioSelectors);
  protected readonly i18n = inject(I18nService);
  private readonly dialog = inject(Dialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly totalWalletBalance = computed<number>(() => this.budgetSelectors.walletBalance());
  protected readonly totalWalletBalanceExplanation = computed<readonly CurrencyExplanationRow[]>(() =>
    this.budgetSelectors.accountBalances()
      .filter(a => a.account.type !== 'investment' || a.account.includeInConsolidatedBalance)
      .map(a => ({ label: a.account.name, value: this.i18n.formatCurrency(a.balance) }))
  );
  protected readonly investedValue = computed<number>(() => this.portfolioSelectors.investedValue());
  protected readonly assetsValue = computed<number>(() => this.portfolioSelectors.assetsValue());
  protected readonly totalPatrimony = computed<number>(() => this.portfolioSelectors.totalPatrimony());
  protected readonly realizedResult = computed<number>(() => this.portfolioSelectors.realizedResult());

  private readonly monthLabelsPt = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  private readonly monthLabelsEn = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  protected readonly assetBalancePoints = computed<readonly ChartPoint[]>(() => {
    const labels = this.i18n.currentLang() === 'pt' ? this.monthLabelsPt : this.monthLabelsEn;
    return this.portfolioSelectors.assetBalanceHistory().map(point => ({
      label: labels[Number(point.month.slice(5, 7)) - 1] ?? point.month,
      value: point.balance
    }));
  });

  async ngOnInit(): Promise<void> {
    await this.store.loadInitialData();

    this.route.queryParams.subscribe(rawParams => {
      const parsed = parseRouteQueryParams(rawParams);
      if (rawParams['new'] === 'true') {
        this.onOpenProjectWizard();
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { new: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      }

      const categoryId = parsed.category;
      if (categoryId && !this.isCategoryNotBudgetable(categoryId)) {
        this.dialog.open(CategoryBudgetWizardDialogComponent, {
          data: { categoryId },
          maxWidth: '480px',
          width: '100%'
        });
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { category: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      }
    });
  }

  protected onOpenProjectWizard(): void {
    this.dialog.open(AllocationWizardDialogComponent, {
      data: { mode: 'investment' },
      maxWidth: '480px',
      width: '100%'
    });
  }

  async onSaveCategoryBudget(event: { categoryId: string; amount: number }): Promise<void> {
    const existing = this.store.budgets().find(b => b.type === 'category' && b.categoryId === event.categoryId);
    if (existing) {
      await this.store.updateBudget({
        ...existing,
        amount: event.amount
      });
    } else {
      const categoryName = this.i18n.getCategoryName(event.categoryId);
      const budget: Budget = {
        id: crypto.randomUUID(),
        name: categoryName,
        type: 'category',
        categoryId: event.categoryId,
        amount: event.amount,
        isClosed: false
      };
      await this.store.addBudget(budget);
    }
  }

  onAdjustCategoryTransactions(categoryId: string): void {
    const categoryName = this.i18n.getCategoryName(categoryId);
    this.dialog.open(CategoryBudgetWizardDialogComponent, {
      data: {
        categoryId,
        categoryName,
        existingBudget: this.store.budgets().find(b => b.type === 'category' && b.categoryId === categoryId && !b.isClosed) || null
      },
      maxWidth: '800px',
      width: '100%'
    });
  }

  onViewCategoryMovements(categoryId: string): void {
    this.router.navigate(['/movements'], { queryParams: { category: categoryId } });
  }

  protected onOpenProjectFromSummary(portfolio: Budget): void {
    this.dialog.open(AllocationEditDialogComponent, {
      data: { portfolio },
      maxWidth: '480px',
      width: '100%'
    });
  }

  protected onOpenProjectMovements(portfolio: Budget): void {
    this.dialog.open(AllocationMovementsDialogComponent, {
      data: { portfolio },
      maxWidth: '800px',
      width: '100%'
    });
  }

  private isCategoryNotBudgetable(categoryId: string): boolean {
    if (isTransferCategory(categoryId) || isLegacyOrphanedCategory(categoryId)) return true;
    const category = this.store.categories().find(c => c.id === categoryId);
    return !!category && isInvestmentCategory(category);
  }
}
