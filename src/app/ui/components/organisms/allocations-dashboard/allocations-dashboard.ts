import { Component, inject, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { useStore } from '@application/app-store';
import { BudgetSelectors, BudgetProgress } from '@application/selectors/budget.selectors';
import { PortfolioSelectors, WalletEntry } from '@application/selectors/portfolio.selectors';
import { Budget } from '@domain/models/budget';
import { I18N_SHARED, I18nService } from '@ui/shared/i18n-shared';
import { AllocationMovementsDialogComponent } from '@ui/components/organisms/allocation-movements-dialog/allocation-movements-dialog';
import { AllocationEditDialogComponent } from '@ui/components/organisms/allocation-edit-dialog/allocation-edit-dialog';
import {
  ButtonComponent,
  CardComponent,
  CurrencyDisplayComponent,
  FormFieldComponent,
  HandDrawnDirective,
  IconButtonComponent,
  IconComponent,
  ToggleTabItem,
  ToggleTabsComponent
} from 'ibid-ui';

export type AllocationsSource = 'projects' | 'investments';

@Component({
  selector: 'ohsaveme-allocations-dashboard',
  standalone: true,
  imports: [
    CurrencyDisplayComponent,
    CommonModule,
    DialogModule,
    HandDrawnDirective,
    IconComponent,
    IconButtonComponent,
    ToggleTabsComponent,
    ...I18N_SHARED
  ],
  templateUrl: './allocations-dashboard.html',
  styleUrl: './allocations-dashboard.scss'
})
export class AllocationsDashboard {
  readonly source = input<AllocationsSource>('projects');

  protected readonly store = useStore();
  protected readonly budgetSelectors = inject(BudgetSelectors);
  private readonly portfolioSelectors = inject(PortfolioSelectors);
  protected readonly i18n = inject(I18nService);
  private readonly dialog = inject(Dialog);

  protected readonly allBudgetsProgress = computed(() => this.budgetSelectors.budgetsProgress());
  protected readonly filterState = signal<'all' | 'active' | 'expired' | 'closed'>('active');

  protected readonly isPortfolio = computed<boolean>(() => this.source() === 'investments');

  protected readonly tabItems = computed<readonly ToggleTabItem<'all' | 'active' | 'expired' | 'closed'>[]>(() => {
    const portfolio = this.isPortfolio();
    const items: ToggleTabItem<'all' | 'active' | 'expired' | 'closed'>[] = [
      { value: 'all', label: this.i18n.translate('budgetFilterAll') },
      { value: 'active', label: this.i18n.translate('budgetFilterActive') },
      { value: 'expired', label: this.i18n.translate('budgetFilterExpired') }
    ];
    if (!portfolio) {
      items.push({ value: 'closed', label: this.i18n.translate('budgetFilterClosed') });
    }
    return items;
  });

  protected readonly filteredWallets = computed<readonly WalletEntry[]>(() => {
    const filter = this.filterState();
    if (filter === 'active') return this.portfolioSelectors.heldWallets();
    if (filter === 'expired') return this.portfolioSelectors.executedWallets();
    return this.portfolioSelectors.wallets();
  });

  protected readonly filteredBudgets = computed<readonly BudgetProgress[]>(() => {
    if (this.isPortfolio()) return [];

    const list = this.allBudgetsProgress().filter(item => item.budget.type === 'project');
    const filter = this.filterState();

    return list.filter(item => {
      if (filter === 'active') return item.status === 'active';
      if (filter === 'expired') return item.status === 'expired';
      if (filter === 'closed') return item.status === 'archived';
      return true;
    });
  });

  get lang(): string {
    return this.i18n.currentLang();
  }

  protected async onToggleProjectStatus(b: Budget): Promise<void> {
    const updated: Budget = {
      ...b,
      isClosed: !b.isClosed
    };
    await this.store.updateBudget(updated);
  }

  protected async onDeleteBudget(id: string): Promise<void> {
    const message = this.lang === 'pt'
      ? 'Tem a certeza que deseja eliminar este orçamento?'
      : 'Are you sure you want to delete this budget?';

    if (confirm(message)) {
      await this.store.deleteBudget(id);
    }
  }

  protected onOpenMovements(budget: Budget): void {
    this.dialog.open(AllocationMovementsDialogComponent, {
      data: { budget },
      maxWidth: '800px',
      width: '100%'
    });
  }

  protected onOpenEditBudget(budget: Budget): void {
    this.dialog.open(AllocationEditDialogComponent, {
      data: { budget },
      maxWidth: '480px',
      width: '100%'
    });
  }
}
