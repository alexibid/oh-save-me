import { Component, Input, Output, EventEmitter, inject, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18N_SHARED, I18nService } from '@ui/shared/i18n-shared';
import { BudgetSelectors } from '@application/selectors/budget.selectors';
import { PortfolioSelectors, WalletEntry } from '@application/selectors/portfolio.selectors';
import { Dialog } from '@angular/cdk/dialog';
import { AllocationWizardDialogComponent } from '@ui/components/organisms/allocation-wizard-dialog/allocation-wizard-dialog';
import { AllocationMovementsDialogComponent } from '@ui/components/organisms/allocation-movements-dialog/allocation-movements-dialog';
import { useStore } from '@application/app-store';

import { isTransferCategory, isInvestmentCategory } from '@domain/shared/transfer.utils';
import { ButtonComponent, CardComponent, CurrencyDisplayComponent, IconButtonComponent, IconComponent } from 'ibid-ui';

export type DetailedCardsSource = 'categories' | 'investments';

const WALLET_KIND_LABEL: Record<string, string> = {
  retirement: 'walletKindRetirement',
  savings_account: 'walletKindSavingsAccount',
  savings_certificate: 'walletKindSavingsCertificate',
  stocks: 'walletKindStocks',
  house: 'walletKindHouse',
  car: 'walletKindCar',
  other: 'walletKindOther'
};

const WALLET_KIND_ICON: Record<string, string> = {
  retirement: 'interest-rate-calendar',
  savings_account: 'piggy-bank',
  savings_certificate: 'statement-document',
  stocks: 'investment-growth',
  house: 'category-housing',
  car: 'directions_car',
  other: 'wallet'
};

@Component({
  selector: 'ohsaveme-allocation-detailed-cards',
  standalone: true,
  imports: [CurrencyDisplayComponent, CommonModule, CardComponent, FormsModule, ButtonComponent, IconComponent, IconButtonComponent, ...I18N_SHARED],
  templateUrl: './allocation-detailed-cards.html',
  styleUrl: './allocation-detailed-cards.scss'
})
export class AllocationDetailedCardsComponent {
  readonly source = input<DetailedCardsSource>('categories');

  protected readonly i18n = inject(I18nService);
  protected readonly budgetSelectors = inject(BudgetSelectors);
  private readonly portfolioSelectors = inject(PortfolioSelectors);
  private readonly dialog = inject(Dialog);
  protected readonly store = useStore();

  @Output() saveBudget = new EventEmitter<{ categoryId: string; amount: number }>();
  @Output() adjustTransactions = new EventEmitter<string>();
  @Output() viewMovements = new EventEmitter<string>();

  public inputValues = signal<Record<string, number>>({});

  protected readonly detailedCards = computed(() =>
    this.source() === 'categories' ? this.categoriesWithSuggestions() : []
  );

  protected readonly assetCards = computed<readonly WalletEntry[]>(() =>
    this.source() === 'investments' ? this.portfolioSelectors.assetWallets() : []
  );

  protected assetKindLabel(kind: string | undefined): string {
    return kind ? WALLET_KIND_LABEL[kind] ?? 'walletKindOther' : 'walletKindOther';
  }

  protected onOpenAssetMovements(assetId: string): void {
    const budget = this.store.budgets().find(item => item.id === assetId);
    if (!budget) return;

    this.dialog.open(AllocationMovementsDialogComponent, {
      data: { budget, titleKey: 'walletMovementsTitle' },
      maxWidth: '800px',
      width: '100%'
    });
  }

  protected onEditAsset(assetId: string): void {
    const wallet = this.store.budgets().find(budget => budget.id === assetId);
    if (!wallet) return;

    this.dialog.open(AllocationWizardDialogComponent, {
      data: { mode: 'investment', wallet },
      maxWidth: '480px',
      width: '100%'
    });
  }

  protected async onArchiveAsset(assetId: string): Promise<void> {
    const wallet = this.store.budgets().find(budget => budget.id === assetId);
    if (!wallet) return;

    await this.store.updateBudget({ ...wallet, isClosed: true });
  }

  protected assetKindIcon(kind: string | undefined): string {
    return kind ? WALLET_KIND_ICON[kind] ?? 'wallet' : 'wallet';
  }

  private readonly categoriesWithSuggestions = computed(() => {
    const categories = this.store.categories();
    const activeBudgets = this.store.budgets().filter(b => b.type === 'category' && !b.isClosed);
    const activeCategoryIds = new Set(activeBudgets.map(b => b.categoryId));

    const unbudgeted = categories.filter(c =>
      !activeCategoryIds.has(c.id) &&
      !isTransferCategory(c.id) &&
      !isInvestmentCategory(c)
    );

    return unbudgeted.map(cat => {
      const suggestion = this.budgetSelectors.suggestedBudgetAmount(cat.id);
      const amount = this.getInputValue(cat.id, suggestion.average);
      const progress = this.budgetSelectors.categoryProgress(cat.id, amount);
      return {
        category: cat,
        suggestion,
        progress
      };
    }).filter(item => item.suggestion.average > 0);
  });

  getInputValue(categoryId: string, average: number): number {
    const val = this.inputValues()[categoryId];
    return val !== undefined ? val : Math.round(average);
  }

  onAmountChange(categoryId: string, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      this.inputValues.update(v => ({ ...v, [categoryId]: parsed }));
    }
  }

  onSave(categoryId: string, average: number, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      this.inputValues.update(v => ({ ...v, [categoryId]: parsed }));
      this.saveBudget.emit({ categoryId, amount: parsed });
    }
  }

  onAdjustTransactions(categoryId: string) {
    this.adjustTransactions.emit(categoryId);
  }

  onProgressBarClick(categoryId: string) {
    this.viewMovements.emit(categoryId);
  }
}
