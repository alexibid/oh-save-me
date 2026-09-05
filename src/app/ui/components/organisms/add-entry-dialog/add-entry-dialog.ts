import { Component, EventEmitter, Input, Output, OnChanges, OnDestroy, SimpleChanges, inject, ViewChild, TemplateRef } from '@angular/core';

import { Dialog, DialogRef, DialogModule } from '@angular/cdk/dialog';
import { I18N_SHARED, I18nService } from '@ui/shared/i18n-shared';
import { BottomSheetDialogComponent, IconComponent } from 'ibid-ui';

@Component({
  selector: 'ohsaveme-add-entry-dialog',
  standalone: true,
  imports: [DialogModule, IconComponent, BottomSheetDialogComponent, ...I18N_SHARED],
  templateUrl: './add-entry-dialog.html',
  styleUrl: './add-entry-dialog.scss'
})
export class AddEntryDialog implements OnChanges, OnDestroy {
  private readonly dialog = inject(Dialog);
  protected readonly i18n = inject(I18nService);

  private dialogRef?: DialogRef<unknown>;
  private openTimeout?: ReturnType<typeof setTimeout>;

  @ViewChild('dialogTemplate') dialogTemplate!: TemplateRef<unknown>;

  @Input({ required: true }) visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() optionSelected = new EventEmitter<'transaction' | 'custom_record'>();
  @Output() createAccountSelected = new EventEmitter<void>();
  @Output() importSelected = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']) {
      if (this.visible) {
        if (this.openTimeout) clearTimeout(this.openTimeout);
        this.openTimeout = setTimeout(() => this.openDialog());
      } else {
        this.closeDialog();
      }
    }
  }

  ngOnDestroy() {
    if (this.openTimeout) clearTimeout(this.openTimeout);
    this.closeDialog();
  }

  private openDialog() {
    if (!this.dialogRef && this.dialogTemplate) {
      this.dialogRef = this.dialog.open(this.dialogTemplate, {
        width: '95vw',
        maxWidth: '400px',
        disableClose: true,
        panelClass: 'o-add-entry-dialog-panel'
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

  selectOption(type: 'transaction' | 'custom_record') {
    this.closeDialog();
    this.optionSelected.emit(type);
  }

  selectCreateAccount() {
    this.closeDialog();
    this.createAccountSelected.emit();
  }

  selectImport() {
    this.closeDialog();
    this.importSelected.emit();
  }

  onCancel() {
    this.closeDialog();
    this.cancelled.emit();
  }
}
