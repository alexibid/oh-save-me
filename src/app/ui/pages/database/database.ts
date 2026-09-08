import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { DatabaseRow } from './database-row';
import { BudgetType } from '@domain/models/budget';

import { FormsModule } from '@angular/forms';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { useStore } from '@application/app-store';
import { CATEGORY_REPOSITORY_TOKEN, TRANSACTION_REPOSITORY_TOKEN, BUDGET_REPOSITORY_TOKEN } from '@application/tokens';
import { I18nService } from '@ui/shared/i18n-shared';
import { FinancialAccount, AccountType, isFinancialAccount } from '@domain/models/account';
import { DbSnapshot, computeDbImportPreview } from '@domain/shared/db-snapshot.utils';
import { DbImportPreviewDialogComponent } from '@ui/components/organisms/db-import-preview-dialog/db-import-preview-dialog';
import { AppTranslatePipe } from '@ui/pipes/app-translate.pipe';
import { DbHistoryLogsComponent } from '@ui/components/organisms/db-history-logs/db-history-logs';
import { DbDataViewerComponent } from '@ui/components/organisms/db-data-viewer/db-data-viewer';
import { DbSyncCardComponent } from '@ui/components/organisms/db-sync-card/db-sync-card';
import { ShareAccessManagerComponent } from '@ui/components/organisms/share-access-manager/share-access-manager';
import { AccountScope } from '@domain/models/account';
import { downloadBackupJson } from './database-scanner';
import {
  BottomSheetDialogComponent,
  ButtonComponent,
  CardComponent,
  CurrencyDisplayComponent,
  HandDrawnDirective,
  IconButtonComponent,
  IconComponent,
  SegmentOption,
  SegmentedControlComponent
} from 'ibid-ui';

@Component({
  selector: 'ohsaveme-database',
  standalone: true,
  imports: [
    CurrencyDisplayComponent,
    IconComponent,
    FormsModule,
    DialogModule,
    AppTranslatePipe,
    CardComponent,
    ButtonComponent,
    HandDrawnDirective,
    IconButtonComponent,
    DbSyncCardComponent,
    DbHistoryLogsComponent,
    DbDataViewerComponent,
    ShareAccessManagerComponent,
    SegmentedControlComponent,
    BottomSheetDialogComponent
],
  templateUrl: './database.html',
  styleUrl: './database.scss'
})
export class DatabaseComponent implements OnInit {
  protected readonly store = useStore();
  protected readonly i18n = inject(I18nService);
  private readonly dialog = inject(Dialog);

  private readonly categoryRepository = inject(CATEGORY_REPOSITORY_TOKEN, { optional: true });
  private readonly transactionRepository = inject(TRANSACTION_REPOSITORY_TOKEN, { optional: true });
  private readonly budgetRepository = inject(BUDGET_REPOSITORY_TOKEN, { optional: true });

  protected readonly logs = signal<string[]>([]);
  protected readonly isConfirmReset = signal<boolean>(false);
  protected readonly isConfirmResetImports = signal<boolean>(false);
  protected readonly isConfirmResetImportsDB = signal<boolean>(false);

  protected readonly selectedDBName = signal<string>('');
  protected readonly dbRows = signal<DatabaseRow[]>([]);

  async ngOnInit(): Promise<void> {
    try {
      await this.store.loadInitialData();
    } catch {}
  }

  protected addLog(message: string): void {
    const time = new Date().toLocaleTimeString();
    this.logs.update(current => [...current, `[${time}] ${message}`]);
  }

  protected clearLogs(): void {
    this.logs.set([]);
  }

  protected exportBackup(): void {
    try {
      const backup: DbSnapshot = {
        version: 1,
        exportDate: new Date().toISOString(),
        data: {
          accounts: this.store.accounts(),
          transactions: this.store.transactions(),
          categories: this.store.categories(),
          budgets: this.store.budgets(),
          customRecords: this.store.customRecords()
        }
      };

      downloadBackupJson(backup);

      this.addLog(
        this.i18n.translate('databaseBackupExported')
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.addLog(
        `${this.i18n.translate('databaseBackupExportError')}: ${errMsg}`
      );
    }
  }

  protected triggerFileImport(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const text = reader.result as string;
        const backup = JSON.parse(text);

        if (!backup.data || !backup.data.transactions || !backup.data.categories || !backup.data.budgets) {
          throw new Error(
            this.i18n.translate('databaseBackupInvalid')
          );
        }

        const snapshot: DbSnapshot = {
          version: 1,
          exportDate: backup.exportDate ?? new Date().toISOString(),
          data: {
            accounts: backup.data.accounts ?? [],
            transactions: backup.data.transactions,
            categories: backup.data.categories,
            budgets: backup.data.budgets,
            customRecords: backup.data.customRecords ?? []
          }
        };

        const preview = computeDbImportPreview(snapshot, {
          accounts: this.store.accounts(),
          transactions: this.store.transactions(),
          categories: this.store.categories(),
          budgets: this.store.budgets(),
          customRecords: this.store.customRecords()
        });

        this.addLog(
          this.i18n.translate('databaseFileLoaded')
        );

        const dialogRef = this.dialog.open(DbImportPreviewDialogComponent, {
          width: '95vw',
          maxWidth: '800px',
          data: { preview }
        });

        dialogRef.closed.subscribe(async (confirmed: unknown) => {

          if (!confirmed) {
            this.addLog(
              this.i18n.translate('databaseImportCancelled')
            );
            return;
          }
          this.addLog(
            `${this.i18n.translate('databaseImportComplete')} ${preview.transactionsToImport.length} `
            + `${this.i18n.translate('databaseImportCompleteMovements')}`
          );
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.addLog(
          `${this.i18n.translate('databaseFileLoadError')}: ${errMsg}`
        );
      } finally {
        input.value = '';
      }
    };

    reader.readAsText(file);
  }

  protected askResetDatabase(): void {
    this.isConfirmReset.set(true);
  }

  protected async confirmResetDatabase(): Promise<void> {
    this.addLog(
      this.i18n.translate('databaseFactoryResetStart')
    );

    try {
      if (this.transactionRepository) await this.transactionRepository.clear();
      if (this.categoryRepository) await this.categoryRepository.clear();
      if (this.budgetRepository) await this.budgetRepository.clear();

      this.store.setTransactions([]);
      this.store.setCategories([]);
      this.store.setBudgets([]);

      this.addLog(
        this.i18n.translate('databaseFactoryResetDone')
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.addLog(
        `${this.i18n.translate('databaseFactoryResetError')}: ${errMsg}`
      );
    } finally {
      this.isConfirmReset.set(false);
    }
  }

  protected cancelResetDatabase(): void {
    this.isConfirmReset.set(false);
  }

  protected askResetImports(): void {
    this.isConfirmResetImports.set(true);
  }

  protected async confirmResetImports(): Promise<void> {
    this.addLog(
      this.i18n.translate('databaseClearImportsStart')
    );

    try {
      if (this.transactionRepository) {
        await this.transactionRepository.clear();
      }
      this.store.setTransactions([]);

      if (typeof window !== 'undefined') {
        localStorage.removeItem('imported_fingerprints');
      }

      this.addLog(
        this.i18n.translate('databaseClearImportsDone')
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.addLog(
        `${this.i18n.translate('databaseClearImportsError')}: ${errMsg}`
      );
    } finally {
      this.isConfirmResetImports.set(false);
    }
  }

  protected cancelResetImports(): void {
    this.isConfirmResetImports.set(false);
  }

  protected selectAndLoadTable(dbName: string): void {
    this.selectedDBName.set(dbName);
    this.dbRows.set([]);

    if (typeof window === 'undefined') return;

    const request = window.indexedDB.open(dbName);
    request.onsuccess = () => {
      const db = request.result;
      const storeNames = Array.from(db.objectStoreNames);
      if (storeNames.length === 0) {
        db.close();
        return;
      }
      const storeName = storeNames[0] as string;
      try {
        const transaction = db.transaction(storeName, 'readonly');
        const objectStore = transaction.objectStore(storeName);
        const getAllRequest = objectStore.getAll();

        getAllRequest.onsuccess = () => {
          const data = (getAllRequest.result ?? []) as DatabaseRow[];

          if (dbName.includes('transactions')) {
            data.sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
          } else if (dbName.includes('history_logs') || dbName.includes('history-logs')) {
            data.sort((a, b) => String(b['timestamp'] ?? '').localeCompare(String(a['timestamp'] ?? '')));
          } else {
            data.reverse();
          }

          this.dbRows.set(data);
          db.close();
        };

        getAllRequest.onerror = () => {
          db.close();
        };
      } catch {
        db.close();
      }
    };
  }

  protected getFriendlyDBName(name: string): string {
    if (name.includes('transactions')) return this.i18n.translate('databaseLegacyTransactions');
    if (name.includes('categories')) return this.i18n.translate('databaseLegacyCategories');
    if (name.includes('budgets')) return this.i18n.translate('databaseLegacyBudgets');
    if (name.includes('customizations')) return this.i18n.translate('databaseLegacyCustomizations');
    if (name.includes('history_logs')) return this.i18n.translate('databaseLegacyHistoryLogs');
    return name;
  }

  protected async restoreRow(row: DatabaseRow): Promise<void> {
    const dbName = this.selectedDBName();
    let entityType = '';

    try {
      if (dbName.includes('budgets')) {
        entityType = this.i18n.translate('databaseEntityBudget');
        await this.store.addBudget({
          id: row.id,
          name: row.name,
          type: row.type as BudgetType,
          amount: row.amount,
          categoryId: row.categoryId,
          tags: row.tags,
          startDate: row.startDate,
          endDate: row.endDate,
          isClosed: row.isClosed,
          monthlyAllocation: row.monthlyAllocation
        });
      } else if (dbName.includes('transactions')) {
        entityType = this.i18n.translate('databaseEntityTransaction');
        const cleanRow = {
          id: row.id,
          date: row.date,
          description: row.description,
          amount: row.amount,
          category: row.category,
          tags: row.tags,
          account: row.account
        };
        if (this.transactionRepository) {
          await this.transactionRepository.update(cleanRow);
          const current = [...this.store.transactions()];
          const idx = current.findIndex(t => t.id === cleanRow.id);
          if (idx !== -1) {
            current[idx] = cleanRow;
          } else {
            current.push(cleanRow);
          }
          this.store.setTransactions(current);
        }
      } else if (dbName.includes('categories')) {
        entityType = this.i18n.translate('databaseEntityCategory');
        const cleanRow = {
          id: row.id,
          name: row.name,
          color: row.color,
          icon: row.icon,
          isCustom: row.isCustom
        };
        if (this.categoryRepository) {
          await this.categoryRepository.save(cleanRow);
          const current = [...this.store.categories()];
          const idx = current.findIndex(c => c.id === cleanRow.id);
          if (idx !== -1) {
            current[idx] = cleanRow;
          } else {
            current.push(cleanRow);
          }
          this.store.setCategories(current);
        }
      } else if (dbName.includes('customizations')) {
        entityType = this.i18n.translate('databaseEntityCustomization');
        await this.store.saveCustomization(row.key, row.value);
      }

      alert(
        `${entityType} ${this.i18n.translate('databaseRowRestoredIdLabel')} "${row.id || row.key}" `
        + `${this.i18n.translate('databaseRowRestoredDone')}`
      );

      this.selectAndLoadTable(dbName);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      alert(
        `${this.i18n.translate('databaseRowRestoreError')}: ${errMsg}`
      );
    }
  }

  protected async triggerUndo(logId: string): Promise<void> {
    await this.store.undoChange(logId);
    if (this.selectedDBName() === 'rxdb-dexie-app_db--0--history_logs') {
      this.selectAndLoadTable(this.selectedDBName());
    }
  }

  protected getAccountTransactionCount(accountId: string): number {
    return this.store.transactions().filter(t => t.accountId === accountId).length;
  }

  protected readonly editingAccountId = signal<string>('');
  protected editAccountName = '';
  protected editAccountType: AccountType = 'bank_account';
  protected editAccountOpeningBalance = '0';
  protected editAccountScope: AccountScope = 'individual';
  protected editAccountSharedEmails: readonly string[] = ['shared@example.com'];

  protected readonly scopeOptions = computed<SegmentOption[]>(() => [
    { value: 'individual', label: this.i18n.translate('accountScopeIndividual') },
    { value: 'joint', label: this.i18n.translate('accountScopeJoint') }
  ]);

  protected onScopeChange(val: string): void {
    this.editAccountScope = val as AccountScope;
  }

  protected readonly financialAccounts = computed(() => this.store.accounts().filter(isFinancialAccount));

  protected startEditAccount(account: FinancialAccount): void {
    this.editingAccountId.set(account.id);
    this.editAccountName = account.name;
    this.editAccountType = account.type;
    this.editAccountOpeningBalance = String(account.openingBalance ?? 0);
    this.editAccountScope = account.scope || 'individual';
    this.editAccountSharedEmails = ['shared@example.com'];
  }

  protected cancelEditAccount(): void {
    this.editingAccountId.set('');
  }

  protected async saveEditAccount(account: FinancialAccount): Promise<void> {
    if (!this.editAccountName.trim()) return;
    const openingBalance = parseFloat(this.editAccountOpeningBalance.replace(',', '.'));
    await this.store.updateAccount({
      ...account,
      name: this.editAccountName.trim(),
      type: this.editAccountType,
      scope: this.editAccountScope,
      openingBalance: isNaN(openingBalance) ? 0 : openingBalance,
      updatedAt: Date.now()
    });
    this.editingAccountId.set('');
  }

  protected readonly showShareModal = signal<boolean>(false);
  protected readonly sharingAccount = signal<FinancialAccount | null>(null);
  protected sharingEmails: readonly string[] = ['shared@example.com'];

  protected openShareModal(account: FinancialAccount): void {
    this.sharingAccount.set(account);
    this.sharingEmails = account.scope === 'joint' ? ['shared@example.com'] : [];
    this.showShareModal.set(true);
  }

  protected async saveShareModal(): Promise<void> {
    const account = this.sharingAccount();
    if (account) {
      const newScope: AccountScope = this.sharingEmails.length > 0 ? 'joint' : 'individual';
      await this.store.updateAccount({
        ...account,
        scope: newScope,
        updatedAt: Date.now()
      });
    }
    this.showShareModal.set(false);
    this.sharingAccount.set(null);
  }

  protected async toggleAccountScope(account: FinancialAccount): Promise<void> {
    const newScope: AccountScope = account.scope === 'joint' ? 'individual' : 'joint';
    await this.store.updateAccount({
      ...account,
      scope: newScope,
      updatedAt: Date.now()
    });
  }

  protected getAccountTypeLabel(type: AccountType): string {
    const labels: Record<AccountType, string> = {
      bank_account: this.i18n.translate('accountTypeBankAccount'),
      credit_card: this.i18n.translate('accountTypeCreditCard'),
      meal_card: this.i18n.translate('accountTypeMealCard'),
      investment: this.i18n.translate('accountTypeInvestment')
    };
    return labels[type];
  }

  protected async deleteAccount(accountId: string, name: string): Promise<void> {
    const msg = `${this.i18n.translate('databaseDeleteAccountConfirmPrefix')} "${name}" `
      + `${this.i18n.translate('databaseDeleteAccountConfirmSuffix')}`;

    if (confirm(msg)) {
      await this.store.deleteAccount(accountId);
      this.addLog(
        `${this.i18n.translate('databaseAccountDeletedPrefix')} "${name}" `
        + `${this.i18n.translate('databaseAccountDeletedSuffix')}`
      );
    }
  }
}
