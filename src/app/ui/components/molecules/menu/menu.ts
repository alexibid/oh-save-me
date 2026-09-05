import { Component, Input, Output, EventEmitter } from '@angular/core';

import { CdkMenuModule } from '@angular/cdk/menu';
import { CategoryItem } from '@domain/models/category';
import { AppCurrencyPipe } from '@ui/pipes/app-currency.pipe';
import { slugify } from '@ibid/utils';
import { IconComponent } from 'ibid-ui';

@Component({
  selector: 'ohsaveme-menu',
  standalone: true,
  imports: [IconComponent, CdkMenuModule, AppCurrencyPipe],
  template: `
    <div class="m-menu">
      <button
        type="button"
        [cdkMenuTriggerFor]="categoryMenu"
        class="a-button a-button--secondary m-menu__trigger"
      >
        @if (activeItem) {
          <span class="m-menu__dot" [style.background-color]="activeItem.color"></span>
          <span class="m-menu__label">{{ activeItem.label }}</span>
          <span class="m-menu__value">
            {{ activeItem.value | appCurrency }} ({{ activeItem.percentage.toFixed(1) }}%)
          </span>
        } @else {
          <span>Selecione uma categoria</span>
        }
        <ibid-icon name="arrow_drop_down"></ibid-icon>
      </button>

      <ng-template #categoryMenu>
        <div cdkMenu class="m-menu-panel">
          @for (item of items; track item.id) {
            <button
              cdkMenuItem
              (click)="onSelect(item.id)"
              class="m-menu__item"
              [class.m-menu__item--active]="item.id === activeItemId"
            >
              <span class="m-menu__dot" [style.background-color]="item.color"></span>
              <span class="m-menu__label">{{ item.label }}</span>
              <span class="m-menu__value">
                {{ item.value | appCurrency }} ({{ item.percentage.toFixed(1) }}%)
              </span>
            </button>
          }
        </div>
      </ng-template>
    </div>
  `,
  styleUrl: './menu.scss'
})
export class AppMenuComponent {
  @Input() activeItemId?: string;
  @Input() items: CategoryItem[] = [];
  @Output() categorySelect = new EventEmitter<string>();

  get activeItem(): CategoryItem | undefined {
    if (!this.activeItemId) return undefined;

    const normalizedActive = slugify(this.activeItemId);

    return this.items.find(item => item.id === normalizedActive);
  }

  onSelect(categoryId: string) {
    this.categorySelect.emit(categoryId);
  }
}
