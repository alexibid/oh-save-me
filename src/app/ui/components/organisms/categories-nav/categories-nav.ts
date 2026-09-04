import { ViewEncapsulation, Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SubdividedProgressBarComponent } from '@ui/components/molecules/subdivided-bar/subdivided-bar';
import { AppMenuComponent } from '@ui/components/molecules/menu/menu';
import { CategoryItem } from '@domain/models/category';
import { slugify } from '@ibid/utils';
import { I18N_SHARED, I18nService } from '@ui/shared/i18n-shared';

import { HandDrawnDirective } from 'ibid-ui';

@Component({
  encapsulation: ViewEncapsulation.None,
  selector: 'ohsaveme-categories-nav',
  standalone: true,
  imports: [
    I18N_SHARED,
    HandDrawnDirective,
    SubdividedProgressBarComponent,
    AppMenuComponent
  ],
  template: `
    <nav class="c-categories-nav" [ibidHandDrawn]="2">
      <div class="c-categories-nav__menu">
        <ohsaveme-menu
          [activeItemId]="normalizedActiveId"
          [items]="items"
          (categorySelect)="onCategoryChange($event)"
        ></ohsaveme-menu>
      </div>

      @if (items.length > 0) {
        <div class="c-categories-nav__indicator">
          <ohsaveme-subdivided-bar
            [items]="items"
            [activeItemId]="normalizedActiveId"
          ></ohsaveme-subdivided-bar>
        </div>
      }
    </nav>
  `,
  styleUrl: './categories-nav.scss'
})
export class CategoriesNavComponent {
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  @Input() activeCategoryId?: string;
  @Input({ required: true }) data!: {
    ids?: string[];
    labels?: string[];
    datasets?: {
      data?: number[];
      backgroundColor?: string[];
    }[];
  };

  get normalizedActiveId(): string | undefined {
    return this.activeCategoryId ? slugify(this.activeCategoryId) : undefined;
  }

  get items(): CategoryItem[] {
    if (!this.data || !this.data.datasets || this.data.datasets.length === 0) return [];

    const labels = this.data.labels || [];
    const ids = this.data.ids || [];
    const values = this.data.datasets[0].data || [];
    const bgColors = this.data.datasets[0].backgroundColor || [];

    const total = values.reduce((acc: number, v: number) => acc + Math.abs(v), 0);
    if (total === 0) return [];

    return labels.map((label: string, idx: number): CategoryItem => {
      const rawId = String(ids[idx]);
      const normalizedId = slugify(rawId);
      const val = Math.abs(values[idx] || 0);
      const pct = (val / total) * 100;
      const color = bgColors[idx] || '#cbd5e1';

      const translatedLabel = this.i18n.getCategoryName(normalizedId) || label;

      return {
        id: normalizedId,
        label: translatedLabel,
        value: val,
        percentage: pct,
        color
      };
    }).sort((a: CategoryItem, b: CategoryItem) => b.value - a.value);
  }

  onCategoryChange(categoryId: string) {
    if (categoryId) {
      this.router.navigate(['/categories/list', categoryId]);
    }
  }
}