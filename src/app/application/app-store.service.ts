import { Injectable, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { Transaction } from '@domain/models/transaction';
import { CategoryInfo, CategoryType } from '@domain/models/category';
import { Budget } from '@domain/models/budget';
import { Customization } from '@domain/models/customization';
import { HistoryLog } from '@domain/models/history-log';
import { Account } from '@domain/models/account';
import { ImportBatch } from '@domain/models/import-batch';
import { Unit, BUILTIN_UNITS } from '@domain/models/unit';
import { CustomRecord } from '@domain/models/custom-record';
import { DbImportPreview } from '@domain/shared/db-snapshot.utils';
import { syncVacationWindow as computeVacationWindowSync } from '@domain/shared/project-transaction.utils';
import { classifyRecurringTransactions } from '@domain/shared/recurring-transaction-classifier';
import {
  CATEGORY_REPOSITORY_TOKEN,
  TRANSACTION_REPOSITORY_TOKEN,
  BUDGET_REPOSITORY_TOKEN,
  HISTORY_LOG_REPOSITORY_TOKEN,
  CUSTOMIZATION_REPOSITORY_TOKEN,
  ACCOUNT_REPOSITORY_TOKEN,
  IMPORT_BATCH_REPOSITORY_TOKEN,
  UNIT_REPOSITORY_TOKEN,
  CUSTOM_RECORD_REPOSITORY_TOKEN
} from './tokens';
import { formatDateLocal, parseLocalDate } from '@ibid/utils';
import { AppStore, APP_STORE_TOKEN } from './app-store';
import { CategoryMlService } from '@application/services/category-ml.service';
import { PerformanceMonitorService } from '@application/services/performance-monitor.service';
import { CategoryRepository } from '@domain/repositories/category.repository';
import { TransactionRepository } from '@domain/repositories/transaction.repository';
import { BudgetRepository } from '@domain/repositories/budget.repository';
import { HistoryLogRepository } from '@domain/repositories/history-log.repository';
import { CustomizationRepository } from '@domain/repositories/customization.repository';
import { AccountRepository } from '@domain/repositories/account.repository';
import { ImportBatchRepository } from '@domain/repositories/import-batch.repository';
import { UnitRepository } from '@domain/repositories/unit.repository';
import { CustomRecordRepository } from '@domain/repositories/custom-record.repository';

const ROLLING_PRESET_LOOKBACK_DAYS: Readonly<Record<string, number>> = {
  last_30_days: 30,
  last_60_days: 60,
  last_90_days: 90,
  last_120_days: 120,
  last_year: 365
};

@Injectable({
  providedIn: 'root'
})
export class AppStoreService implements AppStore {
  private readonly categoryRepository?: CategoryRepository;
  private readonly transactionRepository?: TransactionRepository;
  private readonly budgetRepository?: BudgetRepository;
  private readonly historyLogRepository?: HistoryLogRepository;
  private readonly customizationRepository?: CustomizationRepository;
  private readonly accountRepository?: AccountRepository;
  private readonly importBatchRepository?: ImportBatchRepository;
  private readonly unitRepository?: UnitRepository;
  private readonly customRecordRepository?: CustomRecordRepository;
  private readonly categoryMlService?: CategoryMlService;
  private readonly performanceMonitor = inject(PerformanceMonitorService);

  private hasLoadedInitialData = false;
  private loadInitialDataPromise: Promise<void> | null = null;

  constructor() {
    try {
      this.categoryRepository = inject(CATEGORY_REPOSITORY_TOKEN, { optional: true }) ?? undefined;
      this.transactionRepository = inject(TRANSACTION_REPOSITORY_TOKEN, { optional: true }) ?? undefined;
      this.budgetRepository = inject(BUDGET_REPOSITORY_TOKEN, { optional: true }) ?? undefined;
      this.historyLogRepository = inject(HISTORY_LOG_REPOSITORY_TOKEN, { optional: true }) ?? undefined;
      this.customizationRepository = inject(CUSTOMIZATION_REPOSITORY_TOKEN, { optional: true }) ?? undefined;
      this.accountRepository = inject(ACCOUNT_REPOSITORY_TOKEN, { optional: true }) ?? undefined;
      this.importBatchRepository = inject(IMPORT_BATCH_REPOSITORY_TOKEN, { optional: true }) ?? undefined;
      this.unitRepository = inject(UNIT_REPOSITORY_TOKEN, { optional: true }) ?? undefined;
      this.customRecordRepository = inject(CUSTOM_RECORD_REPOSITORY_TOKEN, { optional: true }) ?? undefined;
      this.categoryMlService = inject(CategoryMlService, { optional: true }) ?? undefined;
    } catch {}
    this.applyPreset(this.preset());
  }
  public readonly transactions = signal<Transaction[]>([]);
  public readonly categories = signal<CategoryInfo[]>([]);
  public readonly budgets = signal<Budget[]>([]);
  public readonly accounts = signal<Account[]>([]);
  public readonly importBatches = signal<ImportBatch[]>([]);
  public readonly units = signal<Unit[]>([...BUILTIN_UNITS]);
  public readonly customRecords = signal<CustomRecord[]>([]);
  public readonly startDate = signal<string>('');
  public readonly endDate = signal<string>('');
  public readonly preset = signal<string>('current_month');
  public readonly cycleStartDay = signal<number>(
    typeof window !== 'undefined' ? parseInt(localStorage.getItem('cycle_start_day') || '28', 10) : 28
  );
  public readonly minAvailableDate = signal<string>('');
  public readonly maxAvailableDate = signal<string>('');
  public readonly customizations = signal<Customization[]>([]);
  public readonly historyLogs = signal<HistoryLog[]>([]);

  private readonly fileSelectedSubject = new Subject<Event>();
  private readonly importClickedSubject = new Subject<void>();
  private readonly addClickedSubject = new Subject<void>();
  private readonly openVacationDetailSubject = new Subject<string>();
  private readonly resetImportsSubject = new Subject<void>();
  private readonly cycleStartDayChangeSubject = new Subject<number>();

  public readonly fileSelected$ = this.fileSelectedSubject.asObservable();
  public readonly importClicked$ = this.importClickedSubject.asObservable();
  public readonly addClicked$ = this.addClickedSubject.asObservable();
  public readonly openVacationDetail$ = this.openVacationDetailSubject.asObservable();
  public readonly resetImports$ = this.resetImportsSubject.asObservable();
  public readonly cycleStartDayChange$ = this.cycleStartDayChangeSubject.asObservable();

  public setDates(start: string, end: string): void {
    this.startDate.set(start);
    this.endDate.set(end);
  }

  public setTransactions(list: readonly Transaction[] | Transaction[]): void {
    const mutableList = [...list];
    this.transactions.set(mutableList);
    this.updateAvailableDates(mutableList);
  }

  public setCategories(cats: readonly CategoryInfo[] | CategoryInfo[]): void {
    this.categories.set([...cats]);
  }

  public setBudgets(list: readonly Budget[] | Budget[]): void {
    this.budgets.set([...list]);
  }

  public setCustomizations(list: readonly Customization[] | Customization[]): void {
    this.customizations.set([...list]);
  }

  public setHistoryLogs(list: readonly HistoryLog[] | HistoryLog[]): void {
    this.historyLogs.set([...list]);
  }

  public setAccounts(list: readonly Account[]): void {
    this.accounts.set([...list]);
  }

  public setImportBatches(list: readonly ImportBatch[]): void {
    this.importBatches.set([...list]);
  }

  public setUnits(list: readonly Unit[]): void {
    this.units.set([...list]);
  }

  public setCustomRecords(list: readonly CustomRecord[]): void {
    this.customRecords.set([...list]);
  }

  public async addAccount(account: Account): Promise<void> {
    if (this.accountRepository) {
      await this.accountRepository.save(account);
    }
    this.accounts.update(list => [...list, account]);
  }

  public async updateAccount(account: Account): Promise<void> {
    if (this.accountRepository) {
      await this.accountRepository.update(account);
    }
    this.accounts.update(list => list.map(a => a.id === account.id ? account : a));
  }

  public async deleteAccount(id: string): Promise<void> {
    if (this.accountRepository) {
      await this.accountRepository.delete(id);
    }
    this.accounts.update(list => list.filter(a => a.id !== id));

    const remainingTxs = this.transactions().filter(t => t.accountId !== id);
    const deletedTxs = this.transactions().filter(t => t.accountId === id);

    if (this.transactionRepository) {
      for (const tx of deletedTxs) {
        await this.transactionRepository.delete(tx.id);
      }
    }
    this.setTransactions(remainingTxs);

    const remainingBatches = this.importBatches().filter(b => b.accountId !== id);
    const deletedBatches = this.importBatches().filter(b => b.accountId === id);

    if (this.importBatchRepository) {
      for (const batch of deletedBatches) {
        await this.importBatchRepository.delete(batch.id);
      }
    }
    this.setImportBatches(remainingBatches);
  }

  public async addImportBatch(batch: ImportBatch): Promise<void> {
    if (this.importBatchRepository) {
      await this.importBatchRepository.save(batch);
    }
    this.importBatches.update(list => [...list, batch]);
  }

  public async addUnit(unit: Unit): Promise<void> {
    if (this.unitRepository) {
      await this.unitRepository.save(unit);
    }
    this.units.update(list => [...list, unit]);
  }

  public async addCustomRecords(records: readonly CustomRecord[]): Promise<void> {
    if (this.customRecordRepository) {
      await this.customRecordRepository.saveMany(records);
    }
    this.customRecords.update(list => [...list, ...records]);
  }

  public async importDbSnapshot(preview: DbImportPreview): Promise<void> {
    if (preview.accountsToImport.length > 0) {
      if (this.accountRepository) {
        for (const account of preview.accountsToImport) {
          await this.accountRepository.save(account);
        }
      }
      this.accounts.update(list => [...list, ...preview.accountsToImport]);
    }

    if (preview.categoriesToImport.length > 0) {
      if (this.categoryRepository) {
        for (const category of preview.categoriesToImport) {
          await this.categoryRepository.save(category);
        }
      }
      this.categories.update(list => [...list, ...preview.categoriesToImport]);
    }

    if (preview.budgetsToImport.length > 0) {
      if (this.budgetRepository) {
        for (const budget of preview.budgetsToImport) {
          await this.budgetRepository.save(budget);
        }
      }
      this.budgets.update(list => [...list, ...preview.budgetsToImport]);
    }

    if (preview.customRecordsToImport.length > 0) {
      if (this.customRecordRepository) {
        await this.customRecordRepository.saveMany(preview.customRecordsToImport);
      }
      this.customRecords.update(list => [...list, ...preview.customRecordsToImport]);
    }

    if (preview.transactionsToImport.length > 0) {
      if (this.transactionRepository) {
        await this.transactionRepository.saveAll(preview.transactionsToImport);
      }
      this.setTransactions([...this.transactions(), ...preview.transactionsToImport]);
    }
  }

  public setCycleStartDay(day: number): void {
    if (day >= 1 && day <= 31) {
      this.saveCustomization('cycle_start_day', day.toString());
      this.applyPreset(this.preset());
    }
  }

  public getCycleStartDayForDate(date: Date): number {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const customKey = `cycle_day_${year}-${month}`;
    const customVal = this.customizations().find(c => c.key === customKey);
    if (customVal) {
      const day = parseInt(customVal.value, 10);
      if (day >= 1 && day <= 31) return day;
    }
    return this.cycleStartDay();
  }

  private applyNonCyclePreset(preset: string, refDate: Date): boolean {
    if (preset === 'all_time') {
      this.startDate.set(this.minAvailableDate() || formatDateLocal(refDate));
      this.endDate.set(this.maxAvailableDate() || formatDateLocal(refDate));
      return true;
    }

    const lookbackDays = ROLLING_PRESET_LOOKBACK_DAYS[preset];
    if (lookbackDays === undefined) return false;

    const start = new Date(refDate);
    start.setDate(start.getDate() - lookbackDays);
    this.startDate.set(formatDateLocal(start));
    this.endDate.set(formatDateLocal(refDate));
    return true;
  }

  public applyPreset(preset: string): void {
    this.preset.set(preset);
    const today = new Date();
    const maxDateStr = this.maxAvailableDate();
    const refDate = maxDateStr ? parseLocalDate(maxDateStr) : today;
    const cycleStartDay = this.getCycleStartDayForDate(refDate);

    if (this.applyNonCyclePreset(preset, refDate)) return;

    let start: Date;
    let end: Date;

    const currentYear = refDate.getFullYear();
    const currentMonth = refDate.getMonth();
    const currentDay = refDate.getDate();

    if (preset === 'last_month') {
      if (currentDay >= cycleStartDay) {
        const startMonth = currentMonth - 1;
        const endMonth = currentMonth;
        const startCycleDay = this.getCycleStartDayForDate(new Date(currentYear, startMonth, 1));
        const endCycleDay = this.getCycleStartDayForDate(new Date(currentYear, endMonth, 1));
        start = new Date(currentYear, startMonth, startCycleDay);
        end = new Date(currentYear, endMonth, endCycleDay);
      } else {
        const startMonth = currentMonth - 2;
        const endMonth = currentMonth - 1;
        const startCycleDay = this.getCycleStartDayForDate(new Date(currentYear, startMonth, 1));
        const endCycleDay = this.getCycleStartDayForDate(new Date(currentYear, endMonth, 1));
        start = new Date(currentYear, startMonth, startCycleDay);
        end = new Date(currentYear, endMonth, endCycleDay);
      }
    } else if (preset === 'current_month') {
      if (currentDay >= cycleStartDay) {
        const startMonth = currentMonth;
        const endMonth = currentMonth + 1;
        const startCycleDay = this.getCycleStartDayForDate(new Date(currentYear, startMonth, 1));
        const endCycleDay = this.getCycleStartDayForDate(new Date(currentYear, endMonth, 1));
        start = new Date(currentYear, startMonth, startCycleDay);
        end = new Date(currentYear, endMonth, endCycleDay);
      } else {
        const startMonth = currentMonth - 1;
        const endMonth = currentMonth;
        const startCycleDay = this.getCycleStartDayForDate(new Date(currentYear, startMonth, 1));
        const endCycleDay = this.getCycleStartDayForDate(new Date(currentYear, endMonth, 1));
        start = new Date(currentYear, startMonth, startCycleDay);
        end = new Date(currentYear, endMonth, endCycleDay);
      }
    } else if (preset === 'quarter') {
      const baseEndMonth = currentDay >= cycleStartDay ? currentMonth : currentMonth - 1;
      const endCycleDay = this.getCycleStartDayForDate(new Date(currentYear, baseEndMonth, 1));
      end = new Date(currentYear, baseEndMonth, endCycleDay);

      const startMonth = baseEndMonth - 3;
      const startCycleDay = this.getCycleStartDayForDate(new Date(end.getFullYear(), startMonth, 1));
      start = new Date(end.getFullYear(), startMonth, startCycleDay);
    } else if (preset === 'semester') {
      const baseEndMonth = currentDay >= cycleStartDay ? currentMonth : currentMonth - 1;
      const endCycleDay = this.getCycleStartDayForDate(new Date(currentYear, baseEndMonth, 1));
      end = new Date(currentYear, baseEndMonth, endCycleDay);

      const startMonth = baseEndMonth - 6;
      const startCycleDay = this.getCycleStartDayForDate(new Date(end.getFullYear(), startMonth, 1));
      start = new Date(end.getFullYear(), startMonth, startCycleDay);
    } else {
      const baseEndMonth = currentDay >= cycleStartDay ? currentMonth : currentMonth - 1;
      const endCycleDay = this.getCycleStartDayForDate(new Date(currentYear, baseEndMonth, 1));
      end = new Date(currentYear, baseEndMonth, endCycleDay);

      const startMonth = baseEndMonth - 12;
      const startCycleDay = this.getCycleStartDayForDate(new Date(end.getFullYear(), startMonth, 1));
      start = new Date(end.getFullYear(), startMonth, startCycleDay);
    }

    this.startDate.set(formatDateLocal(start));
    this.endDate.set(formatDateLocal(end));
  }

  public importFile(event: Event): void {
    this.fileSelectedSubject.next(event);
  }

  public triggerImportClick(): void {
    this.importClickedSubject.next();
  }

  public triggerAddClick(): void {
    this.addClickedSubject.next();
  }

  public openVacationDetail(budgetId: string): void {
    this.openVacationDetailSubject.next(budgetId);
  }

  public resetImports(): void {
    this.resetImportsSubject.next();
  }

  private updateAvailableDates(all: readonly Transaction[]): void {
    if (all.length === 0) {
      this.maxAvailableDate.set('');
      this.minAvailableDate.set('');
      return;
    }
    const max = all.reduce((maxDate, t) => (t.date > maxDate ? t.date : maxDate), '');
    const min = all.reduce((minDate, t) => (t.date < minDate || !minDate ? t.date : minDate), '');
    this.maxAvailableDate.set(max);
    this.minAvailableDate.set(min);
  }

  public loadInitialData(): Promise<void> {
    if (this.hasLoadedInitialData) return Promise.resolve();

    if (!this.loadInitialDataPromise) {
      this.loadInitialDataPromise = this.performanceMonitor
        .measureAsync('AppStore.loadInitialData', () => this.fetchInitialData())
        .then(() => {
          this.hasLoadedInitialData = true;
        })
        .finally(() => {
          this.loadInitialDataPromise = null;
        });
    }

    return this.loadInitialDataPromise;
  }

  private async fetchInitialData(): Promise<void> {
    if (this.categoryMlService) {
      try {
        await this.categoryMlService.loadRules();
      } catch (err) {
        console.error('[AppStore] Failed to load ML rules:', err);
      }
    }
    if (this.customizationRepository) {
      const customs = await this.customizationRepository.getAll();
      this.setCustomizations(customs);
      const cycleDay = customs.find(c => c.key === 'cycle_start_day');
      if (cycleDay) {
        this.cycleStartDay.set(parseInt(cycleDay.value, 10));
      }
    }

    if (this.historyLogRepository) {
      const logs = await this.historyLogRepository.getAll();
      const sorted = [...logs].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      this.setHistoryLogs(sorted);
    }

    const e2eSeed = typeof window !== 'undefined'
      ? (window as unknown as { __E2E_SEED_DATA__?: { accounts: Account[]; categories: CategoryInfo[]; budgets: Budget[]; transactions: Transaction[]; customRecords?: CustomRecord[]; importBatches?: ImportBatch[]; customizations?: Customization[] } }).__E2E_SEED_DATA__
      : undefined;

    if (e2eSeed) {
      if (this.accounts().length === 0 && this.accountRepository && (await this.accountRepository.getAll()).length === 0) {
        for (const acc of e2eSeed.accounts) {
          await this.accountRepository.save(acc);
        }
      }
      if (this.categories().length === 0 && this.categoryRepository && (await this.categoryRepository.getAll()).length === 0) {
        for (const cat of e2eSeed.categories) {
          await this.categoryRepository.save(cat);
        }
      }
      if (this.budgets().length === 0 && this.budgetRepository && (await this.budgetRepository.getAll()).length === 0) {
        for (const b of e2eSeed.budgets) {
          await this.budgetRepository.save(b);
        }
      }
      if (this.transactions().length === 0 && this.transactionRepository && (await this.transactionRepository.getAll()).length === 0) {
        await this.transactionRepository.saveAll(e2eSeed.transactions);
      }
      if (e2eSeed.customRecords && this.customRecordRepository && (await this.customRecordRepository.getAll()).length === 0) {
        await this.customRecordRepository.saveMany(e2eSeed.customRecords);
      }
      if (e2eSeed.importBatches && this.importBatchRepository && (await this.importBatchRepository.getAll()).length === 0) {
        for (const batch of e2eSeed.importBatches) {
          await this.importBatchRepository.save(batch);
        }
      }
      if (e2eSeed.customizations && this.customizationRepository && (await this.customizationRepository.getAll()).length === 0) {
        for (const custom of e2eSeed.customizations) {
          await this.customizationRepository.save(custom);
        }
      }
    }

    if (this.categoryRepository) {
      const cats = await this.categoryRepository.getAll();
      this.setCategories(cats);
    }
    if (this.accountRepository) {
      const accs = await this.accountRepository.getAll();
      this.setAccounts(accs);
    }
    if (this.unitRepository) {
      const customUnits = await this.unitRepository.getAll();
      this.setUnits([...BUILTIN_UNITS, ...customUnits]);
    }
    if (this.customRecordRepository) {
      const records = await this.customRecordRepository.getAll();
      this.setCustomRecords(records);
    }
    if (this.importBatchRepository) {
      const batches = await this.importBatchRepository.getAll();
      this.setImportBatches(batches);
    }
    if (this.transactionRepository) {
      const txs = await this.transactionRepository.getAll();
      this.setTransactions(txs);
    }
    if (this.budgetRepository) {
      const budgets = await this.budgetRepository.getAll();
      this.setBudgets(budgets);
    }
    await this.autoAssignVacationTransactions();
    if (!this.startDate() || !this.endDate()) {
      this.applyPreset(this.preset());
    }
  }

  private async autoAssignVacationTransactions(): Promise<void> {
    const pendingVacations = this.budgets().filter(b =>
      b.type === 'project' && b.kind === 'vacation' && !b.transactionsAutoAssigned
    );

    for (const vacation of pendingVacations) {
      await this.syncVacationWindow(vacation);
    }
  }

  public async syncVacationWindow(vacation: Budget): Promise<void> {
    const classifications = classifyRecurringTransactions(this.transactions());
    const isRecurring = (t: Transaction): boolean => classifications.get(t.id)?.isRecurring ?? false;

    const { toAssign, toRelease } = computeVacationWindowSync(this.transactions(), vacation, isRecurring);

    for (const tx of toRelease) {
      await this.writeTransactionBudget(tx, undefined, false);
    }
    for (const tx of toAssign) {
      await this.writeTransactionBudget(tx, vacation.id, true);
    }

    if (!vacation.transactionsAutoAssigned) {
      await this.updateBudget({ ...vacation, transactionsAutoAssigned: true });
    }
  }

  private async writeHistoryLog(
    action: 'INSERT' | 'UPDATE' | 'DELETE',
    entity: 'transaction' | 'category' | 'budget' | 'customization',
    entityId: string,
    oldValue?: unknown,
    newValue?: unknown
  ): Promise<void> {
    if (!this.historyLogRepository) return;
    const log = this.buildHistoryLog(action, entity, entityId, oldValue, newValue);
    await this.historyLogRepository.save(log);
    this.historyLogs.update(list => [log, ...list]);
  }

  private buildHistoryLog(
    action: 'INSERT' | 'UPDATE' | 'DELETE',
    entity: 'transaction' | 'category' | 'budget' | 'customization',
    entityId: string,
    oldValue?: unknown,
    newValue?: unknown
  ): HistoryLog {
    return {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      action,
      entity,
      entityId,
      oldValue: oldValue ? JSON.stringify(oldValue) : undefined,
      newValue: newValue ? JSON.stringify(newValue) : undefined
    };
  }

  private async writeTransactionHistoryLogs(
    changes: readonly { readonly previous: Transaction; readonly updated: Transaction }[]
  ): Promise<void> {
    const repository = this.historyLogRepository;
    if (!repository) return;

    const logs = changes.map(change =>
      this.buildHistoryLog('UPDATE', 'transaction', change.updated.id, change.previous, change.updated)
    );
    await Promise.all(logs.map(log => repository.save(log)));
    this.historyLogs.update(list => [...[...logs].reverse(), ...list]);
  }

  public async updateTransactionCategory(tx: Transaction, newCategory: CategoryType): Promise<void> {
    const oldValue = { ...tx };
    const updated = { ...tx, category: newCategory };
    if (this.transactionRepository) {
      await this.transactionRepository.update(updated);
    }
    const current = [...this.transactions()];
    const idx = current.findIndex(t => t.id === tx.id);
    if (idx !== -1) {
      current[idx] = updated;
      this.setTransactions(current);
    }
    await this.writeHistoryLog('UPDATE', 'transaction', tx.id, oldValue, updated);
  }

  public async applyTransactionCategories(recategorized: readonly Transaction[]): Promise<void> {
    if (recategorized.length === 0) return;

    const cleanRecategorized: Transaction[] = recategorized.map(tx => ({
      ...tx,
      pendingReview: false
    }));

    const updatedById = new Map(cleanRecategorized.map(tx => [tx.id, tx]));
    const previousById = new Map(this.transactions().map(tx => [tx.id, tx]));

    if (this.transactionRepository) {
      await this.transactionRepository.saveAll(cleanRecategorized);
    }

    this.setTransactions(this.transactions().map(tx => updatedById.get(tx.id) ?? tx));

    const changes = cleanRecategorized
      .map(updated => ({ previous: previousById.get(updated.id), updated }))
      .filter((change): change is { previous: Transaction; updated: Transaction } => !!change.previous);

    await this.writeTransactionHistoryLogs(changes);
  }

  public async updateTransactionBudget(tx: Transaction, budgetId: string | undefined): Promise<void> {
    await this.writeTransactionBudget(tx, budgetId, false);
  }

  public async applyTransactionsBudget(
    txs: readonly Transaction[],
    budgetId: string | undefined
  ): Promise<void> {
    if (txs.length === 0) return;

    const updated: readonly Transaction[] = txs.map(tx => ({ ...tx, budgetId, budgetAutoAssigned: undefined }));
    const updatedById = new Map(updated.map(tx => [tx.id, tx]));
    const previousById = new Map(this.transactions().map(tx => [tx.id, tx]));

    if (this.transactionRepository) {
      await this.transactionRepository.saveAll(updated);
    }

    this.setTransactions(this.transactions().map(tx => updatedById.get(tx.id) ?? tx));

    const changes = updated
      .map(next => ({ previous: previousById.get(next.id), updated: next }))
      .filter((change): change is { previous: Transaction; updated: Transaction } => !!change.previous);

    await this.writeTransactionHistoryLogs(changes);
  }

  private async writeTransactionBudget(
    tx: Transaction,
    budgetId: string | undefined,
    assignedByWindow: boolean
  ): Promise<void> {
    const oldValue = { ...tx };
    const updated = { ...tx, budgetId, budgetAutoAssigned: assignedByWindow ? true : undefined };
    if (this.transactionRepository) {
      await this.transactionRepository.update(updated);
    }
    const current = [...this.transactions()];
    const idx = current.findIndex(t => t.id === tx.id);
    if (idx !== -1) {
      current[idx] = updated;
      this.setTransactions(current);
    }
    await this.writeHistoryLog('UPDATE', 'transaction', tx.id, oldValue, updated);
  }

  public learnCategoryRule(description: string, category: CategoryType): void {
    if (this.categoryMlService) {
      this.categoryMlService.learn(description, category);
    }
  }

  public async updateTransactionRecurrence(tx: Transaction, isRecurring: boolean | undefined): Promise<void> {
    if (tx.isRecurring === isRecurring) return;

    const oldValue = { ...tx };
    const updated = { ...tx, isRecurring };
    if (this.transactionRepository) {
      await this.transactionRepository.update(updated);
    }
    const current = [...this.transactions()];
    const idx = current.findIndex(t => t.id === tx.id);
    if (idx !== -1) {
      current[idx] = updated;
      this.setTransactions(current);
    }
    await this.writeHistoryLog('UPDATE', 'transaction', tx.id, oldValue, updated);
  }

  public async updateTransactionDuplicateReview(tx: Transaction, isDuplicate: boolean): Promise<void> {
    if (tx.isDuplicate === isDuplicate) return;

    const oldValue = { ...tx };
    const updated = { ...tx, isDuplicate };
    if (this.transactionRepository) {
      await this.transactionRepository.update(updated);
    }
    const current = [...this.transactions()];
    const idx = current.findIndex(t => t.id === tx.id);
    if (idx !== -1) {
      current[idx] = updated;
      this.setTransactions(current);
    }
    await this.writeHistoryLog('UPDATE', 'transaction', tx.id, oldValue, updated);
  }

  public async updateTransactionIncomeInclusion(tx: Transaction, countsAsIncome: boolean | undefined): Promise<void> {
    if (tx.countsAsIncome === countsAsIncome) return;

    const oldValue = { ...tx };
    const updated = { ...tx, countsAsIncome };
    if (this.transactionRepository) {
      await this.transactionRepository.update(updated);
    }
    const current = [...this.transactions()];
    const idx = current.findIndex(t => t.id === tx.id);
    if (idx !== -1) {
      current[idx] = updated;
      this.setTransactions(current);
    }
    await this.writeHistoryLog('UPDATE', 'transaction', tx.id, oldValue, updated);
  }

  public async updateTransactionTags(tx: Transaction, newTags: string[]): Promise<void> {
    const oldValue = { ...tx };
    const updated = { ...tx, tags: newTags };
    if (this.transactionRepository) {
      await this.transactionRepository.update(updated);
    }
    const current = [...this.transactions()];
    const idx = current.findIndex(t => t.id === tx.id);
    if (idx !== -1) {
      current[idx] = updated;
      this.setTransactions(current);
    }
    await this.writeHistoryLog('UPDATE', 'transaction', tx.id, oldValue, updated);
  }

  public async addBudget(budget: Budget): Promise<void> {
    if (this.budgetRepository) {
      await this.budgetRepository.save(budget);
    }
    this.budgets.update(list => [...list, budget]);
    await this.writeHistoryLog('INSERT', 'budget', budget.id, undefined, budget);
  }

  public async updateBudget(budget: Budget): Promise<void> {
    const oldValue = this.budgets().find(b => b.id === budget.id);
    if (this.budgetRepository) {
      await this.budgetRepository.save(budget);
    }
    this.budgets.update(list => list.map(b => b.id === budget.id ? budget : b));
    await this.writeHistoryLog('UPDATE', 'budget', budget.id, oldValue, budget);
  }

  public async deleteBudget(id: string): Promise<void> {
    const oldValue = this.budgets().find(b => b.id === id);
    if (this.budgetRepository) {
      await this.budgetRepository.delete(id);
    }
    this.budgets.update(list => list.filter(b => b.id !== id));
    await this.writeHistoryLog('DELETE', 'budget', id, oldValue, undefined);
  }

  public async saveCustomization(key: string, value: string): Promise<void> {
    if (this.customizationRepository) {
      const oldVal = this.customizations().find(c => c.key === key);
      const newVal = { key, value };
      await this.customizationRepository.save(newVal);
      this.customizations.update(list => {
        const idx = list.findIndex(c => c.key === key);
        if (idx !== -1) {
          const updated = [...list];
          updated[idx] = newVal;
          return updated;
        }
        return [...list, newVal];
      });

      if (key === 'cycle_start_day') {
        const day = parseInt(value, 10);
        this.cycleStartDay.set(day);
        this.cycleStartDayChangeSubject.next(day);
      }

      await this.writeHistoryLog(
        oldVal ? 'UPDATE' : 'INSERT',
        'customization',
        key,
        oldVal,
        newVal
      );
    }
  }

  public async deleteCustomization(key: string): Promise<void> {
    if (this.customizationRepository) {
      const oldVal = this.customizations().find(c => c.key === key);
      if (oldVal) {
        await this.customizationRepository.delete(key);
        this.customizations.update(list => list.filter(c => c.key !== key));

        if (key === 'cycle_start_day') {
          this.cycleStartDay.set(28);
          this.cycleStartDayChangeSubject.next(28);
        }

        await this.writeHistoryLog('DELETE', 'customization', key, oldVal, undefined);
      }
    }
  }

  public async undoChange(logId: string): Promise<void> {
    if (!this.historyLogRepository) return;
    const logs = this.historyLogs();
    const log = logs.find(l => l.id === logId);
    if (!log) return;

    try {
      const oldObj = log.oldValue ? JSON.parse(log.oldValue) : null;
      const newObj = log.newValue ? JSON.parse(log.newValue) : null;

      if (log.entity === 'transaction') {
        if (this.transactionRepository) {
          if (log.action === 'INSERT') {
            await this.transactionRepository.delete(log.entityId);
            this.setTransactions(this.transactions().filter(t => t.id !== log.entityId));
          } else if (log.action === 'DELETE') {
            await this.transactionRepository.update(oldObj);
            this.setTransactions([...this.transactions(), oldObj]);
          } else if (log.action === 'UPDATE') {
            await this.transactionRepository.update(oldObj);
            this.setTransactions(this.transactions().map(t => t.id === log.entityId ? oldObj : t));
          }
        }
      } else if (log.entity === 'budget') {
        if (this.budgetRepository) {
          if (log.action === 'INSERT') {
            await this.budgetRepository.delete(log.entityId);
            this.budgets.update(list => list.filter(b => b.id !== log.entityId));
          } else if (log.action === 'DELETE') {
            await this.budgetRepository.save(oldObj);
            this.budgets.update(list => [...list, oldObj]);
          } else if (log.action === 'UPDATE') {
            await this.budgetRepository.save(oldObj);
            this.budgets.update(list => list.map(b => b.id === log.entityId ? oldObj : b));
          }
        }
      } else if (log.entity === 'customization') {
        if (this.customizationRepository) {
          if (log.action === 'INSERT') {
            await this.customizationRepository.delete(log.entityId);
            this.customizations.update(list => list.filter(c => c.key !== log.entityId));
            if (log.entityId === 'cycle_start_day') {
              this.cycleStartDay.set(28);
            }
          } else if (log.action === 'DELETE') {
            await this.customizationRepository.save(oldObj);
            this.customizations.update(list => [...list, oldObj]);
            if (log.entityId === 'cycle_start_day') {
              this.cycleStartDay.set(parseInt(oldObj.value, 10));
            }
          } else if (log.action === 'UPDATE') {
            await this.customizationRepository.save(oldObj);
            this.customizations.update(list => list.map(c => c.key === log.entityId ? oldObj : c));
            if (log.entityId === 'cycle_start_day') {
              this.cycleStartDay.set(parseInt(oldObj.value, 10));
            }
          }
        }
      }

      await this.historyLogRepository.delete(logId);
      this.historyLogs.update(list => list.filter(l => l.id !== logId));
    } catch (err) {
      console.error('[AppStore] Failed to undo change:', err);
    }
  }

}

export function provideAppStore() {
  return {
    provide: APP_STORE_TOKEN,
    useClass: AppStoreService
  };
}
