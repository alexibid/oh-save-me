import { signal } from '@angular/core';
import { Transaction } from '@domain/models/transaction';
import { Budget } from '@domain/models/budget';
import { Account } from '@domain/models/account';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DIALOG_DATA, DialogModule, DialogRef } from '@angular/cdk/dialog';
import { DbImportPreviewDialogComponent, DbImportPreviewDialogData } from './db-import-preview-dialog';
import { TransactionsTableComponent } from '@ui/components/organisms/transactions-table/transactions-table';
import { APP_STORE_TOKEN } from '@application/app-store';
import { DbImportPreview } from '@domain/shared/db-snapshot.utils';

describe('DbImportPreviewDialogComponent', () => {
  let fixture: ComponentFixture<DbImportPreviewDialogComponent>;
  let component: DbImportPreviewDialogComponent;
  let dialogRefSpy: { close: ReturnType<typeof vi.fn> };
  let mockStore: { categories: ReturnType<typeof signal>; importDbSnapshot: ReturnType<typeof vi.fn> };

  const account = { id: 'a1', name: 'Wallet' };
  const transaction = { id: 't1', date: '2026-01-01', description: 'Coffee', amount: -3, category: 'cat-1' };

  function setup(preview: DbImportPreview) {
    dialogRefSpy = { close: vi.fn() };
    mockStore = {
      categories: signal([{ id: 'cat-1', name: 'Coffee', icon: 'label', color: '#000' }]),
      importDbSnapshot: vi.fn().mockResolvedValue(undefined)
    };

    TestBed.configureTestingModule({
      imports: [DbImportPreviewDialogComponent, DialogModule],
      providers: [
        { provide: DIALOG_DATA, useValue: { preview } as DbImportPreviewDialogData },
        { provide: DialogRef, useValue: dialogRefSpy },
        { provide: APP_STORE_TOKEN, useValue: mockStore }
      ]

    });

    fixture = TestBed.createComponent(DbImportPreviewDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  const previewWithTransactions: DbImportPreview = {
    accountsToImport: [account as unknown as Account],
    categoriesToImport: [],
    budgetsToImport: [{ id: 'b1' } as unknown as Budget],
    customRecordsToImport: [],
    transactionsToImport: [transaction as unknown as Transaction],
    skippedCounts: { accounts: 2, categories: 3, budgets: 0, customRecords: 1, transactions: 5 }
  };

  it('renders the per-collection new-record counts', () => {
    setup(previewWithTransactions);

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('1');
    expect(text).toContain('5');
  });

  it('renders a transactions table with the movements that will be imported', () => {
    setup(previewWithTransactions);

    const table = fixture.debugElement.query(By.directive(TransactionsTableComponent));
    expect(table).toBeTruthy();
    expect(table.componentInstance.transactions).toEqual([transaction]);
    expect(table.componentInstance.showActions).toBe(false);
  });

  it('shows the no-new-transactions empty state when nothing new is coming in', () => {
    setup({ ...previewWithTransactions, transactionsToImport: [] });

    expect(fixture.debugElement.query(By.directive(TransactionsTableComponent))).toBeFalsy();
    expect(fixture.nativeElement.textContent.toLowerCase()).toContain('nenhum');
  });

  it('persists the preview and closes with true on confirm', async () => {
    setup(previewWithTransactions);

    await component['onConfirm']();

    expect(mockStore.importDbSnapshot).toHaveBeenCalledWith(previewWithTransactions);
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });

  it('closes without persisting anything on cancel', () => {
    setup(previewWithTransactions);

    component['onCancel']();

    expect(mockStore.importDbSnapshot).not.toHaveBeenCalled();
    expect(dialogRefSpy.close).toHaveBeenCalledWith();
  });
});
