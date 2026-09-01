import { Injectable, computed, inject } from '@angular/core';
import { useStore } from '@application/app-store';
import { I18nService } from '@application/i18n.service';
import { PerformanceMonitorService } from '@application/services/performance-monitor.service';
import { SuggestionEngine } from '@domain/services/suggestion-engine';
import { resolveFinancialInsight } from '@domain/services/suggestion-resolver';
import { FinancialInsight } from '@domain/models/financial-insight.model';
import { SuggestionDismissalService } from '@application/services/suggestion-dismissal.service';
import { InsightConfigService } from '@application/services/insight-config.service';
import { PortfolioSelectors } from '@application/selectors/portfolio.selectors';
import { BudgetSelectors } from '@application/selectors/budget.selectors';

@Injectable({ providedIn: 'root' })
export class GetDashboardInsightsUseCase {
  private readonly store = useStore();
  private readonly i18n = inject(I18nService);
  private readonly dismissalService = inject(SuggestionDismissalService);
  private readonly insightConfig = inject(InsightConfigService);
  private readonly portfolio = inject(PortfolioSelectors);
  private readonly budgets = inject(BudgetSelectors);
  private readonly performanceMonitor = inject(PerformanceMonitorService);
  private readonly engine = new SuggestionEngine();

  readonly insights = computed<readonly FinancialInsight[]>(() => {
    this.i18n.currentLang();

    const templates = this.performanceMonitor.measureSync('GetDashboardInsightsUseCase.insights', () =>
      this.engine.buildFinancialInsights({
        accounts: this.store.accounts(),
        transactions: this.store.transactions(),
        budgets: this.store.budgets(),
        categories: this.store.categories(),
        startDate: this.store.startDate(),
        endDate: this.store.endDate(),
      config: this.insightConfig.config(),
        spendableBalance: this.budgets.spendableBalance(),
        patrimony: {
          accessible: this.portfolio.accessibleValue(),
          reserved: this.portfolio.reservedValue(),
          invested: this.portfolio.investedValue(),
          property: this.portfolio.assetsValue(),
          outstandingDebt: this.portfolio.outstandingDebt(),
          receivedIncome: this.portfolio.receivedIncome(),
          firstIncomeDate: this.portfolio.firstIncomeDate(),
          paidInstalments: this.portfolio.paidInstalments(),
          contractedInstalments: this.portfolio.contractedInstalments(),
        },
      })
    );

    return templates.map(t =>
      resolveFinancialInsight(
        t,
        key => this.i18n.translate(key),
        amount => this.i18n.formatCurrency(amount),
        categoryId => this.i18n.getCategoryName(categoryId)
      )
    );
  });

  readonly activeInsights = computed<readonly FinancialInsight[]>(() =>
    this.insights().filter(insight => !this.dismissalService.isDismissed(insight.kind, insight.id))
  );

  readonly archivedInsights = computed<readonly FinancialInsight[]>(() =>
    this.insights().filter(insight =>
      this.dismissalService.isDismissed(insight.kind, insight.id) &&
      !this.dismissalService.isPermanentlyDismissed(insight.kind, insight.id)
    )
  );
}
