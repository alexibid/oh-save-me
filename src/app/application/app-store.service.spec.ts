import { MOCK_SAVVY_STORE } from './app-store.mock';
import { TestBed } from '@angular/core/testing';
import { effect } from '@angular/core';
import { AppStoreService } from './app-store.service';
import {
  ACCOUNT_REPOSITORY_TOKEN,
  CATEGORY_REPOSITORY_TOKEN,
  BUDGET_REPOSITORY_TOKEN,
  TRANSACTION_REPOSITORY_TOKEN,
  CUSTOM_RECORD_REPOSITORY_TOKEN,
  HISTORY_LOG_REPOSITORY_TOKEN
} from './tokens';
import { computeDbImportPreview } from '@domain/shared/db-snapshot.utils';
import { Transaction } from '@domain/models/transaction';
import { Budget } from '@domain/models/budget';
import { CategoryType } from '@domain/models/category';
import { MOCK_TRANSACTIONS } from '@/mocks/transactions.mock';

describe('AppStoreService — importDbSnapshot', () => {
  let store: AppStoreService;

  const mockAccountRepository = { save: vi.fn().mockResolvedValue(undefined) };
  const mockCategoryRepository = { save: vi.fn().mockResolvedValue(undefined) };
  const mockBudgetRepository = { save: vi.fn().mockResolvedValue(undefined) };
  const mockTransactionRepository = { saveAll: vi.fn().mockResolvedValue(undefined) };
  const mockCustomRecordRepository = { saveMany: vi.fn().mockResolvedValue(undefined) };
  const mockHistoryLogRepository = { save: vi.fn().mockResolvedValue(undefined), getAll: vi.fn().mockResolvedValue([]) };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AppStoreService,
        { provide: ACCOUNT_REPOSITORY_TOKEN, useValue: mockAccountRepository },
        { provide: CATEGORY_REPOSITORY_TOKEN, useValue: mockCategoryRepository },
        { provide: BUDGET_REPOSITORY_TOKEN, useValue: mockBudgetRepository },
        { provide: TRANSACTION_REPOSITORY_TOKEN, useValue: mockTransactionRepository },
        { provide: CUSTOM_RECORD_REPOSITORY_TOKEN, useValue: mockCustomRecordRepository },
        { provide: HISTORY_LOG_REPOSITORY_TOKEN, useValue: mockHistoryLogRepository }
      ]
    });
    store = TestBed.inject(AppStoreService);
    vi.clearAllMocks();
  });

  it('persists every collection in the preview via its repository', async () => {
    await store.importDbSnapshot(MOCK_SAVVY_STORE.preview);

    expect(mockAccountRepository.save).toHaveBeenCalledWith(MOCK_SAVVY_STORE.account);
    expect(mockCategoryRepository.save).toHaveBeenCalledWith(MOCK_SAVVY_STORE.category);
    expect(mockBudgetRepository.save).toHaveBeenCalledWith(MOCK_SAVVY_STORE.budget);
    expect(mockCustomRecordRepository.saveMany).toHaveBeenCalledWith([MOCK_SAVVY_STORE.customRecord]);
    expect(mockTransactionRepository.saveAll).toHaveBeenCalledWith([MOCK_SAVVY_STORE.transaction]);
  });

  it('appends the imported records onto the existing signals, keeping what was already there', async () => {
    store.accounts.set([{ ...MOCK_SAVVY_STORE.account, id: 'existing' }]);
    store.transactions.set([{ ...MOCK_SAVVY_STORE.transaction, id: 'existing-tx' }]);

    await store.importDbSnapshot(MOCK_SAVVY_STORE.preview);

    expect(store.accounts().map(a => a.id)).toEqual(['existing', MOCK_SAVVY_STORE.account.id]);
    expect(store.transactions().map(t => t.id)).toEqual(['existing-tx', MOCK_SAVVY_STORE.transaction.id]);
    expect(store.categories()).toEqual([MOCK_SAVVY_STORE.category]);
    expect(store.budgets()).toEqual([MOCK_SAVVY_STORE.budget]);
    expect(store.customRecords()).toEqual([MOCK_SAVVY_STORE.customRecord]);
  });

  it('does not write any history-log entries for a bulk import', async () => {
    await store.importDbSnapshot(MOCK_SAVVY_STORE.preview);

    expect(mockHistoryLogRepository.save).not.toHaveBeenCalled();
  });

  it('skips repository calls entirely for collections with nothing to import', async () => {
    await store.importDbSnapshot(MOCK_SAVVY_STORE.emptyPreview);

    expect(mockAccountRepository.save).not.toHaveBeenCalled();
    expect(mockTransactionRepository.saveAll).not.toHaveBeenCalled();
    expect(mockCustomRecordRepository.saveMany).not.toHaveBeenCalled();
  });
});

describe('Cross-device .db merge — end to end (computeDbImportPreview → AppStoreService.importDbSnapshot)', () => {
  let store: AppStoreService;

  const mockAccountRepository = { save: vi.fn().mockResolvedValue(undefined) };
  const mockCategoryRepository = { save: vi.fn().mockResolvedValue(undefined) };
  const mockBudgetRepository = { save: vi.fn().mockResolvedValue(undefined) };
  const mockTransactionRepository = { saveAll: vi.fn().mockResolvedValue(undefined) };
  const mockCustomRecordRepository = { saveMany: vi.fn().mockResolvedValue(undefined) };
  const mockHistoryLogRepository = { save: vi.fn().mockResolvedValue(undefined), getAll: vi.fn().mockResolvedValue([]) };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AppStoreService,
        { provide: ACCOUNT_REPOSITORY_TOKEN, useValue: mockAccountRepository },
        { provide: CATEGORY_REPOSITORY_TOKEN, useValue: mockCategoryRepository },
        { provide: BUDGET_REPOSITORY_TOKEN, useValue: mockBudgetRepository },
        { provide: TRANSACTION_REPOSITORY_TOKEN, useValue: mockTransactionRepository },
        { provide: CUSTOM_RECORD_REPOSITORY_TOKEN, useValue: mockCustomRecordRepository },
        { provide: HISTORY_LOG_REPOSITORY_TOKEN, useValue: mockHistoryLogRepository }
      ]
    });
    store = TestBed.inject(AppStoreService);
    vi.clearAllMocks();
  });

  it('merges a .db export from another device into the existing local account instead of duplicating it (the reported bug)', async () => {
    await store.addAccount({
      id: 'acc_local_1754390000000', name: 'Conta Bancária Externa', updatedAt: 0, kind: 'financial',
      type: 'bank_account', scope: 'individual', includeInConsolidatedBalance: true, unit: 'EUR'
    });
    store.setTransactions([
      { id: 'tx_local_hash_a', date: '2026-06-01', description: 'Farmácia', amount: -12, category: 'Healthcare', accountId: 'acc_local_1754390000000' },
      { id: 'tx_local_hash_b', date: '2026-06-05', description: 'Supermercado', amount: -45, category: 'Groceries', accountId: 'acc_local_1754390000000' }
    ]);
    vi.clearAllMocks();

    const preview = computeDbImportPreview(MOCK_SAVVY_STORE.foreignSnapshot, {
      accounts: store.accounts(),
      transactions: store.transactions(),
      categories: store.categories(),
      budgets: store.budgets(),
      customRecords: store.customRecords()
    });

    await store.importDbSnapshot(preview);

    const bankAccounts = store.accounts().filter(a => a.name === 'Conta Bancária Externa');
    expect(bankAccounts).toHaveLength(1);
    expect(bankAccounts[0].id).toBe('acc_local_1754390000000');
    expect(store.accounts().map(a => a.name)).toEqual(['Conta Bancária Externa', 'Conta de Investimentos Externa']);

    expect(store.transactions()).toHaveLength(4);
    const bankTxs = store.transactions().filter(t => t.accountId === 'acc_local_1754390000000');
    expect(bankTxs.map(t => t.description).sort()).toEqual(['Farmácia', 'Restaurante', 'Supermercado']);
    expect(store.transactions().some(t => t.accountId === 'acc_foreign_bank')).toBe(false);

    expect(mockAccountRepository.save).toHaveBeenCalledTimes(1);
    expect(mockAccountRepository.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Conta de Investimentos Externa' }));
  });
});

describe('AppStoreService — auto-assign vacation transactions on load', () => {
  let store: AppStoreService;

  const mockTransactionRepository = { getAll: vi.fn(), update: vi.fn().mockResolvedValue(undefined) };
  const mockBudgetRepository = { getAll: vi.fn(), save: vi.fn().mockResolvedValue(undefined) };
  const mockHistoryLogRepository = { save: vi.fn().mockResolvedValue(undefined), getAll: vi.fn().mockResolvedValue([]) };

  const vacation: Budget = {
    id: 'proj-vacation', name: 'Férias', type: 'project', kind: 'vacation', amount: 1000,
    projectStartDate: '2026-08-10', projectEndDate: '2026-08-20'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AppStoreService,
        { provide: TRANSACTION_REPOSITORY_TOKEN, useValue: mockTransactionRepository },
        { provide: BUDGET_REPOSITORY_TOKEN, useValue: mockBudgetRepository },
        { provide: HISTORY_LOG_REPOSITORY_TOKEN, useValue: mockHistoryLogRepository }
      ]
    });
    store = TestBed.inject(AppStoreService);
    vi.clearAllMocks();
    mockHistoryLogRepository.getAll.mockResolvedValue([]);
  });

  it('assigns a transaction inside the vacation window to the project and marks the project as processed', async () => {
    const tx: Transaction = { id: 'tx-1', date: '2026-08-15', description: 'Uber', amount: -20, category: 'Transportation' };
    mockTransactionRepository.getAll.mockResolvedValue([tx]);
    mockBudgetRepository.getAll.mockResolvedValue([vacation]);

    await store.loadInitialData();

    expect(mockTransactionRepository.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'tx-1', budgetId: 'proj-vacation' }));
    expect(mockBudgetRepository.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'proj-vacation', transactionsAutoAssigned: true }));
    expect(store.transactions().find(t => t.id === 'tx-1')?.budgetId).toBe('proj-vacation');
  });

  it('never re-assigns once the project has already been processed, so a manual override sticks', async () => {
    const alreadyProcessed: Budget = { ...vacation, transactionsAutoAssigned: true };
    const tx: Transaction = { id: 'tx-1', date: '2026-08-15', description: 'Uber', amount: -20, category: 'Transportation' };
    mockTransactionRepository.getAll.mockResolvedValue([tx]);
    mockBudgetRepository.getAll.mockResolvedValue([alreadyProcessed]);

    await store.loadInitialData();

    expect(mockTransactionRepository.update).not.toHaveBeenCalled();
    expect(mockBudgetRepository.save).not.toHaveBeenCalled();
    expect(store.transactions().find(t => t.id === 'tx-1')?.budgetId).toBeUndefined();
  });

  it('does not assign a transaction dated outside the vacation window, but still marks the project as processed', async () => {
    const tx: Transaction = { id: 'tx-1', date: '2026-09-01', description: 'Uber', amount: -20, category: 'Transportation' };
    mockTransactionRepository.getAll.mockResolvedValue([tx]);
    mockBudgetRepository.getAll.mockResolvedValue([vacation]);

    await store.loadInitialData();

    expect(mockTransactionRepository.update).not.toHaveBeenCalled();
    expect(mockBudgetRepository.save).toHaveBeenCalledWith(expect.objectContaining({ transactionsAutoAssigned: true }));
  });

  it('does not overwrite a transaction that already has an explicit budgetId for a different project', async () => {
    const tx: Transaction = { id: 'tx-1', date: '2026-08-15', description: 'Uber', amount: -20, category: 'Transportation', budgetId: 'proj-other' };
    mockTransactionRepository.getAll.mockResolvedValue([tx]);
    mockBudgetRepository.getAll.mockResolvedValue([vacation]);

    await store.loadInitialData();

    expect(mockTransactionRepository.update).not.toHaveBeenCalled();
    expect(store.transactions().find(t => t.id === 'tx-1')?.budgetId).toBe('proj-other');
  });
});

describe('AppStoreService — syncVacationWindow', () => {
  let store: AppStoreService;

  const vacation: Budget = {
    id: 'proj-vac',
    name: 'Férias',
    type: 'project',
    kind: 'vacation',
    amount: 1000,
    projectStartDate: '2026-08-10',
    projectEndDate: '2026-08-20'
  };

  const makeTx = (id: string, date: string, extra: Partial<Transaction> = {}): Transaction => ({
    id,
    date,
    description: `Compra ${id}`,
    amount: -25,
    category: 'Others',
    ...extra
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AppStoreService,
        { provide: TRANSACTION_REPOSITORY_TOKEN, useValue: { update: vi.fn().mockResolvedValue(undefined) } },
        { provide: BUDGET_REPOSITORY_TOKEN, useValue: { save: vi.fn().mockResolvedValue(undefined), update: vi.fn().mockResolvedValue(undefined) } },
        { provide: HISTORY_LOG_REPOSITORY_TOKEN, useValue: { save: vi.fn().mockResolvedValue(undefined), getAll: vi.fn().mockResolvedValue([]) } }
      ]
    });
    store = TestBed.inject(AppStoreService);
    store.setBudgets([vacation]);
  });

  it('marks a movement it claims through the window, so a later re-sync knows it may release it', async () => {
    store.setTransactions([makeTx('t1', '2026-08-15')]);

    await store.syncVacationWindow(vacation);

    const claimed = store.transactions().find(t => t.id === 't1');
    expect(claimed?.budgetId).toBe('proj-vac');
    expect(claimed?.budgetAutoAssigned).toBe(true);
  });

  it('releases a window-claimed movement once the dates no longer cover it', async () => {
    store.setTransactions([makeTx('t1', '2026-08-15', { budgetId: 'proj-vac', budgetAutoAssigned: true })]);

    await store.syncVacationWindow({ ...vacation, projectStartDate: '2026-08-01', projectEndDate: '2026-08-05' });

    const released = store.transactions().find(t => t.id === 't1');
    expect(released?.budgetId).toBeUndefined();
    expect(released?.budgetAutoAssigned).toBeUndefined();
  });

  it('never releases a movement the user assigned by hand, even when it sits outside the window', async () => {
    store.setTransactions([makeTx('t1', '2026-06-01', { budgetId: 'proj-vac' })]);

    await store.syncVacationWindow(vacation);

    expect(store.transactions().find(t => t.id === 't1')?.budgetId).toBe('proj-vac');
  });

  it('leaves no auto-assigned mark when the user assigns a project by hand', async () => {
    const tx = makeTx('t1', '2026-08-15', { budgetId: 'proj-vac', budgetAutoAssigned: true });
    store.setTransactions([tx]);

    await store.updateTransactionBudget(tx, 'proj-other');

    expect(store.transactions().find(t => t.id === 't1')?.budgetAutoAssigned).toBeUndefined();
  });
});

describe('AppStoreService — applyTransactionCategories', () => {
  let store: AppStoreService;

  const recurring = MOCK_TRANSACTIONS.filter(t => t.description === 'Eletricidade EDP').slice(0, 3);
  const untouched = MOCK_TRANSACTIONS.find(t => t.description !== 'Eletricidade EDP')!;

  const transactionRepository = {
    saveAll: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined)
  };
  const historyLogRepository = {
    save: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue([])
  };

  const recategorized = (): readonly Transaction[] =>
    recurring.map(tx => ({ ...tx, category: 'Utilities' as CategoryType, pendingReview: false }));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AppStoreService,
        { provide: TRANSACTION_REPOSITORY_TOKEN, useValue: transactionRepository },
        { provide: HISTORY_LOG_REPOSITORY_TOKEN, useValue: historyLogRepository }
      ]
    });
    store = TestBed.inject(AppStoreService);
    vi.clearAllMocks();
    store.setTransactions([...recurring, untouched]);
  });

  it('persists the whole batch in a single repository round-trip', async () => {
    await store.applyTransactionCategories(recategorized());

    expect(transactionRepository.saveAll).toHaveBeenCalledTimes(1);
    expect(transactionRepository.saveAll).toHaveBeenCalledWith(recategorized());
    expect(transactionRepository.update).not.toHaveBeenCalled();
  });

  it('publishes the new categories to the transactions signal exactly once', async () => {
    let emissions = 0;
    TestBed.runInInjectionContext(() => effect(() => { store.transactions(); emissions++; }));
    TestBed.tick();
    emissions = 0;

    await store.applyTransactionCategories(recategorized());
    TestBed.tick();

    expect(emissions).toBe(1);
    const byId = new Map(store.transactions().map(t => [t.id, t]));
    for (const tx of recurring) {
      expect(byId.get(tx.id)?.category).toBe('Utilities');
    }
  });

  it('leaves transactions outside the batch untouched', async () => {
    await store.applyTransactionCategories(recategorized());

    const survivor = store.transactions().find(t => t.id === untouched.id);
    expect(survivor).toEqual(untouched);
  });

  it('records one history-log entry per recategorized transaction', async () => {
    await store.applyTransactionCategories(recategorized());

    expect(historyLogRepository.save).toHaveBeenCalledTimes(recurring.length);
    expect(store.historyLogs()).toHaveLength(recurring.length);
  });

  it('does nothing at all when the batch is empty', async () => {
    await store.applyTransactionCategories([]);

    expect(transactionRepository.saveAll).not.toHaveBeenCalled();
    expect(historyLogRepository.save).not.toHaveBeenCalled();
  });
});
