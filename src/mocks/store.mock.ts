import { signal, WritableSignal } from '@angular/core';
import { Subject } from 'rxjs';
import { vi, Mock } from 'vitest';
import { AppStore } from '@application/app-store';
import { Transaction } from '@domain/models/transaction';
import { CategoryInfo } from '@domain/models/category';
import { Budget } from '@domain/models/budget';
import { Account } from '@domain/models/account';
import { ImportBatch } from '@domain/models/import-batch';
import { Unit, BUILTIN_UNITS } from '@domain/models/unit';
import { CustomRecord } from '@domain/models/custom-record';
import { Customization } from '@domain/models/customization';
import { HistoryLog } from '@domain/models/history-log';
import { MOCK_ACCOUNTS } from './accounts.mock';
import { MOCK_CATEGORIES } from './categories.mock';
import { MOCK_BUDGETS } from './budgets.mock';
import { MOCK_TRANSACTIONS } from './transactions.mock';
import { MOCK_CUSTOM_RECORDS } from './custom-records.mock';
import { MOCK_IMPORT_BATCHES } from './import-batches.mock';
import { MOCK_CUSTOMIZATIONS } from './customizations.mock';

type SignalKeys =
  | 'transactions'
  | 'categories'
  | 'budgets'
  | 'customizations'
  | 'historyLogs'
  | 'accounts'
  | 'importBatches'
  | 'units'
  | 'customRecords'
  | 'startDate'
  | 'endDate'
  | 'preset'
  | 'cycleStartDay'
  | 'minAvailableDate'
  | 'maxAvailableDate';

type ObservableKeys =
  | 'fileSelected$'
  | 'importClicked$'
  | 'addClicked$'
  | 'openVacationDetail$'
  | 'resetImports$'
  | 'cycleStartDayChange$';

type MethodKeys = Exclude<keyof AppStore, SignalKeys | ObservableKeys>;

export type MockAppStore = {
  [K in MethodKeys]: Mock<AppStore[K]>;
} & {
  transactions: WritableSignal<Transaction[]>;
  categories: WritableSignal<CategoryInfo[]>;
  budgets: WritableSignal<Budget[]>;
  customizations: WritableSignal<Customization[]>;
  historyLogs: WritableSignal<HistoryLog[]>;
  accounts: WritableSignal<Account[]>;
  importBatches: WritableSignal<ImportBatch[]>;
  units: WritableSignal<Unit[]>;
  customRecords: WritableSignal<CustomRecord[]>;
  startDate: WritableSignal<string>;
  endDate: WritableSignal<string>;
  preset: WritableSignal<string>;
  cycleStartDay: WritableSignal<number>;
  minAvailableDate: WritableSignal<string>;
  maxAvailableDate: WritableSignal<string>;
  fileSelected$: Subject<Event>;
  importClicked$: Subject<void>;
  addClicked$: Subject<void>;
  openVacationDetail$: Subject<string>;
  resetImports$: Subject<void>;
  cycleStartDayChange$: Subject<number>;
};

export const createMockStore = (overrides?: Partial<MockAppStore>): MockAppStore => {
  const minDate = MOCK_TRANSACTIONS.reduce((min, t) => (!min || t.date < min ? t.date : min), '');
  const maxDate = MOCK_TRANSACTIONS.reduce((max, t) => (t.date > max ? t.date : max), '');

  const transactionsSignal = signal<Transaction[]>([...MOCK_TRANSACTIONS]);
  const categoriesSignal = signal<CategoryInfo[]>([...MOCK_CATEGORIES]);
  const budgetsSignal = signal<Budget[]>([...MOCK_BUDGETS]);
  const accountsSignal = signal<Account[]>([...MOCK_ACCOUNTS]);
  const importBatchesSignal = signal<ImportBatch[]>([...MOCK_IMPORT_BATCHES]);
  const unitsSignal = signal<Unit[]>([...BUILTIN_UNITS]);
  const customRecordsSignal = signal<CustomRecord[]>([...MOCK_CUSTOM_RECORDS]);
  const customizationsSignal = signal<Customization[]>([...MOCK_CUSTOMIZATIONS]);
  const historyLogsSignal = signal<HistoryLog[]>([]);
  const startDateSignal = signal<string>('2026-07-28');
  const endDateSignal = signal<string>('2026-08-28');
  const presetSignal = signal<string>('current_month');
  const cycleStartDaySignal = signal<number>(28);
  const minAvailableDateSignal = signal<string>(minDate);
  const maxAvailableDateSignal = signal<string>(maxDate);

  return {
    transactions: transactionsSignal,
    categories: categoriesSignal,
    budgets: budgetsSignal,
    accounts: accountsSignal,
    importBatches: importBatchesSignal,
    units: unitsSignal,
    customRecords: customRecordsSignal,
    customizations: customizationsSignal,
    historyLogs: historyLogsSignal,
    startDate: startDateSignal,
    endDate: endDateSignal,
    preset: presetSignal,
    cycleStartDay: cycleStartDaySignal,
    minAvailableDate: minAvailableDateSignal,
    maxAvailableDate: maxAvailableDateSignal,
    loadInitialData: vi.fn().mockResolvedValue(undefined),
    updateTransactionCategory: vi.fn().mockResolvedValue(undefined),
    applyTransactionCategories: vi.fn().mockResolvedValue(undefined),
    updateTransactionBudget: vi.fn().mockResolvedValue(undefined),
    applyTransactionsBudget: vi.fn().mockResolvedValue(undefined),
    syncVacationWindow: vi.fn().mockResolvedValue(undefined),
    updateTransactionTags: vi.fn().mockResolvedValue(undefined),
    updateTransactionRecurrence: vi.fn().mockResolvedValue(undefined),
    updateTransactionIncomeInclusion: vi.fn().mockResolvedValue(undefined),
    updateTransactionDuplicateReview: vi.fn().mockResolvedValue(undefined),
    learnCategoryRule: vi.fn(),
    addBudget: vi.fn().mockResolvedValue(undefined),
    updateBudget: vi.fn().mockResolvedValue(undefined),
    deleteBudget: vi.fn().mockResolvedValue(undefined),
    saveCustomization: vi.fn().mockResolvedValue(undefined),
    deleteCustomization: vi.fn().mockResolvedValue(undefined),
    undoChange: vi.fn().mockResolvedValue(undefined),
    applyPreset: vi.fn(),
    setDates: vi.fn().mockImplementation((start: string, end: string) => {
      startDateSignal.set(start);
      endDateSignal.set(end);
    }),
    setTransactions: vi.fn().mockImplementation((txs: Transaction[]) => {
      transactionsSignal.set([...txs]);
    }),
    setCategories: vi.fn().mockImplementation((cats: CategoryInfo[]) => {
      categoriesSignal.set([...cats]);
    }),
    setBudgets: vi.fn().mockImplementation((buds: Budget[]) => {
      budgetsSignal.set([...buds]);
    }),
    setCustomizations: vi.fn().mockImplementation((customs: Customization[]) => {
      customizationsSignal.set([...customs]);
    }),
    setHistoryLogs: vi.fn().mockImplementation((logs: HistoryLog[]) => {
      historyLogsSignal.set([...logs]);
    }),
    setAccounts: vi.fn().mockImplementation((accs: Account[]) => {
      accountsSignal.set([...accs]);
    }),
    setImportBatches: vi.fn().mockImplementation((batches: ImportBatch[]) => {
      importBatchesSignal.set([...batches]);
    }),
    setUnits: vi.fn().mockImplementation((u: Unit[]) => {
      unitsSignal.set([...u]);
    }),
    setCustomRecords: vi.fn().mockImplementation((records: CustomRecord[]) => {
      customRecordsSignal.set([...records]);
    }),
    addAccount: vi.fn().mockResolvedValue(undefined),
    updateAccount: vi.fn().mockResolvedValue(undefined),
    deleteAccount: vi.fn().mockResolvedValue(undefined),
    addImportBatch: vi.fn().mockResolvedValue(undefined),
    addUnit: vi.fn().mockResolvedValue(undefined),
    addCustomRecords: vi.fn().mockResolvedValue(undefined),
    importDbSnapshot: vi.fn().mockResolvedValue(undefined),
    setCycleStartDay: vi.fn().mockImplementation((day: number) => {
      cycleStartDaySignal.set(day);
    }),
    importFile: vi.fn(),
    triggerImportClick: vi.fn(),
    triggerAddClick: vi.fn(),
    openVacationDetail: vi.fn(),
    resetImports: vi.fn(),
    fileSelected$: new Subject<Event>(),
    importClicked$: new Subject<void>(),
    addClicked$: new Subject<void>(),
    openVacationDetail$: new Subject<string>(),
    resetImports$: new Subject<void>(),
    cycleStartDayChange$: new Subject<number>(),
    ...overrides
  };
};
