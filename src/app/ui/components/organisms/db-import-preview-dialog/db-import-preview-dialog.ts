import { Component, inject } from '@angular/core';

import { DIALOG_DATA, DialogRef, DialogModule } from '@angular/cdk/dialog';
import { useStore } from '@application/app-store';
import { DbImportPreview } from '@domain/shared/db-snapshot.utils';
import { I18N_SHARED } from '@ui/shared/i18n-shared';
import { TransactionsTableComponent } from '@ui/components/organisms/transactions-table/transactions-table';
import { BottomSheetDialogComponent } from 'ibid-ui';

export interface DbImportPreviewDialogData {
  readonly preview: DbImportPreview;
}

@Component({
  selector: 'ohsaveme-db-import-preview-dialog',
  standalone: true,
  imports: [DialogModule, TransactionsTableComponent, BottomSheetDialogComponent, I18N_SHARED],
  templateUrl: './db-import-preview-dialog.html',
  styleUrl: './db-import-preview-dialog.scss'
})
export class DbImportPreviewDialogComponent {
  protected readonly store = useStore();
  protected readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);
  protected readonly data = inject<DbImportPreviewDialogData>(DIALOG_DATA);

  protected readonly categoryOptions = this.store.categories;

  protected async onConfirm(): Promise<void> {
    if (this.data?.preview) {
      await this.store.importDbSnapshot(this.data.preview);
    }
    this.dialogRef.close(true);
  }

  protected onCancel(): void {
    this.dialogRef.close();
  }

}
