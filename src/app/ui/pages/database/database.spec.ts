import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { of } from 'rxjs';
import { DatabaseComponent } from './database';
import { APP_STORE_TOKEN } from '@application/app-store';
import { CATEGORY_REPOSITORY_TOKEN, TRANSACTION_REPOSITORY_TOKEN, BUDGET_REPOSITORY_TOKEN, CUSTOMIZATION_REPOSITORY_TOKEN, HISTORY_LOG_REPOSITORY_TOKEN } from '@application/tokens';
import { createMockStore } from '@/mocks/store.mock';
import { createMockTransactionRepository, createMockCategoryRepository, createMockBudgetRepository, createMockCustomizationRepository, createMockHistoryLogRepository } from '@/mocks/repositories.mock';

describe('DatabaseComponent', () => {
  let component: DatabaseComponent;
  let fixture: ComponentFixture<DatabaseComponent>;
  let dialogOpenSpy: ReturnType<typeof vi.spyOn>;

  const mockStore = createMockStore();
  const mockTransactionRepository = createMockTransactionRepository();
  const mockCategoryRepository = createMockCategoryRepository();
  const mockBudgetRepository = createMockBudgetRepository();
  const mockCustomizationRepository = createMockCustomizationRepository();
  const mockHistoryLogRepository = createMockHistoryLogRepository();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatabaseComponent],
      providers: [
        { provide: APP_STORE_TOKEN, useValue: mockStore },
        { provide: TRANSACTION_REPOSITORY_TOKEN, useValue: mockTransactionRepository },
        { provide: CATEGORY_REPOSITORY_TOKEN, useValue: mockCategoryRepository },
        { provide: BUDGET_REPOSITORY_TOKEN, useValue: mockBudgetRepository },
        { provide: CUSTOMIZATION_REPOSITORY_TOKEN, useValue: mockCustomizationRepository },
        { provide: HISTORY_LOG_REPOSITORY_TOKEN, useValue: mockHistoryLogRepository }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DatabaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    dialogOpenSpy = vi.spyOn(Dialog.prototype, 'open').mockReturnValue({ closed: of(false) } as unknown as DialogRef<unknown>);

  });

  it('should create database manager page', () => {
    expect(component).toBeTruthy();
  });

  it('should export backup safely', () => {
    const spy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('mock-url');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const dummyAnchor = { click: vi.fn(), href: '', download: '' };
    const originalCreate = document.createElement.bind(document);
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return dummyAnchor as unknown as HTMLAnchorElement;
      }
      return originalCreate(tagName);
    });

    component['exportBackup']();

    expect(spy).toHaveBeenCalled();
    expect(dummyAnchor.click).toHaveBeenCalled();
    expect(dummyAnchor.download).toContain('app_backup_');
    expect(dummyAnchor.download).toMatch(/\.json$/);

    spy.mockRestore();
    revokeSpy.mockRestore();
    createSpy.mockRestore();
  });

  it('opens the import preview dialog with a computed diff instead of destructively replacing the database', async () => {
    mockStore.transactions.set([]);
    mockStore.accounts.set([]);
    const file = new File(
      [JSON.stringify({
        version: 1,
        exportDate: '2026-01-01T00:00:00.000Z',
        data: {
          accounts: [],
          transactions: [{ id: 't1', date: '2026-01-01', description: 'Coffee', amount: -3, category: 'cat-1' }],
          categories: [],
          budgets: [],
          customRecords: []
        }
      })],
      'backup.db',
      { type: 'application/json' }
    );
    const input = document.createElement('input');
    input.type = 'file';
    Object.defineProperty(input, 'files', { value: [file] });

    component['triggerFileImport']({ target: input } as unknown as Event);

    await vi.waitFor(() => {
      expect(dialogOpenSpy).toHaveBeenCalled();
    });

    const dialogData = dialogOpenSpy.mock.calls[0][1].data;
    expect(dialogData.preview.transactionsToImport).toEqual([
      { id: 't1', date: '2026-01-01', description: 'Coffee', amount: -3, category: 'cat-1' }
    ]);
  });

  it('should trigger confirm reset and perform factory reset', async () => {
    component['askResetDatabase']();
    expect(component['isConfirmReset']()).toBe(true);

    await component['confirmResetDatabase']();
    expect(mockTransactionRepository.clear).toHaveBeenCalled();
    expect(mockCategoryRepository.clear).toHaveBeenCalled();
    expect(mockBudgetRepository.clear).toHaveBeenCalled();
    expect(mockStore.setTransactions).toHaveBeenCalledWith([]);
    expect(mockStore.setCategories).toHaveBeenCalledWith([]);
    expect(mockStore.setBudgets).toHaveBeenCalledWith([]);
    expect(component['isConfirmReset']()).toBe(false);
  });

  it('should trigger confirm reset imports and clear transactions and fingerprints', async () => {
    component['askResetImports']();
    expect(component['isConfirmResetImports']()).toBe(true);

    await component['confirmResetImports']();
    expect(mockTransactionRepository.clear).toHaveBeenCalled();
    expect(mockStore.setTransactions).toHaveBeenCalledWith([]);
    expect(component['isConfirmResetImports']()).toBe(false);
  });

  it('should support triggerUndo on history log change', async () => {
    mockStore.undoChange.mockResolvedValueOnce(undefined);
    await component['triggerUndo']('log-123');
    expect(mockStore.undoChange).toHaveBeenCalledWith('log-123');
  });

  describe('account editing', () => {
    const account = {
      id: 'acc_1', kind: 'financial' as const, name: 'Trade Republic', type: 'bank_account' as const,
      scope: 'individual' as const, includeInConsolidatedBalance: true, unit: 'EUR', updatedAt: 0
    };

    it('should enter edit mode pre-filled with the account current name and type', () => {
      component['startEditAccount'](account);

      expect(component['editingAccountId']()).toBe('acc_1');
      expect(component['editAccountName']).toBe('Trade Republic');
      expect(component['editAccountType']).toBe('bank_account');
    });

    it('should persist the corrected name/type via the store and exit edit mode', async () => {
      component['startEditAccount'](account);
      component['editAccountName'] = 'Carteira Trade Republic';
      component['editAccountType'] = 'investment';

      await component['saveEditAccount'](account);

      expect(mockStore.updateAccount).toHaveBeenCalledWith(expect.objectContaining({
        id: 'acc_1', name: 'Carteira Trade Republic', type: 'investment'
      }));
      expect(component['editingAccountId']()).toBe('');
    });

    it('should not save when the edited name is blank', async () => {
      mockStore.updateAccount.mockClear();
      component['startEditAccount'](account);
      component['editAccountName'] = '   ';

      await component['saveEditAccount'](account);

      expect(mockStore.updateAccount).not.toHaveBeenCalled();
    });

    it('should discard changes on cancel', () => {
      component['startEditAccount'](account);
      component['cancelEditAccount']();

      expect(component['editingAccountId']()).toBe('');
    });
  });
});
