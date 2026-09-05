import { Component, input, output, computed, inject } from '@angular/core';

import { I18N_SHARED } from '@ui/shared/i18n-shared';
import { BudgetSelectors, BudgetProgress } from '@application/selectors/budget.selectors';
import { Budget } from '@domain/models/budget';
import { ButtonComponent, CurrencyDisplayComponent, FeatureIconComponent, HandDrawnDirective, IconComponent } from 'ibid-ui';

const SUGGESTED_BUDGET_ID_PREFIX = 'temp-';

@Component({
  selector: 'ohsaveme-budget-execution-summary',
  standalone: true,
  imports: [CurrencyDisplayComponent, FeatureIconComponent, IconComponent, ButtonComponent, HandDrawnDirective, ...I18N_SHARED],
  templateUrl: './budget-execution-summary.html',
  styleUrl: './budget-execution-summary.scss'
})
export class BudgetExecutionSummary {
  private readonly budgetSelectors = inject(BudgetSelectors);

  readonly periodBudgetsProgress = input.required<readonly BudgetProgress[]>();

  readonly categoryItemClick = output<string>();
  readonly projectItemClick = output<Budget>();
  readonly categoryMovementsClick = output<string>();
  readonly projectMovementsClick = output<Budget>();

  protected isSuggestedExecution(item: BudgetProgress): boolean {
    return item.budget.id.startsWith(SUGGESTED_BUDGET_ID_PREFIX);
  }

  protected onCategoryMovementsClick(categoryId: string | undefined): void {
    if (categoryId) this.categoryMovementsClick.emit(categoryId);
  }

  protected readonly activeCategoryBudgets = computed(() =>
    [...this.budgetSelectors.allCategoryExecutionsForPeriod()]
      .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
  );

  protected readonly activeProjectBudgets = computed(() =>
    this.periodBudgetsProgress()
      .filter(bp => bp.budget.type === 'project' && bp.status === 'active')
      .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
  );

  protected onCategoryItemClick(categoryId: string | undefined): void {
    if (categoryId) this.categoryItemClick.emit(categoryId);
  }
}
