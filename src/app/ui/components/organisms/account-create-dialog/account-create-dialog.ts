import { Component, EventEmitter, Input, Output, OnChanges, OnDestroy, SimpleChanges, inject, ViewChild, TemplateRef, signal, computed } from '@angular/core';

import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { Dialog, DialogRef, DialogModule } from '@angular/cdk/dialog';
import { Account, AccountType, AccountScope } from '@domain/models/account';
import { CustomAccountPreset } from '@domain/models/custom-account-preset';
import { CUSTOM_ACCOUNT_PRESETS } from '@domain/data/custom-account-presets';
import { CreateFinancialAccountUseCase } from '@application/use-cases/create-financial-account.use-case';
import { CreateCustomAccountUseCase } from '@application/use-cases/create-custom-account.use-case';
import { ImportCustomRecordsUseCase } from '@application/use-cases/import-custom-records.use-case';
import { CsvParserService } from '@application/csv-parser.service';
import { AppTranslatePipe, I18nService } from '@ui/shared/i18n-shared';
import { ColumnMapperDialogComponent } from '@ui/components/organisms/column-mapper-dialog/column-mapper-dialog';
import { ShareAccessManagerComponent } from '@ui/components/organisms/share-access-manager/share-access-manager';
import { ColumnRole } from '@domain/models/column-role';
import { BottomSheetDialogComponent, SegmentOption, SegmentedControlComponent } from 'ibid-ui';

type AccountKind = 'financial' | 'custom';
type WizardStep = 'kind' | 'details' | 'upload' | 'mapping';

interface PresetCategoryGroup {
  readonly category: string;
  readonly presets: readonly CustomAccountPreset[];
}

@Component({
  selector: 'ohsaveme-account-create-dialog',
  standalone: true,
  imports: [
    FormsModule,
    DialogModule,
    BottomSheetDialogComponent,
    SegmentedControlComponent,
    ColumnMapperDialogComponent,
    ShareAccessManagerComponent,
    AppTranslatePipe
],
  templateUrl: './account-create-dialog.html',
  styleUrl: './account-create-dialog.scss'
})
export class AccountCreateDialog implements OnChanges, OnDestroy {
  public sharedWithEmails: readonly string[] = ['shared@example.com'];
  private readonly dialog = inject(Dialog);
  private readonly createFinancialAccount = inject(CreateFinancialAccountUseCase);
  private readonly createCustomAccount = inject(CreateCustomAccountUseCase);
  private readonly importCustomRecords = inject(ImportCustomRecordsUseCase);
  private readonly csvParser = inject(CsvParserService);
  protected readonly i18n = inject(I18nService);

  private dialogRef?: DialogRef<unknown>;

  private openTimeout?: ReturnType<typeof setTimeout>;

  @ViewChild('dialogTemplate') dialogTemplate!: TemplateRef<unknown>;

  @Input({ required: true }) visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() accountCreated = new EventEmitter<Account>();
  @Output() cancelled = new EventEmitter<void>();

  protected readonly step = signal<WizardStep>('kind');
  protected readonly kind = signal<AccountKind>('financial');

  protected accountName = '';
  protected readonly scope = signal<AccountScope>('individual');
  protected readonly includeInConsolidatedBalance = signal<boolean>(true);
  protected readonly accountType = signal<AccountType>('bank_account');

  protected purposeText = '';
  protected readonly selectedPresetId = signal<string | undefined>(undefined);
  protected readonly customAccountPresets: readonly CustomAccountPreset[] = CUSTOM_ACCOUNT_PRESETS;
  protected presetSearch = '';

  protected readonly loadedFileName = signal<string>('');
  protected readonly isAnalyzingFile = signal<boolean>(false);
  protected readonly rawFileRows = signal<string[][]>([]);
  protected readonly columnMappings = signal<ColumnRole[]>([]);
  protected readonly measureUnits = signal<Record<number, string>>({});

  protected readonly kindOptions = computed<SegmentOption[]>(() => [
    { value: 'financial', label: this.i18n.translate('accountCreateKindFinancial') },
    { value: 'custom', label: this.i18n.translate('accountCreateKindCustom') }
  ]);

  protected readonly scopeOptions = computed<SegmentOption[]>(() => [
    { value: 'individual', label: this.i18n.translate('accountCreateScopeIndividual') },
    { value: 'joint', label: this.i18n.translate('accountCreateScopeJoint') }
  ]);

  protected isConfirmDisabled(): boolean {
    return this.kind() === 'financial' ? !this.accountName.trim() : !this.purposeText.trim();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']) {
      if (this.visible) {
        this.resetState();
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

  protected onConsolidatedBalanceToggle(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.includeInConsolidatedBalance.set(checked);
  }

  private resetState(): void {

    this.step.set('kind');
    this.kind.set('financial');
    this.accountName = '';
    this.scope.set('individual');
    this.includeInConsolidatedBalance.set(true);
    this.accountType.set('bank_account');
    this.purposeText = '';
    this.selectedPresetId.set(undefined);
    this.presetSearch = '';
    this.loadedFileName.set('');
    this.isAnalyzingFile.set(false);
    this.rawFileRows.set([]);
    this.columnMappings.set([]);
    this.measureUnits.set({});
  }

  private openDialog(): void {
    if (!this.dialogRef && this.dialogTemplate) {
      this.dialogRef = this.dialog.open(this.dialogTemplate, {
        width: '95vw',
        maxWidth: '480px',
        disableClose: true,
        panelClass: 'o-account-create-dialog-panel'
      });
      this.dialogRef.closed.subscribe(() => {

        this.dialogRef = undefined;
        this.visibleChange.emit(false);
      });
    }
  }

  private closeDialog(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = undefined;
    }
  }

  protected selectKind(value: string): void {
    this.kind.set(value === 'custom' ? 'custom' : 'financial');
  }

  protected selectScope(value: string): void {
    this.scope.set(value === 'joint' ? 'joint' : 'individual');
  }

  protected onAccountTypeChange(event: Event): void {
    this.accountType.set((event.target as HTMLSelectElement).value as AccountType);
  }

  protected groupedPresets(): readonly PresetCategoryGroup[] {
    const query = this.presetSearch.trim().toLowerCase();
    const matching = query
      ? this.customAccountPresets.filter(preset =>
          preset.label.toLowerCase().includes(query) || preset.category.toLowerCase().includes(query))
      : this.customAccountPresets;

    const byCategory = new Map<string, CustomAccountPreset[]>();
    for (const preset of matching) {
      const group = byCategory.get(preset.category) ?? [];
      group.push(preset);
      byCategory.set(preset.category, group);
    }
    return Array.from(byCategory.entries()).map(([category, presets]) => ({ category, presets }));
  }

  protected selectPreset(preset: CustomAccountPreset): void {
    this.selectedPresetId.set(preset.id);
    this.purposeText = preset.label;
  }

  protected selectOtherPreset(): void {
    this.selectedPresetId.set(undefined);
    this.purposeText = '';
  }

  protected goToDetails(): void {
    this.step.set('details');
  }

  protected goBackToKind(): void {
    this.step.set('kind');
  }

  protected proceedFromDetails(): void {
    if (this.isConfirmDisabled()) return;
    if (this.kind() === 'custom') {
      this.step.set('upload');
    } else {
      void this.confirm();
    }
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.loadedFileName.set(file.name);
    this.isAnalyzingFile.set(true);

    const nameLower = file.name.toLowerCase();
    const reader = new FileReader();

    if (nameLower.endsWith('.xlsx') || nameLower.endsWith('.xls')) {
      reader.onload = () => {
        const buffer = reader.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 })
          .map(row => (row as unknown[]).map(cell => String(cell ?? '')));
        this.applyParsedRows(rows);
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = () => {
        const buffer = reader.result as ArrayBuffer;
        const content = this.csvParser.decodeText(buffer);
        const { rows } = this.csvParser.getRawCsvLines(content, Infinity);
        this.applyParsedRows(rows);
      };
      reader.readAsArrayBuffer(file);
    }
  }

  private applyParsedRows(rows: string[][]): void {
    this.rawFileRows.set(rows);
    this.isAnalyzingFile.set(false);
    this.step.set('mapping');
  }

  protected goBackToUpload(): void {
    this.step.set('upload');
  }

  protected skipUpload(): void {
    this.rawFileRows.set([]);
    void this.confirm();
  }

  protected async confirm(): Promise<void> {
    if (this.isConfirmDisabled()) return;

    if (this.kind() === 'financial') {
      const account = await this.createFinancialAccount.execute({
        name: this.accountName,
        type: this.accountType(),
        scope: this.scope(),
        includeInConsolidatedBalance: this.includeInConsolidatedBalance()
      });
      this.accountCreated.emit(account);
      this.closeDialog();
      return;
    }

    const account = await this.createCustomAccount.execute({
      name: this.purposeText,
      purpose: this.purposeText,
      presetId: this.selectedPresetId()
    });

    const rows = this.rawFileRows();
    if (rows.length > 1) {
      await this.importCustomRecords.execute({
        accountId: account.id,
        headers: rows[0],
        rows: rows.slice(1),
        columnRoles: this.columnMappings(),
        measureUnits: this.measureUnits()
      });
    }

    this.accountCreated.emit(account);
    this.closeDialog();
  }

  protected onCancel(): void {
    this.closeDialog();
    this.cancelled.emit();
  }
}
