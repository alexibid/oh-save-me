import { Component, Input, Output, EventEmitter, computed } from '@angular/core';

import { useStore } from '@application/app-store';
import { Unit, UnitCategory } from '@domain/models/unit';
import { AppTranslatePipe } from '@ui/shared/i18n-shared';

@Component({
  selector: 'ohsaveme-unit-select',
  standalone: true,
  imports: [AppTranslatePipe],
  template: `
    <select class="m-unit-select" [value]="value" (change)="onSelect($event)">
      @if (currencyUnits().length) {
        <optgroup [label]="'unitCategoryCurrency' | translate">
          @for (u of currencyUnits(); track u) {
            <option [value]="u.code">{{ u.symbol }} · {{ u.label }}</option>
          }
        </optgroup>
      }
      @if (physicalMeasureUnits().length) {
        <optgroup [label]="'unitCategoryPhysicalMeasure' | translate">
          @for (u of physicalMeasureUnits(); track u) {
            <option [value]="u.code">{{ u.symbol }} · {{ u.label }}</option>
          }
        </optgroup>
      }
    </select>
    `,
  styleUrl: './unit-select.scss'
})
export class UnitSelectComponent {
  private readonly store = useStore();

  @Input() value = '';
  @Input() category?: UnitCategory;
  @Output() valueChange = new EventEmitter<string>();

  protected readonly currencyUnits = computed<Unit[]>(() => this.unitsFor('currency'));
  protected readonly physicalMeasureUnits = computed<Unit[]>(() => this.unitsFor('physical_measure'));

  private unitsFor(category: UnitCategory): Unit[] {
    if (this.category && this.category !== category) return [];
    return this.store.units().filter(u => u.category === category);
  }

  protected onSelect(event: Event): void {
    this.valueChange.emit((event.target as HTMLSelectElement).value);
  }
}
