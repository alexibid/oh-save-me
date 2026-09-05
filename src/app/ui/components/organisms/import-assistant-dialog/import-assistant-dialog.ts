import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, ViewChild, TemplateRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as XLSX from 'xlsx';
import { FormsModule } from '@angular/forms';
import { Dialog, DialogRef, DialogModule } from '@angular/cdk/dialog';
import { CsvParserService } from '@application/csv-parser.service';
import { useStore } from '@application/app-store';
import { FinancialAccount, AccountType, isFinancialAccount } from '@domain/models/account';
import { ImportBatch } from '@domain/models/import-batch';
import { ACCOUNT_TYPE_REQUIRED_FIELDS } from '@domain/data/templates';
import { Transaction } from '@domain/models/transaction';
import { TRANSACTION_REPOSITORY_TOKEN, MAPPING_RULE_REPOSITORY_TOKEN } from '@application/tokens';
import { I18N_SHARED, I18nService } from '@ui/shared/i18n-shared';
import {
  detectColumnMapping,
  suggestAccountFromSignature,
  suggestAccountCandidates,
  AccountSuggestion
} from '../../../../domain/services/column-detection-engine';
import { suggestCurrentBalance } from '@domain/services/suggest-current-balance';
import { computeChronologicalBalances } from '@domain/shared/balance-chain-order.utils';
import { DetectedMapping } from '@domain/models/column-mapping';
import { MappingRule } from '@domain/models/mapping-rule';
import { PersistMappingCorrectionUseCase } from '@application/use-cases/persist-mapping-correction.use-case';
import { LinkInternalTransfersUseCase } from '@application/use-cases/link-internal-transfers.use-case';
import { ColumnClassifierService } from '@application/services/column-classifier.service';
import { DriveSyncCoordinatorService } from '@application/services/drive-sync-coordinator.service';
import { ColumnMapperDialogComponent } from '@ui/components/organisms/column-mapper-dialog/column-mapper-dialog';
import { ColumnRole } from '@domain/models/column-role';
import { TransactionsTableComponent } from '@ui/components/organisms/transactions-table/transactions-table';
import {
  isRequiredFieldSatisfied,
  isFieldConfidentlyDetected,
  mappingToColumnRoles,
  columnRolesToMapping,
  buildColumnMappingObject,
  calculateAnchoredBalances
} from './import-assistant-engine';
import { BottomSheetDialogComponent, IconComponent, SelectComponent, SelectOption } from 'ibid-ui';

@Component({
  selector: 'ohsaveme-import-assistant-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, IconComponent, BottomSheetDialogComponent, ColumnMapperDialogComponent, TransactionsTableComponent, SelectComponent, ...I18N_SHARED],
  templateUrl: './import-assistant-dialog.html',
  styleUrl: './import-assistant-dialog.scss'
})
export class ImportAssistantDialog implements OnChanges {
  private readonly dialog = inject(Dialog);
  private readonly csvParser = inject(CsvParserService);
  protected readonly store = useStore();
  private readonly transactionRepository = inject(TRANSACTION_REPOSITORY_TOKEN);
  private readonly mappingRuleRepository = inject(MAPPING_RULE_REPOSITORY_TOKEN, { optional: true });
  private readonly persistMappingCorrection = inject(PersistMappingCorrectionUseCase);
  private readonly linkInternalTransfersUseCase = inject(LinkInternalTransfersUseCase);
  private readonly columnClassifierService = inject(ColumnClassifierService);
  private readonly driveSyncCoordinator = inject(DriveSyncCoordinatorService);
  protected readonly i18n = inject(I18nService);

  private dialogRef?: DialogRef<unknown>;

  @ViewChild('dialogTemplate') dialogTemplate!: TemplateRef<unknown>;

  @Input({ required: true }) visible = false;
  @Input() initialFileEvent: Event | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() importCompleted = new EventEmitter<void>();
  @Output() triageReady = new EventEmitter<Transaction[]>();

  protected currentStep = signal<number>(1);
  protected selectedAccountId = signal<string>('');
  protected batchFriendlyName = signal<string>('');

  protected isAnalyzingFile = signal<boolean>(false);
  protected detectedMapping = signal<DetectedMapping>({});
  protected showMapperManually = signal<boolean>(false);
  private mappingRules: readonly MappingRule[] = [];

  protected fileContent: string | ArrayBuffer | null = null;
  protected loadedFileName = signal<string>('');
  protected fileChecksum = signal<string>('');

  protected parsedTransactions = signal<Transaction[]>([]);
  protected startDateStr = signal<string>('');
  protected endDateStr = signal<string>('');
  protected hasOverlap = signal<boolean>(false);
  protected isDuplicateFile = signal<boolean>(false);
  protected columnMappings = signal<ColumnRole[]>([]);
  protected hasBalanceColumn = computed(() => {
    return this.parsedTransactions().some(t => t.balance !== undefined && t.balance !== null);
  });

  protected statementBalanceInput = signal<string>('');
  protected statementBalanceSuggestedByAssistant = signal<boolean>(false);
  protected readonly statementBalance = computed<number | null>(() => {
    const raw = this.statementBalanceInput().trim();
    if (!raw) return null;
    const n = parseFloat(raw.replace(',', '.'));
    return isNaN(n) ? null : n;
  });

  protected readonly isStatementBalanceRequired = computed<boolean>(() => {
    const acc = this.accounts.find(a => a.id === this.selectedAccountId());
    return acc?.type === 'bank_account';
  });

  protected readonly categoryOptions = computed(() => this.store.categories());

  protected readonly previewWithBalance = computed<readonly Transaction[]>(() => {
    const newTxs = this.parsedTransactions();
    const anchor = this.statementBalance();
    const acc = this.accounts.find(a => a.id === this.selectedAccountId());

    if (anchor === null || !acc || acc.type !== 'bank_account') {
      return newTxs;
    }

    const newIds = new Set(newTxs.map(t => t.id));
    const existing = this.store.transactions().filter(t => t.accountId === acc.id && !newIds.has(t.id));
    const combined = [...existing, ...newTxs];
    const totalAmount = combined.reduce((sum, t) => sum + t.amount, 0);
    const openingBalance = anchor - totalAmount;

    const ordered = computeChronologicalBalances(combined, openingBalance);

    return ordered
      .filter(t => newIds.has(t.id))
      .map(t => ({ ...t, balance: t.balance }))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  });

  protected isStep2Invalid = computed(() => {
    const selectedAcc = this.accounts.find(a => a.id === this.selectedAccountId());
    if (!selectedAcc) return false;
    const required = ACCOUNT_TYPE_REQUIRED_FIELDS[selectedAcc.type] ?? [];
    const mappingArr = this.columnMappings();
    const missingMapping = required.some(field => !isRequiredFieldSatisfied(field, mappingArr));
    if (missingMapping) return true;
    return this.isStatementBalanceRequired() && this.statementBalance() === null;
  });

  protected missingRequiredColumns = computed(() => {
    const selectedAcc = this.accounts.find(a => a.id === this.selectedAccountId());
    if (!selectedAcc) return [];
    const required = ACCOUNT_TYPE_REQUIRED_FIELDS[selectedAcc.type] ?? [];
    if (required.length === 0) return [];
    const mappingArr = this.columnMappings();
    return required
      .filter(field => !isRequiredFieldSatisfied(field, mappingArr))
      .map(field => this.requiredFieldLabel(field));
  });

  protected requiredFieldsForMapper = computed<{ role: ColumnRole; label: string }[]>(() => {
    const selectedAcc = this.accounts.find(a => a.id === this.selectedAccountId());
    const required = selectedAcc ? (ACCOUNT_TYPE_REQUIRED_FIELDS[selectedAcc.type] ?? []) : ['date', 'desc', 'amount'];
    const mappingArr = this.columnMappings();
    return required
      .filter(role => role !== 'amount' || !isRequiredFieldSatisfied('amount', mappingArr))
      .map(role => ({ role: role as ColumnRole, label: this.requiredFieldLabel(role) }));
  });

  private requiredFieldLabel(field: string): string {
    const labels: Record<string, string> = {
      date: this.i18n.translate('colRoleDate'), desc: this.i18n.translate('colRoleDesc'), amount: this.i18n.translate('colRoleAmount'), debit: this.i18n.translate('colRoleDebit'),
      credit: this.i18n.translate('colRoleCredit'), balance: this.i18n.translate('colRoleBalance'), symbol: this.i18n.translate('colRoleSymbol'),
      shares: this.i18n.translate('colRoleShares'), price: this.i18n.translate('colRolePrice'), fee: this.i18n.translate('colRoleFee'), tax: this.i18n.translate('colRoleTax'),
      investmentType: this.i18n.translate('colRoleInvestmentType')
    };
    return labels[field] ?? field;
  }

  protected readonly detectionNeedsReview = computed<boolean>(() => {
    const selectedAcc = this.accounts.find(a => a.id === this.selectedAccountId());
    const accountType = selectedAcc?.type ?? 'bank_account';
    const required = ACCOUNT_TYPE_REQUIRED_FIELDS[accountType] ?? [];
    const mapping = this.detectedMapping();
    return required.some(field => !isFieldConfidentlyDetected(field, mapping));
  });

  protected showNewAccountForm = signal<boolean>(false);
  protected newAccountName = '';
  protected newAccountType: AccountType = 'bank_account';
  protected accountSuggestedByAssistant = signal<boolean>(false);
  protected accountSuggestionCandidates = signal<readonly AccountSuggestion[]>([]);

  protected rawFileRows = signal<string[][]>([]);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']) {
      if (this.visible) {
        this.resetState();
        setTimeout(() => this.openDialog());
      } else {
        this.closeDialog();
      }
    }
    if (changes['initialFileEvent'] && this.initialFileEvent) {
      this.onFileSelected(this.initialFileEvent);
    }
  }

  private resetState() {
    this.currentStep.set(1);
    this.selectedAccountId.set(this.store.accounts().length > 0 ? this.store.accounts()[0].id : '');
    this.loadedFileName.set('');
    this.fileContent = null;
    this.fileChecksum.set('');
    this.parsedTransactions.set([]);
    this.startDateStr.set('');
    this.endDateStr.set('');
    this.hasOverlap.set(false);
    this.isDuplicateFile.set(false);
    this.batchFriendlyName.set('');
    this.statementBalanceInput.set('');
    this.statementBalanceSuggestedByAssistant.set(false);
    this.isAnalyzingFile.set(false);
    this.detectedMapping.set({});
    this.showMapperManually.set(false);
    this.showNewAccountForm.set(false);
    this.newAccountName = '';
    this.newAccountType = 'bank_account';
    this.accountSuggestedByAssistant.set(false);
    this.accountSuggestionCandidates.set([]);
    this.mappingRules = [];

    if (this.mappingRuleRepository) {
      this.mappingRuleRepository.getAll().then(rules => { this.mappingRules = rules; });
    }
  }

  private openDialog() {
    if (!this.dialogRef && this.dialogTemplate) {
      this.dialogRef = this.dialog.open(this.dialogTemplate, {
        width: '95vw',
        maxWidth: '700px',
        disableClose: true,
        panelClass: 'o-import-assistant-dialog-panel'
      });
      this.dialogRef.closed.subscribe(() => {

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

  protected get accounts(): FinancialAccount[] {
    return this.store.accounts().filter(isFinancialAccount);
  }

  protected onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.loadedFileName.set(file.name);
      this.isAnalyzingFile.set(true);

      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      this.batchFriendlyName.set(`${nameWithoutExt} - ${new Date().toLocaleDateString()}`);

      const nameLower = file.name.toLowerCase();
      const reader = new FileReader();

      if (nameLower.endsWith('.xlsx') || nameLower.endsWith('.xls')) {
        reader.onload = async () => {
          this.fileContent = reader.result;
          if (this.fileContent) {
            this.fileChecksum.set(await this.csvParser.calculateChecksum(this.fileContent));
            try {
              const workbook = XLSX.read(this.fileContent as ArrayBuffer, { type: 'array' });
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });
              const firstRows = rows.slice(0, 6).map(row => (row as unknown[]).map(c => String(c ?? '')));
              this.rawFileRows.set(firstRows);
              if (firstRows.length > 0) {
                this.applyAutoDetectedMapping(firstRows[0], firstRows.slice(1));
              }
            } catch (e) {
              console.warn('Failed to parse Excel rows on file select:', e);
            }
          }
          this.isAnalyzingFile.set(false);
        };
        reader.readAsArrayBuffer(file);
      } else {
        reader.onload = async () => {
          const buffer = reader.result as ArrayBuffer;
          if (buffer) {
            this.fileChecksum.set(await this.csvParser.calculateChecksum(buffer));
            this.fileContent = this.csvParser.decodeText(buffer);
            const { rows } = this.csvParser.getRawCsvLines(this.fileContent, 6);
            this.rawFileRows.set(rows);
            if (rows.length > 0) {
              this.applyAutoDetectedMapping(rows[0], rows.slice(1));
            }
          }
          this.isAnalyzingFile.set(false);
        };
        reader.readAsArrayBuffer(file);
      }
    }
  }

  protected applyAutoDetectedMapping(headers: string[], sampleRows: string[][]): void {
    const accountType = this.accounts.find(a => a.id === this.selectedAccountId())?.type ?? 'bank_account';
    const detected = detectColumnMapping(
      headers,
      sampleRows,
      accountType,
      this.mappingRules,
      this.columnClassifierService.getWeights()
    );
    this.detectedMapping.set(detected);
    this.columnMappings.set(mappingToColumnRoles(headers.length, detected));
    this.suggestAccountFromFile(headers);
  }

  private suggestAccountFromFile(headers: string[]): void {
    this.accountSuggestionCandidates.set([]);
    if (this.newAccountName.trim()) return;

    const suggestion = suggestAccountFromSignature(headers);
    if (suggestion) {
      this.applyAccountSuggestion(suggestion);
      return;
    }

    const candidates = suggestAccountCandidates(headers).filter(c => !this.hasAccountNamed(c.name));
    if (candidates.length < 2) return;

    this.accountSuggestionCandidates.set(candidates);
    this.showNewAccountForm.set(true);
  }

  private applyAccountSuggestion(suggestion: AccountSuggestion): void {
    if (this.hasAccountNamed(suggestion.name)) return;

    this.newAccountName = suggestion.name;
    this.newAccountType = suggestion.type;
    this.accountSuggestedByAssistant.set(true);
    this.showNewAccountForm.set(true);
    this.notifyAccountSuggestion(suggestion.name);
  }

  private hasAccountNamed(name: string): boolean {
    return this.accounts.some(a => a.name.trim().toLowerCase() === name.trim().toLowerCase());
  }

  protected chooseAccountCandidate(candidate: AccountSuggestion): void {
    this.accountSuggestionCandidates.set([]);
    this.applyAccountSuggestion(candidate);
  }

  private notifyAccountSuggestion(_accountName: string): void {
  }

  private suggestStatementBalance(dataRows: readonly string[][]): void {
    if (!this.isStatementBalanceRequired()) return;
    if (this.statementBalanceInput().trim()) return;

    const mapping = this.detectedMapping();
    const balanceField = mapping.balance ?? mapping.availableBalance;
    const dateField = mapping.date;
    if (!balanceField || !dateField) return;

    const suggested = suggestCurrentBalance(dataRows, dateField.columnIndex, balanceField.columnIndex);
    if (suggested === undefined) return;

    this.statementBalanceInput.set(String(suggested));
    this.statementBalanceSuggestedByAssistant.set(true);
    this.notifyBalanceSuggestion(suggested);
  }

  private notifyBalanceSuggestion(_balance: number): void {
  }

  protected onStatementBalanceChange(value: string): void {
    this.statementBalanceInput.set(value);
    this.statementBalanceSuggestedByAssistant.set(false);
  }

  protected accountTypeLabel(type: AccountType): string {
    const labels: Record<AccountType, string> = {
      bank_account: this.i18n.translate('accountTypeBankAccount'),
      credit_card: this.i18n.translate('accountTypeCreditCard'),
      meal_card: this.i18n.translate('accountTypeMealCard'),
      investment: this.i18n.translate('accountTypeInvestment')
    };
    return labels[type];
  }

  protected readonly accountTypeOptions = computed<SelectOption<AccountType>[]>(() => {
    const types: AccountType[] = ['bank_account', 'credit_card', 'meal_card', 'investment'];
    return types.map(value => ({ value, label: this.accountTypeLabel(value) }));
  });

  protected readonly accountSelectOptions = computed<SelectOption[]>(() =>
    this.accounts.map(acc => ({ value: acc.id, label: `${acc.name} (${this.accountTypeLabel(acc.type)})` }))
  );

  protected onNewAccountNameChange(value: string): void {
    this.newAccountName = value;
    this.accountSuggestedByAssistant.set(false);
  }

  protected onNewAccountTypeChange(value: AccountType): void {
    this.newAccountType = value;
    this.accountSuggestedByAssistant.set(false);
  }

  protected proceedToStep3() {
    if (this.detectionNeedsReview() || this.showMapperManually()) {
      const headers = this.rawFileRows()[0];
      if (headers && headers.length > 0) {
        const sampleRows = this.rawFileRows().slice(1);
        const mapping = columnRolesToMapping(this.columnMappings());
        void this.persistMappingCorrection.execute(headers, mapping, sampleRows);
        this.columnClassifierService.learn(headers, sampleRows, mapping);
      }
    }
    this.currentStep.set(3);
  }

  protected onStep2RoleChange(colIndex: number, event: Event) {
    const select = event.target as HTMLSelectElement;
    const newRole = select.value as ColumnRole;

    let current = [...this.columnMappings()];
    if (newRole !== 'skip') {
      current = current.map((role, idx) => idx === colIndex ? newRole : (role === newRole ? 'skip' : role));
    } else {
      current[colIndex] = 'skip';
    }

    this.columnMappings.set(current);
    this.analyzeFile();
  }

  protected async createNewAccount() {
    if (!this.newAccountName.trim()) return;
    const newAcc: FinancialAccount = {
      id: `acc_${Date.now()}`,
      kind: 'financial',
      name: this.newAccountName.trim(),
      type: this.newAccountType,
      scope: 'individual',
      includeInConsolidatedBalance: true,
      unit: 'EUR',
      updatedAt: Date.now()
    };
    await this.store.addAccount(newAcc);
    this.selectedAccountId.set(newAcc.id);
    this.newAccountName = '';
    this.accountSuggestedByAssistant.set(false);
    this.showNewAccountForm.set(false);
  }

  protected async analyzeFile(): Promise<void> {
    if (!this.fileContent || !this.selectedAccountId()) return;

    let txs: Transaction[] = [];
    const mapping = buildColumnMappingObject(this.columnMappings());

    let allDataRows: string[][] = [];
    if (this.loadedFileName().endsWith('.xlsx') || this.loadedFileName().endsWith('.xls')) {
      txs = await this.csvParser.parseExcelWithMapping(this.fileContent as ArrayBuffer, mapping, 0, this.selectedAccountId());
      const { rows } = this.csvParser.getRawExcelRows(this.fileContent as ArrayBuffer, Infinity);
      allDataRows = rows.slice(1);
    } else {
      const contentStr = this.fileContent as string;
      const parsedMeta = this.csvParser.getRawCsvLines(contentStr, Infinity);
      txs = await this.csvParser.parseCsvWithMapping(contentStr, mapping, parsedMeta.delimiter, parsedMeta.headerIdx, this.selectedAccountId());
      allDataRows = parsedMeta.rows.slice(1);
    }

    const mappedTxs = txs.map(t => ({
      ...t,
      accountId: this.selectedAccountId(),
      account: this.accounts.find(a => a.id === this.selectedAccountId())?.name || 'Import'
    }));

    this.parsedTransactions.set(mappedTxs);

    if (mappedTxs.length > 0) {
      const sorted = [...mappedTxs].sort((a, b) => a.date.localeCompare(b.date));
      this.startDateStr.set(sorted[0].date);
      this.endDateStr.set(sorted[sorted.length - 1].date);

      const isChecksumDuplicate = this.store.importBatches().some(b => b.fileChecksum === this.fileChecksum());
      this.isDuplicateFile.set(isChecksumDuplicate);

      const start = this.startDateStr();
      const end = this.endDateStr();
      const overlap = this.store.importBatches().some(b =>
        b.accountId === this.selectedAccountId() &&
        ((start >= b.startDate && start <= b.endDate) ||
         (end >= b.startDate && end <= b.endDate) ||
         (b.startDate >= start && b.startDate <= end))
      );
      this.hasOverlap.set(overlap);
    } else {
      this.startDateStr.set('');
      this.endDateStr.set('');
      this.hasOverlap.set(false);
      this.isDuplicateFile.set(false);
    }

    this.suggestStatementBalance(allDataRows);
    this.currentStep.set(2);
  }

  protected async confirmAndProcess() {
    const rawTxs = this.parsedTransactions();
    if (rawTxs.length === 0) return;

    const batchId = `batch_${Date.now()}`;
    const newBatch: ImportBatch = {
      id: batchId,
      name: this.batchFriendlyName().trim() || 'Extrato Importado',
      importDate: new Date().toISOString(),
      startDate: this.startDateStr(),
      endDate: this.endDateStr(),
      accountId: this.selectedAccountId(),
      transactionCount: rawTxs.length,
      fileChecksum: this.fileChecksum(),
      updatedAt: Date.now()
    };

    await this.store.addImportBatch(newBatch);

    const finalTxs = rawTxs.map(tx => ({
      ...tx,
      importBatchId: batchId,
      pendingReview: tx.category === 'Others'
    }));

    const existingHashes = new Set(this.store.transactions().filter(t => t.accountId === this.selectedAccountId()).map(t => t.id));
    const uniqueTxs = finalTxs.filter(tx => !existingHashes.has(tx.id));

    if (uniqueTxs.length > 0) {
      const account = this.accounts.find(a => a.id === this.selectedAccountId());
      const anchorBalance = this.statementBalance();

      if (account && account.type === 'bank_account' && anchorBalance !== null) {
        const current = this.store.transactions();
        const otherAccountsTxs = current.filter(t => t.accountId !== account.id);
        const existingForAccount = current.filter(t => t.accountId === account.id);

        const { recalculated, openingBalance } = calculateAnchoredBalances(existingForAccount, uniqueTxs, anchorBalance);

        this.store.setTransactions([...recalculated, ...otherAccountsTxs]);
        await this.transactionRepository.saveAll(recalculated);
        await this.store.updateAccount({ ...account, openingBalance, updatedAt: Date.now() });
      } else {
        const current = [...this.store.transactions()];
        this.store.setTransactions([...uniqueTxs, ...current]);
        await this.transactionRepository.saveAll(uniqueTxs);
      }
    }

    await this.linkInternalTransfersUseCase.execute();

    this.importCompleted.emit();
    this.closeDialog();

    if (uniqueTxs.length > 0) {
      const account = this.accounts.find(a => a.id === this.selectedAccountId());
      void this.driveSyncCoordinator.uploadIngestedImportBatch(
        this.loadedFileName() || 'statement.csv',
        uniqueTxs,
        account?.name
      );
      this.triageReady.emit(uniqueTxs);
    }
  }

  protected cancel() {
    this.closeDialog();
  }

  protected onPreviewCategoryApplied(event: { readonly updatedTransactions: ReadonlyArray<{ readonly id: string; readonly category?: string }> }): void {
    const updatedMap = new Map<string, string>(
      event.updatedTransactions.map(t => [t.id, t.category as string])
    );

    const currentTxs = this.parsedTransactions();
    const newTxs = currentTxs.map(tx => {
      const newCat = updatedMap.get(tx.id);
      if (newCat) {
        return { ...tx, category: newCat };
      }
      return tx;
    });
    this.parsedTransactions.set(newTxs);
  }
}
