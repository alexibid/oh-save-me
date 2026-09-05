import { Component, Input, computed, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { useStore } from '@application/app-store';
import { Transaction } from '@domain/models/transaction';
import { TransactionsTableComponent } from '@ui/components/organisms/transactions-table/transactions-table';
import { CategoryAppliedEvent } from '@ui/components/organisms/category-recategorize/category-recategorize';
import { I18N_SHARED } from '@ui/shared/i18n-shared';

@Component({
  selector: 'ohsaveme-category-budget-movement-search',
  standalone: true,
  imports: [FormsModule, TransactionsTableComponent, I18N_SHARED],
  templateUrl: './category-budget-movement-search.html',
  styleUrl: './category-budget-movement-search.scss'
})
export class CategoryBudgetMovementSearchComponent {
  @Input({ required: true }) categoryId!: string;

  protected readonly store = useStore();
  protected readonly searchQuery = signal('');

  protected readonly categoryOptions = this.store.categories;

  protected readonly searchResults = computed<readonly Transaction[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return [];

    return this.store.transactions().filter((t: Transaction) =>
      t.category !== this.categoryId && t.description.toLowerCase().includes(query)
    );
  });

  protected onSearchQueryChange(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected async onCategoryApplied(event: CategoryAppliedEvent): Promise<void> {
    await this.store.applyTransactionCategories(event.updatedTransactions);
  }
}
