import { ColumnRole, MULTI_VALUE_ROLES } from '@domain/models/column-role';
import { ViewEncapsulation, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService, I18N_SHARED } from '@ui/shared/i18n-shared';
import { UnitSelectComponent } from '@ui/components/molecules/unit-select/unit-select';

@Component({
  encapsulation: ViewEncapsulation.None,
  selector: 'ohsaveme-column-mapper-dialog',
  standalone: true,
  imports: [CommonModule, UnitSelectComponent, ...I18N_SHARED],
  template: `
    <div class="o-column-mapper-dialog" style="padding: 0; background: transparent; border: none; box-shadow: none; display: flex; flex-direction: column; width: 100%;">
      <div class="o-column-mapper-dialog__content" style="padding: 0; display: flex; flex-direction: column; width: 100%;">

        <div class="o-column-mapper__chips-container" style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 8px;">
          <span class="o-column-mapper__chips-title" style="font-size: var(--text-2xs); opacity: 0.8; font-weight: 500;">{{ t().colMapperMissingLabel }}</span>
          @for (field of requiredFields; track field.role) {
            @if (isMissing(field.role)) {
              <span class="o-column-mapper__chip o-column-mapper__chip--pending" style="background: rgba(239, 83, 80, 0.15); color: #ef5350; border: 1px solid rgba(239, 83, 80, 0.3); padding: 2px 6px; border-radius: 4px; font-size: var(--text-2xs); font-weight: 500;">
                {{ field.label }}
              </span>
            }
          }
          @if (!hasPendingMappings) {
            <span class="o-column-mapper__chip o-column-mapper__chip--ready" style="background: rgba(102, 187, 106, 0.15); color: #66bb6a; border: 1px solid rgba(102, 187, 106, 0.3); padding: 2px 6px; border-radius: 4px; font-size: var(--text-2xs); font-weight: 500;">
              {{ t().colMapperCompleteLabel }}
            </span>
          }
        </div>

        <div class="o-column-mapper__list-container" style="flex: 1; overflow-y: auto; border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-surface);">
          <div class="o-column-mapper__list">
            <div class="o-column-mapper__list-header">
              @for (col of headers; track $index; let cIdx = $index) {
                <div class="o-column-mapper__header-cell">
                  <div class="o-column-mapper__header-title" style="margin-bottom: 4px; font-weight: 600; opacity: 0.9; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                    {{ col || t().colMapperColPlaceholder + ' ' + (cIdx + 1) }}
                  </div>
                  <select
                    class="o-column-mapper__select"
                    (change)="onRoleChange(cIdx, $event)"
                    style="background: var(--color-surface); color: var(--color-text-primary); border: 1px solid var(--color-border); border-radius: 4px; padding: 4px 8px; font-size: var(--text-2xs); cursor: pointer; outline: none; width: 100%; box-sizing: border-box;"
                  >
                    <option value="skip" [selected]="mappings[cIdx] === 'skip'">{{ t().colRoleSkip }}</option>
                    <option value="date" [selected]="mappings[cIdx] === 'date'">{{ t().colRoleDate }}</option>
                    @if (accountKind === 'custom') {
                      <option value="measure" [selected]="mappings[cIdx] === 'measure'">{{ t().colRoleMeasure }}</option>
                      <option value="dimension" [selected]="mappings[cIdx] === 'dimension'">{{ t().colRoleDimension }}</option>
                    } @else {
                      <option value="desc" [selected]="mappings[cIdx] === 'desc'">{{ t().colRoleDesc }}</option>
                      <option value="amount" [selected]="mappings[cIdx] === 'amount'" [title]="t().colRoleAmountHint">{{ t().colRoleAmount }}</option>
                      <option value="debit" [selected]="mappings[cIdx] === 'debit'" [title]="t().colRoleDebitHint">{{ t().colRoleDebit }}</option>
                      <option value="credit" [selected]="mappings[cIdx] === 'credit'" [title]="t().colRoleCreditHint">{{ t().colRoleCredit }}</option>
                      <option value="balance" [selected]="mappings[cIdx] === 'balance'">{{ t().colRoleBalance }}</option>
                      <option value="investmentType" [selected]="mappings[cIdx] === 'investmentType'">{{ t().colRoleInvestmentType }}</option>
                      <option value="shares" [selected]="mappings[cIdx] === 'shares'">{{ t().colRoleShares }}</option>
                      <option value="price" [selected]="mappings[cIdx] === 'price'">{{ t().colRolePrice }}</option>
                      <option value="fee" [selected]="mappings[cIdx] === 'fee'">{{ t().colRoleFee }}</option>
                      <option value="tax" [selected]="mappings[cIdx] === 'tax'">{{ t().colRoleTax }}</option>
                      <option value="symbol" [selected]="mappings[cIdx] === 'symbol'">{{ t().colRoleSymbol }}</option>
                      <option value="assetName" [selected]="mappings[cIdx] === 'assetName'">{{ t().colRoleAssetName }}</option>
                      <option value="assetType" [selected]="mappings[cIdx] === 'assetType'">{{ t().colRoleAssetType }}</option>
                    }
                  </select>
                  @if (mappings[cIdx] === 'measure') {
                    <ohsaveme-unit-select
                      [value]="measureUnits[cIdx] || ''"
                      (valueChange)="onMeasureUnitChange(cIdx, $event)"
                      style="display: block; margin-top: 4px; width: 100%;"
                    ></ohsaveme-unit-select>
                  }
                </div>
              }
            </div>
            <div class="o-column-mapper__list-body">
              @for (row of dataRows; track $index) {
                <div class="o-column-mapper__data-row">
                  @for (cell of row; track $index; let cIdx = $index) {
                    <div class="o-column-mapper__data-cell" style="white-space: nowrap; max-width: 150px; overflow: hidden; text-overflow: ellipsis;">
                      {{ cell }}
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './column-mapper-dialog.scss'
})
export class ColumnMapperDialogComponent implements OnChanges {
  private readonly el = inject(ElementRef);
  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;

  @Input({ required: true }) rawRows: string[][] = [];
  @Input({ required: true }) fileName = '';
  @Input({ required: true }) mappings: ColumnRole[] = [];
  @Input() requiredFields: { role: ColumnRole; label: string }[] = [];
  @Input() accountKind: 'financial' | 'custom' = 'financial';

  @Output() mappingsChange = new EventEmitter<ColumnRole[]>();
  @Output() measureUnitsChange = new EventEmitter<Record<number, string>>();

  protected headers: string[] = [];
  protected dataRows: string[][] = [];
  protected measureUnits: Record<number, string> = {};

  ngOnChanges(changes: SimpleChanges) {
    if (changes['rawRows'] && this.rawRows.length > 0) {
      this.headers = this.rawRows[0];
      this.dataRows = this.rawRows.slice(1);
      if (!this.mappings || this.mappings.length !== this.headers.length) {
        this.mappings = this.headers.map(() => 'skip');
        this.mappingsChange.emit(this.mappings);
      }
    }
    if (this.mappings && this.mappings.length > 0) {
      const seen = new Set<string>();
      let changed = false;
      const sanitized = this.mappings.map(r => {
        if (r === 'skip' || this.isMultiValueRole(r)) return r;
        if (seen.has(r)) { changed = true; return 'skip' as ColumnRole; }
        seen.add(r);
        return r;
      });
      if (changed) {
        this.mappings = sanitized;
        this.mappingsChange.emit(sanitized);
      }
    }
  }

  protected isMissing(role: ColumnRole): boolean {
    return !this.mappings.includes(role);
  }

  protected get hasPendingMappings(): boolean {
    return this.requiredFields.some(f => this.isMissing(f.role));
  }

  private isMultiValueRole(role: ColumnRole): boolean {
    return MULTI_VALUE_ROLES.includes(role);
  }

  onRoleChange(colIndex: number, event: Event) {
    const select = event.target as HTMLSelectElement;
    const newRole = select.value as ColumnRole;
    const previousRole = this.mappings[colIndex];

    let updated = [...this.mappings];
    if (newRole !== 'skip' && !this.isMultiValueRole(newRole)) {
      updated = updated.map((role, idx) => idx === colIndex ? newRole : (role === newRole ? 'skip' : role));

      setTimeout(() => {
        const selects = this.el.nativeElement.querySelectorAll('.o-column-mapper__select') as NodeListOf<HTMLSelectElement>;
        selects.forEach((sel, idx) => {
          if (idx !== colIndex) {
            sel.value = updated[idx] || 'skip';
          }
        });
      });
    } else {
      updated[colIndex] = newRole;
    }

    if (previousRole === 'measure' && newRole !== 'measure') {
      const { [colIndex]: _removed, ...rest } = this.measureUnits;
      this.measureUnits = rest;
      this.measureUnitsChange.emit(this.measureUnits);
    }

    this.mappings = updated;
    this.mappingsChange.emit(this.mappings);
  }

  protected onMeasureUnitChange(colIndex: number, unitCode: string): void {
    this.measureUnits = { ...this.measureUnits, [colIndex]: unitCode };
    this.measureUnitsChange.emit(this.measureUnits);
  }
}
