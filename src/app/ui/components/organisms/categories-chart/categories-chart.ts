import { ViewEncapsulation, Component, Input, inject } from '@angular/core';

import { SubdividedProgressBarComponent } from '@ui/components/molecules/subdivided-bar/subdivided-bar';
import { RouterLink } from '@angular/router';
import { CategoryItem } from '@domain/models/category';
import { slugify } from '@ibid/utils';
import { I18N_SHARED, I18nService } from '@ui/shared/i18n-shared';
import { MATERIAL_SHARED } from '@ui/shared/material-shared';
import { ProgressRowComponent } from 'ibid-ui';

export interface CategorySpendComparison {
  percentage: number;
  isSuggestion: boolean;
  suggestionMonths: number;
}

@Component({
  encapsulation: ViewEncapsulation.None,
  selector: 'ohsaveme-categories-chart',
  standalone: true,
  imports: [
    I18N_SHARED,
    ProgressRowComponent,
    SubdividedProgressBarComponent,
    MATERIAL_SHARED,
    RouterLink
],
  template: `
    <div class="o-categories-chart" [class.o-categories-chart--full-bleed-mobile]="fullBleedMobile">
      <h3 class="o-categories-chart__title">{{ 'chartPieTitle' | translate }}</h3>

      <div class="o-categories-chart__container">
        @if (items.length > 0) {
          <div class="o-categories-chart__landscape">
            <ohsaveme-subdivided-bar [items]="items"></ohsaveme-subdivided-bar>

            <div class="o-categories-chart__legend">
            @for (item of items; track item.label) {
              <button
                [id]="item.id"
                matButton="tonal"
                class="o-categories-chart__legend-item"
                [routerLink]="['/categories/list', item.id]"
              >
                <span class="o-categories-chart__dot" [style.background-color]="item.color"></span>
                <span class="o-categories-chart__legend-label">{{ item.label }}</span>
                <span class="o-categories-chart__legend-value">{{ item.value | appCurrency }} ({{ item.percentage.toFixed(1) }}%)</span>
              </button>
            }
            </div>
          </div>

          <div class="o-categories-chart__mobile">
            @for (item of items; track item.label) {
              <ibid-progress-row
                [label]="item.label"
                [value]="item.value"
                [percentage]="mobilePercentageFor(item)"
                [color]="item.color"
                [attribution]="mobileAttributionFor(item)"
              ></ibid-progress-row>
            }
          </div>
        } @else {
          <div class="o-categories-chart__empty">
            <i class="pi pi-chart-pie o-categories-chart__empty-icon"></i>
            <p>{{ 'noExpenses' | translate }}</p>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './categories-chart.scss'
})
export class CategoriesComponent {
  protected readonly i18n = inject(I18nService);

  @Input() fullBleedMobile = false;

  @Input() comparisons: Record<string, CategorySpendComparison> = {};

  @Input({ required: true }) data!: {
    ids?: string[];
    labels?: string[];
    datasets?: {
      data?: number[];
      backgroundColor?: string[];
    }[];
  };

  get items(): CategoryItem[] {
    if (!this.data || !this.data.datasets || this.data.datasets.length === 0) return [];

    const labels = this.data.labels || [];
    const ids = this.data.ids || [];
    const values = this.data.datasets[0].data || [];
    const bgColors = this.data.datasets[0].backgroundColor || [];

    const total = values.reduce((acc: number, v: number) => acc + Math.abs(v), 0);
    if (total === 0) return [];

    return labels.map((label: string, idx: number): CategoryItem => {
      const val = Math.abs(values[idx] || 0);
      const pct = (val / total) * 100;
      const color = bgColors[idx] || '#cbd5e1';

      return {
        id: slugify(String(ids[idx])),
        label: String(label),
        value: val,
        percentage: pct,
        color
      };
    }).sort((a: CategoryItem, b: CategoryItem) => b.value - a.value);
  }

  protected mobilePercentageFor(item: CategoryItem): number {
    return this.comparisons[item.id]?.percentage ?? item.percentage;
  }

  protected mobileAttributionFor(item: CategoryItem): string {
    const comparison = this.comparisons[item.id];
    if (!comparison?.isSuggestion) return '';

    const prefix = this.i18n.translate('categoryBudgetSuggestedPrefix');
    const basedOn = this.i18n.translate('budgetSuggestionBasedOn');
    const movements = this.i18n.translate('categoryBudgetMovementsLabel');
    return `${prefix} (${basedOn} ${comparison.suggestionMonths} ${movements})`;
  }
}