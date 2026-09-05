import { Component, inject, computed } from '@angular/core';

import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { useStore } from '@application/app-store';
import { BudgetSelectors } from '@application/selectors/budget.selectors';
import { I18N_SHARED, I18nService } from '@ui/shared/i18n-shared';

import { CategoryBudgetCardComponent } from '@ui/components/organisms/category-budget-card/category-budget-card';
import { CategoryBudgetWizardDialogComponent } from '@ui/components/organisms/category-budget-wizard-dialog/category-budget-wizard-dialog';
import { EmptyStateComponent } from 'ibid-ui';

@Component({
  selector: 'ohsaveme-category-budgets-dashboard',
  standalone: true,
  imports: [
    DialogModule,
    CategoryBudgetCardComponent,
    EmptyStateComponent,
    ...I18N_SHARED
],
  templateUrl: './category-budgets-dashboard.html',
  styleUrl: './category-budgets-dashboard.scss'
})
export class CategoryBudgetsDashboard {
  protected readonly store = useStore();
  protected readonly budgetSelectors = inject(BudgetSelectors);
  protected readonly i18n = inject(I18nService);
  private readonly dialog = inject(Dialog);

  protected readonly budgetCards = computed(() => {
    return this.store.categories()
      .map(cat => ({
        category: cat,
        progress: this.budgetSelectors.categoryBudgetProgress(cat.id)
      }))
      .filter(data => !!data.progress);
  });

  protected readonly hasSuggestions = computed(() => {
    return this.store.categories().some(cat => {
      const suggestion = this.budgetSelectors.suggestedBudgetAmount(cat.id);
      const progress = this.budgetSelectors.categoryBudgetProgress(cat.id);
      return !progress && suggestion && suggestion.average > 0;
    });
  });

  protected onDefineBudget(categoryId: string): void {
    this.dialog.open(CategoryBudgetWizardDialogComponent, {
      data: { categoryId },
      maxWidth: '480px',
      width: '100%'
    });
  }
}
