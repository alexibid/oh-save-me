import { Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { CategoryInfo } from '@domain/models/category';
import { TransactionsTableComponent } from '@ui/components/organisms/transactions-table/transactions-table';
import { CategoryAppliedEvent } from '@ui/components/organisms/category-recategorize/category-recategorize';
import { CategoriesNavComponent } from '@ui/components/organisms/categories-nav/categories-nav';
import { CategoriesSelectors } from '@application/selectors/categories.selectors';
import { BudgetSelectors } from '@application/selectors/budget.selectors';
import { slugify } from '@ibid/utils';
import { SummaryComponent } from '@ui/components/organisms/summary/summary';
import { CategoryBudgetCardComponent } from '@ui/components/organisms/category-budget-card/category-budget-card';
import { CategoryBudgetWizardDialogComponent } from '@ui/components/organisms/category-budget-wizard-dialog/category-budget-wizard-dialog';
import { StatCardData } from '@domain/models/ui';
import { I18N_SHARED, I18nService } from '@ui/shared/i18n-shared';
import { useStore } from '@application/app-store';
import { CardComponent } from 'ibid-ui';

@Component({
  selector: 'ohsaveme-categories-list-page',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    I18N_SHARED,
    TransactionsTableComponent,
    CategoriesNavComponent,
    SummaryComponent,
    CategoryBudgetCardComponent,
    CardComponent
  ],
  templateUrl: './categories-list.html',
  styleUrl: './categories-list.scss'
})
export class CategoriesListComponent {
  public readonly id = input<string>();

  protected readonly store = useStore();

  protected readonly categoriesSelectors = inject(CategoriesSelectors);

  private readonly budgetSelectors = inject(BudgetSelectors);
  protected readonly i18n = inject(I18nService);
  private readonly dialog = inject(Dialog);

  protected readonly showCreateCategoryDialog = signal<boolean>(false);

  protected readonly categoryOptions = this.store.categories;
  protected readonly allTransactions = this.store.transactions;

  protected readonly isAllCategories = computed(() => {
    const rawId = this.id();
    if (!rawId) return true;
    const target = slugify(rawId);
    return target === 'all' || target === 'todas' || target === 'todas-as-categorias';
  });

  protected readonly category = computed<CategoryInfo | null>(() => {
    if (this.isAllCategories()) {
      return {
        id: 'all',
        name: 'cat_others',
        icon: 'label',
        color: '#0284c7'
      };
    }

    const currentId = this.id();
    if (!currentId) return null;

    const targetSlug = slugify(currentId);

    return this.categoryOptions().find(c => {
      const cSlug = slugify(c.id);
      return cSlug === targetSlug || c.id.toLowerCase() === currentId.toLowerCase();
    }) || null;
  });

  protected readonly filteredTransactions = computed(() => {
    const startStr = this.store.startDate();
    const endStr = this.store.endDate();

    if (this.isAllCategories()) {
      return this.allTransactions().filter(tx => {
        if (startStr && tx.date < startStr) return false;
        if (endStr && tx.date > endStr) return false;
        return true;
      }).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    }

    const currentCategory = this.category();
    if (!currentCategory) return [];

    const targetCatId = currentCategory.id;
    const targetSlug = slugify(targetCatId);

    return this.allTransactions().filter(tx => {
      const txCatSlug = slugify(tx.category);

      const matchesCategory = tx.category === targetCatId ||
        txCatSlug === targetSlug;

      if (!matchesCategory) return false;

      if (startStr && tx.date < startStr) return false;
      if (endStr && tx.date > endStr) return false;

      return true;
    }).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  });

  protected readonly totalExpenses = computed(() => {
    return this.filteredTransactions()
      .filter(t => t.amount < 0)
      .reduce((acc, t) => acc + t.amount, 0);
  });

  protected readonly totalIncome = computed(() => {
    return this.filteredTransactions()
      .filter(t => t.amount > 0)
      .reduce((acc, t) => acc + t.amount, 0);
  });

  protected readonly totalBalance = computed(() => {
    return this.totalIncome() + this.totalExpenses();
  });

  protected readonly transactionsCount = computed(() => {
    return this.filteredTransactions().length;
  });

  protected readonly summaryItems = computed<StatCardData[]>(() => [
    {
      label: 'income',
      value: this.totalIncome(),
      isCurrency: true,
      icon: 'trending_up',
      theme: 'success'
    },
    {
      label: 'expenses',
      value: this.totalExpenses(),
      isCurrency: true,
      icon: 'trending_down',
      theme: 'neutral'
    },
    {
      label: 'recentTransactions',
      value: this.transactionsCount(),
      isCurrency: false,
      icon: 'receipt_long',
      theme: 'neutral'
    },
    {
      label: 'netBalance',
      value: this.totalBalance(),
      isCurrency: true,
      icon: this.totalBalance() >= 0 ? 'account_balance_wallet' : 'account_balance',
      theme: this.totalBalance() >= 0 ? 'success' : 'danger'
    }
  ]);

  protected readonly categoryBudgetProgress = computed(() => {
    if (this.isAllCategories()) return null;
    return this.budgetSelectors.categoryBudgetProgress(this.category()!.id);
  });

  protected readonly categoryBudgetSuggestion = computed(() => {
    if (this.isAllCategories()) return { average: 0, includedMonths: 0, excludedOutlierMonths: 0 };
    return this.budgetSelectors.suggestedBudgetAmount(this.category()!.id);
  });

  constructor() {
    this.ensureDataLoaded();
  }

  private async ensureDataLoaded() {
    await this.store.loadInitialData();
  }

  protected async onCategoryApplied(event: CategoryAppliedEvent) {
    await this.store.applyTransactionCategories(event.updatedTransactions);
  }

  protected async onBudgetApplied(event: { transactionId: string; budgetId: string | undefined }) {
    const tx = this.store.transactions().find(t => t.id === event.transactionId);
    if (tx) {
      await this.store.updateTransactionBudget(tx, event.budgetId);
    }
  }

  protected get categoryId() {
    return this.category()?.id.toLowerCase();
  }

  protected onDefineBudget(): void {
    const cat = this.category();
    if (!cat) return;

    this.dialog.open(CategoryBudgetWizardDialogComponent, {
      width: '95vw',
      maxWidth: '700px',
      data: {
        categoryId: cat.id,
        categoryName: this.i18n.getCategoryName(cat.id),
        existingBudget: this.categoryBudgetProgress()?.budget ?? null
      }
    });
  }
}