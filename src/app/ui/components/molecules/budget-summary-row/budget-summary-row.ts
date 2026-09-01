import { Component, EventEmitter, Output, input } from '@angular/core';
import { HandDrawnDirective, IconComponent, SmartCurrencyCellComponent } from 'ibid-ui';

@Component({
  selector: 'ohsaveme-budget-summary-row',
  standalone: true,
  imports: [IconComponent, SmartCurrencyCellComponent, HandDrawnDirective],
  template: `
    <button type="button" class="m-budget-summary-row" ibidHandDrawn (click)="rowClick.emit()">
      <span class="m-budget-summary-row__label">{{ label() }}</span>
      <ibid-smart-currency-cell class="m-budget-summary-row__value" [value]="value()" [interactive]="false" />
      <ibid-icon name="chevron-right" class="m-budget-summary-row__icon" ></ibid-icon>
    </button>
  `,
  styleUrl: './budget-summary-row.scss'
})
export class BudgetSummaryRowComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number>();

  @Output() rowClick = new EventEmitter<void>();
}
