import { Component, EventEmitter, Input, Output, OnChanges, OnDestroy, SimpleChanges, inject, ViewChild, TemplateRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dialog, DialogRef, DialogModule } from '@angular/cdk/dialog';
import { FormsModule } from '@angular/forms';
import { CategoryInfo } from '@domain/models/category';
import { slugify } from '@ibid/utils';
import { I18N_SHARED, I18nService } from '@ui/shared/i18n-shared';
import { BottomSheetDialogComponent, IconComponent } from 'ibid-ui';

@Component({
  selector: 'ohsaveme-category-create-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, BottomSheetDialogComponent, ...I18N_SHARED, IconComponent, DialogModule],
  template: `
    <ng-template #dialogTemplate>
      <ibid-bottom-sheet-dialog class="o-category-create-dialog" (closeClicked)="onCancel()">
        <span sheet-title>Criar Nova Categoria</span>

        <div class="o-category-create-dialog__content">
          <div class="o-category-create-dialog__form-group">
            <label class="o-category-create-dialog__label">Nome da Categoria</label>
            <input
              type="text"
              class="a-input o-category-create-dialog__input"
              [(ngModel)]="categoryName"
              placeholder="Ex: Assinaturas, Supermercado, etc."
              required
            />
          </div>

          <div class="o-category-create-dialog__form-group">
            <label class="o-category-create-dialog__label">Cor da Categoria</label>
            <div class="o-category-create-dialog__colors-grid">
              @for (color of presetColors; track color) {
                <button
                  type="button"
                  class="o-category-create-dialog__color-circle"
                  [style.background-color]="color"
                  [class.o-category-create-dialog__color-circle--selected]="color === selectedColor()"
                  (click)="selectedColor.set(color)"
                ></button>
              }
            </div>
          </div>

          <div class="o-category-create-dialog__form-group">
            <label class="o-category-create-dialog__label">Ícone</label>
            <div class="o-category-create-dialog__icons-grid">
              @for (icon of presetIcons; track icon) {
                <button
                  type="button"
                  class="o-category-create-dialog__icon-btn"
                  [class.o-category-create-dialog__icon-btn--selected]="icon === selectedIcon()"
                  (click)="selectedIcon.set(icon)"
                >
                  <ibid-icon [name]="icon"></ibid-icon>
                </button>
              }
            </div>
          </div>
        </div>

        <div sheet-footer class="o-category-create-dialog__footer">
          <button
            type="button"
            class="a-button a-button--secondary"
            (click)="onCancel()"
          >Cancelar</button>
          <button
            type="button"
            class="a-button a-button--primary"
            [disabled]="!categoryName.trim()"
            (click)="onConfirm()"
          >Criar Categoria</button>
        </div>
      </ibid-bottom-sheet-dialog>
    </ng-template>
  `,
  styleUrl: './category-create-dialog.scss'
})
export class CategoryCreateDialogComponent implements OnChanges, OnDestroy {
  private readonly dialog = inject(Dialog);
  private dialogRef?: DialogRef<unknown>;
  private openTimeout?: ReturnType<typeof setTimeout>;

  @ViewChild('dialogTemplate') dialogTemplate!: TemplateRef<unknown>;

  @Input({ required: true }) visible = false;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() confirm = new EventEmitter<CategoryInfo>();
  @Output() cancel = new EventEmitter<void>();

  protected categoryName = '';
  protected readonly selectedColor = signal<string>('#3b82f6');
  protected readonly selectedIcon = signal<string>('label');

  protected readonly presetColors = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#14b8a6',
    '#6b7280',
    '#22c55e',
  ];

  protected readonly presetIcons = [
    'label',
    'home',
    'shopping_bag',
    'shopping_cart',
    'directions_car',
    'play_circle',
    'book',
    'favorite',
    'card_giftcard',
    'desktop_windows',
    'explore',
    'account_balance_wallet',
    'info',
    'show_chart',
  ];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']) {
      if (this.visible) {
        this.categoryName = '';
        this.selectedColor.set(this.presetColors[0]);
        this.selectedIcon.set(this.presetIcons[0]);
        if (this.openTimeout) clearTimeout(this.openTimeout);
        this.openTimeout = setTimeout(() => this.openDialog());
      } else {
        this.closeDialog();
      }
    }
  }

  ngOnDestroy() {
    if (this.openTimeout) {
      clearTimeout(this.openTimeout);
    }
    this.closeDialog();
  }

  private openDialog() {
    if (!this.dialogRef && this.dialogTemplate) {
      this.dialogRef = this.dialog.open(this.dialogTemplate, {
        width: '95vw',
        maxWidth: '400px',
        disableClose: true,
        panelClass: 'o-category-create-dialog-panel'
      });
      this.dialogRef?.closed.subscribe(() => {
        this.dialogRef = undefined;
        this.visibleChange.emit(false);
      });
    }
  }

  private closeDialog() {
    if (this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = undefined;
    }
  }

  onCancel() {
    this.closeDialog();
    this.cancel.emit();
  }

  onConfirm() {
    if (!this.categoryName.trim()) return;

    const id = slugify(this.categoryName);

    const newCategory: CategoryInfo = {
      id: id || `cat-${Date.now()}`,
      name: this.categoryName.trim(),
      icon: this.selectedIcon(),
      color: this.selectedColor()
    };

    this.closeDialog();
    this.confirm.emit(newCategory);
  }
}
