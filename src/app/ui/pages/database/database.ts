import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { BottomSheetDialogComponent, ButtonComponent, CardComponent, CurrencyDisplayComponent, IconButtonComponent, IconComponent, SegmentOption, SegmentedControlComponent } from 'ibid-ui';

@Component({
  selector: 'ohsaveme-database',
  standalone: true,
  imports: [CurrencyDisplayComponent,
    IconComponent,
    CommonModule,
    FormsModule,
    DialogModule,
    AppTranslatePipe,
    CardComponent,
    ButtonComponent,
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
  protected readonly dbRows = signal<any[]>([]);

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
        this.i18n.currentLang() === 'pt'
          ? 'Backup exportado com sucesso!'
          : 'Backup exported successfully!'
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.addLog(
        this.i18n.currentLang() === 'pt'
          ? `Erro ao exportar backup: ${errMsg}`
          : `Error exporting backup: ${errMsg}`
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
            this.i18n.currentLang() === 'pt'
              ? 'Ficheiro de backup inválido. Chaves obrigatórias ausentes.'
              : 'Invalid backup file. Required keys are missing.'
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
          this.i18n.currentLang() === 'pt'
            ? 'Ficheiro carregado! A abrir pré-visualização da importação...'
            : 'File loaded! Opening import preview...'
        );

        const dialogRef = this.dialog.open(DbImportPreviewDialogComponent, {
          width: '95vw',
          maxWidth: '800px',
          data: { preview }
        });

        dialogRef.closed.subscribe(async (confirmed: unknown) => {

          if (!confirmed) {
            this.addLog(
              this.i18n.currentLang() === 'pt' ? 'Importação cancelada pelo utilizador.' : 'Import cancelled by user.'
            );
            return;
          }
          this.addLog(
            this.i18n.currentLang() === 'pt'
              ? `Importação concluída: ${preview.transactionsToImport.length} movimento(s) novo(s) adicionado(s).`
              : `Import complete: ${preview.transactionsToImport.length} new movement(s) added.`
          );
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.addLog(
          this.i18n.currentLang() === 'pt'
            ? `Erro ao carregar ficheiro: ${errMsg}`
            : `Error loading backup file: ${errMsg}`
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
      this.i18n.currentLang() === 'pt'
        ? 'A efetuar reposição de fábrica de todos os dados...'
        : 'Performing factory reset of all data...'
    );

    try {
      if (this.transactionRepository) await this.transactionRepository.clear();
      if (this.categoryRepository) await this.categoryRepository.clear();
      if (this.budgetRepository) await this.budgetRepository.clear();

      this.store.setTransactions([]);
      this.store.setCategories([]);
      this.store.setBudgets([]);

      this.addLog(
        this.i18n.currentLang() === 'pt'
          ? 'Reposição concluída com sucesso! Todos os dados foram apagados.'
          : 'Factory reset completed! All data has been cleared.'
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.addLog(
        this.i18n.currentLang() === 'pt'
          ? `Erro ao limpar base de dados: ${errMsg}`
          : `Error resetting database: ${errMsg}`
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
      this.i18n.currentLang() === 'pt'
        ? 'A iniciar a limpeza de movimentos importados...'
        : 'Clearing imported transactions...'
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
        this.i18n.currentLang() === 'pt'
          ? 'Limpeza concluída! Todos os movimentos, saldo e histórico de importações foram apagados.'
          : 'Cleanup completed! All transactions, balance, and import history have been cleared.'
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.addLog(
        this.i18n.currentLang() === 'pt'
          ? `Erro ao limpar movimentos importados: ${errMsg}`
          : `Error clearing imported transactions: ${errMsg}`
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
    request.onsuccess = (event: any) => {
      const db = event.target.result;
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
          let data = getAllRequest.result || [];
          data = data.map((item: any) => item);

          if (dbName.includes('transactions')) {
            data.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
          } else if (dbName.includes('history_logs') || dbName.includes('history-logs')) {
            data.sort((a: any, b: any) => (b.timestamp || '').localeCompare(a.timestamp || ''));
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
    if (name.includes('transactions')) return this.i18n.currentLang() === 'pt' ? 'Transações (Antiga)' : 'Transactions (Obsolete)';
    if (name.includes('categories')) return this.i18n.currentLang() === 'pt' ? 'Categorias (Antiga)' : 'Categories (Obsolete)';
    if (name.includes('budgets')) return this.i18n.currentLang() === 'pt' ? 'Orçamentos (Antiga)' : 'Budgets (Obsolete)';
    if (name.includes('customizations')) return this.i18n.currentLang() === 'pt' ? 'Personalizações (Antiga)' : 'Customizations (Obsolete)';
    if (name.includes('history_logs')) return this.i18n.currentLang() === 'pt' ? 'Histórico (Antiga)' : 'History Logs (Obsolete)';
    return name;
  }

  protected async restoreRow(row: any): Promise<void> {
    const dbName = this.selectedDBName();
    let entityType = '';

    try {
      if (dbName.includes('budgets')) {
        entityType = this.i18n.currentLang() === 'pt' ? 'Orçamento' : 'Budget';
        await this.store.addBudget({
          id: row.id,
          name: row.name,
          type: row.type,
          amount: row.amount,
          categoryId: row.categoryId,
          tags: row.tags,
          startDate: row.startDate,
          endDate: row.endDate,
          isClosed: row.isClosed,
          monthlyAllocation: row.monthlyAllocation
        });
      } else if (dbName.includes('transactions')) {
        entityType = this.i18n.currentLang() === 'pt' ? 'Transação' : 'Transaction';
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
        entityType = this.i18n.currentLang() === 'pt' ? 'Categoria' : 'Category';
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
        entityType = this.i18n.currentLang() === 'pt' ? 'Personalização' : 'Customization';
        await this.store.saveCustomization(row.key, row.value);
      }

      alert(
        this.i18n.currentLang() === 'pt'
          ? `${entityType} com ID "${row.id || row.key}" restaurado com sucesso!`
          : `${entityType} with ID "${row.id || row.key}" restored successfully!`
      );

      this.selectAndLoadTable(dbName);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      alert(
        this.i18n.currentLang() === 'pt'
          ? `Erro ao restaurar registo: ${errMsg}`
          : `Error restoring record: ${errMsg}`
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
    const pt = this.i18n.currentLang() === 'pt';
    const msg = pt
      ? `Tem a certeza que deseja eliminar a conta "${name}" e todos os seus movimentos? Esta ação é irreversível.`
      : `Are you sure you want to delete the account "${name}" and all its transactions? This action is irreversible.`;

    if (confirm(msg)) {
      await this.store.deleteAccount(accountId);
      this.addLog(pt ? `Conta "${name}" eliminada com sucesso.` : `Account "${name}" deleted successfully.`);
    }
  }
}
