import { Injectable, computed, inject } from '@angular/core';
import { useStore } from '@application/app-store';
import { I18nService } from '@application/i18n.service';
import { CategoryInfo } from '@domain/models/category';
import { BudgetSelectors } from './budget.selectors';
import { slugify } from '@ibid/utils';

export interface CategoriesData {
  ids: string[];
  labels: string[];
  datasets: Array<{
    data: number[];
    backgroundColor?: string[];
    hoverBackgroundColor?: string[];
    borderWidth?: number;
    borderColor?: string;
  }>;
}

export interface CategorySpendComparison {
  percentage: number;
  isSuggestion: boolean;
  suggestionMonths: number;
}

@Injectable({
  providedIn: 'root'
})
export class CategoriesSelectors {
  private readonly store = useStore();
  private readonly i18n = inject(I18nService);
  private readonly budgetSelectors = inject(BudgetSelectors);

  private readonly categoryTotals = computed<Record<string, number>>(() => {
    const startDate = this.store.startDate();
    const endDate = this.store.endDate();
    const allTransactions = this.store.transactions();

    if (!startDate || !endDate || allTransactions.length === 0) return {};

    const isProjectTransaction = this.budgetSelectors.isProjectTransaction();
    const validTransactions = allTransactions.filter(
      t => t.date >= startDate && t.date <= endDate && !isProjectTransaction(t)
    );

    const totals: Record<string, number> = {};
    validTransactions.forEach(t => {
      const cat = t.category || 'Others';
      totals[cat] = (totals[cat] || 0) + t.amount;
    });
    return totals;
  });

  readonly chartData = computed<CategoriesData>(() => {
    const categoryTotals = this.categoryTotals();
    const categories = this.store.categories();

    const ids = Object.keys(categoryTotals);
    if (ids.length === 0) {
      return { ids: [], labels: [], datasets: [] };
    }

    const data = Object.values(categoryTotals);

    const backgroundColor = ids.map(id => {
      const found = categories.find(c => c.id.toLowerCase() === id.toLowerCase());
      return found ? found.color : '#cbd5e1';
    });

    const labels = ids.map(id => this.i18n.getCategoryName(id));

    return {
      ids,
      labels,
      datasets: [
        {
          data,
          backgroundColor,
          hoverBackgroundColor: backgroundColor.map(c => c + 'dd'),
          borderWidth: 1,
          borderColor: '#ffffff',
        },
      ],
    };
  });

  readonly categorySpendComparisons = computed<Record<string, CategorySpendComparison>>(() => {
    const totals = this.categoryTotals();
    const result: Record<string, CategorySpendComparison> = {};

    for (const [id, total] of Object.entries(totals)) {
      if (total >= 0) continue;
      const spent = -total;

      const progress = this.budgetSelectors.categoryBudgetProgress(id);
      if (progress) {
        result[slugify(id)] = { percentage: progress.percentage, isSuggestion: false, suggestionMonths: 0 };
        continue;
      }

      const suggestion = this.budgetSelectors.suggestedBudgetAmount(id);
      if (suggestion.average > 0) {
        result[slugify(id)] = {
          percentage: (spent / suggestion.average) * 100,
          isSuggestion: true,
          suggestionMonths: suggestion.includedMonths
        };
      }
    }

    return result;
  });

  readonly hasData = computed(() => {
    const data = this.chartData().datasets[0]?.data;
    return !!data && data.length > 0 && data.some(val => val !== 0);
  });

  readonly listData = computed(() => {
    const categories = this.store.categories();
    return categories.map(cat => {
      return {
        id: cat.id,
        name: this.i18n.getCategoryName(cat.id),
        color: cat.color,
        enabled: cat.enabled
      } as CategoryInfo;
    });
  });
}
