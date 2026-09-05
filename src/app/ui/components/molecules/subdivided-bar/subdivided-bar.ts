import { Component, Input } from '@angular/core';

import { CategoryItem } from '@domain/models/category';
import { slugify } from '@ibid/utils';

export type BarSegment = CategoryItem;

@Component({
  selector: 'ohsaveme-subdivided-bar',
  standalone: true,
  imports: [],
  template: `
    <div class="m-subdivided-bar">
      @for (item of items; track item.label) {
        <div
          [attr.item-id]="item.id"
          [attr.active]="isActiveItem(item)"
          [class]="['m-subdivided-bar__segment']"
          [class.m-subdivided-bar__segment--active]="isActiveItem(item)"
          [style.width.%]="item.percentage"
          [style.background-color]="item.color"
          [title]="item.label + ': ' + item.percentage.toFixed(1) + '%'"
        ></div>
      }
    </div>
  `,
  styleUrl: './subdivided-bar.scss'
})
export class SubdividedProgressBarComponent {
  @Input() items: BarSegment[] = [];
  @Input() activeItemId?: string;

  get activeItem(): string {
    return slugify(this.activeItemId);
  }

  isActiveItem(item: BarSegment): boolean {
    return this.activeItem === slugify(item.id);
  }
}
