import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BudgetProgress } from '@application/selectors/budget.selectors';
import { I18N_SHARED, I18nService } from '@ui/shared/i18n-shared';
import { CardComponent, CurrencyDisplayComponent, CurrencyExplanationRow, FeatureIconComponent } from 'ibid-ui';

@Component({
  selector: 'ohsaveme-category-budget-card',
  standalone: true,
  imports: [CurrencyDisplayComponent, FeatureIconComponent, CommonModule, CardComponent, ...I18N_SHARED],
  templateUrl: './category-budget-card.html',
  styleUrl: './category-budget-card.scss'
})
export class CategoryBudgetCardComponent {
  private readonly i18n = inject(I18nService);

  @Input({ required: true }) categoryName!: string;
  @Input() categoryIcon?: string;
  @Input() categoryColor?: string;

  @Input() budgetProgress: BudgetProgress | null = null;

  @Output() setLimitClick = new EventEmitter<void>();
  @Output() editBudgetClick = new EventEmitter<void>();
  @Output() defineBudget = new EventEmitter<void>();

  get amountExplanation(): readonly CurrencyExplanationRow[] {
    const progress = this.budgetProgress;
    if (!progress) return [];
    const target = progress.periodAllocation || progress.budget?.amount || 0;
    return [
      { label: this.i18n.translate('budgetOf'), value: this.i18n.formatCurrency(target) },
      { label: this.i18n.translate('budgetCardSpent'), value: this.i18n.formatCurrency(progress.spent ?? 0) },
      { label: this.i18n.translate(this.amountLabelKey), value: this.i18n.formatCurrency(this.amountToDisplay) }
    ];
  }

  get amountLabelKey(): string {
    return this.budgetProgress?.isOverBudget ? 'budgetOverBudgetLabel' : 'budgetRemaining';
  }

  get amountToDisplay(): number {
    return Math.abs(this.budgetProgress?.remaining ?? 0);
  }

  onDefineBudget(): void {
    this.defineBudget.emit();
    this.setLimitClick.emit();
  }
}
