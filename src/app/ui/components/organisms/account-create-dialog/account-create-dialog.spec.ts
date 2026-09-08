import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { signal } from '@angular/core';
import { DialogModule } from '@angular/cdk/dialog';
import { AccountCreateDialog } from './account-create-dialog';

import { CreateFinancialAccountUseCase } from '@application/use-cases/create-financial-account.use-case';
import { CreateCustomAccountUseCase } from '@application/use-cases/create-custom-account.use-case';
import { ImportCustomRecordsUseCase } from '@application/use-cases/import-custom-records.use-case';
import { APP_STORE_TOKEN } from '@application/app-store';
import { FinancialAccount, CustomAccount } from '@domain/models/account';
import { BUILTIN_UNITS } from '@domain/models/unit';

describe('AccountCreateDialog', () => {
  let component: AccountCreateDialog;
  let fixture: ComponentFixture<AccountCreateDialog>;
  let mockCreateFinancialAccount: { execute: ReturnType<typeof vi.fn> };
  let mockCreateCustomAccount: { execute: ReturnType<typeof vi.fn> };
  let mockImportCustomRecords: { execute: ReturnType<typeof vi.fn> };

  const financialResult: FinancialAccount = {
    id: 'acc_1', kind: 'financial', name: 'Current Account', type: 'bank_account',
    scope: 'individual', includeInConsolidatedBalance: true, unit: 'EUR', updatedAt: 0
  };
  const customResult: CustomAccount = {
    id: 'acc_2', kind: 'custom', name: 'Electric car consumption', purpose: 'Electric car consumption', updatedAt: 0
  };

  beforeEach(async () => {
    mockCreateFinancialAccount = { execute: vi.fn().mockResolvedValue(financialResult) };
    mockCreateCustomAccount = { execute: vi.fn().mockResolvedValue(customResult) };
    mockImportCustomRecords = { execute: vi.fn().mockResolvedValue([]) };

    await TestBed.configureTestingModule({
      imports: [AccountCreateDialog, DialogModule],

      providers: [
        { provide: CreateFinancialAccountUseCase, useValue: mockCreateFinancialAccount },
        { provide: CreateCustomAccountUseCase, useValue: mockCreateCustomAccount },
        { provide: ImportCustomRecordsUseCase, useValue: mockImportCustomRecords },
        { provide: APP_STORE_TOKEN, useValue: { units: signal([...BUILTIN_UNITS]) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AccountCreateDialog);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts on the kind step, defaulting to financial with consolidated balance included', () => {
    expect(component['step']()).toBe('kind');
    expect(component['kind']()).toBe('financial');
    expect(component['includeInConsolidatedBalance']()).toBe(true);
    expect(component['scope']()).toBe('individual');
  });

  it('moves to the financial details step (name, type, scope, consolidated-balance toggle) after choosing financial', () => {
    component['selectKind']('financial');
    component['goToDetails']();

    expect(component['step']()).toBe('details');
    expect(component['kind']()).toBe('financial');
  });

  it('moves to the custom details step (purpose only, no scope/toggle) after choosing custom', () => {
    component['selectKind']('custom');
    component['goToDetails']();

    expect(component['step']()).toBe('details');
    expect(component['kind']()).toBe('custom');
  });

  it('disables confirm until the relevant field is filled, per kind', () => {
    component['selectKind']('financial');
    expect(component['isConfirmDisabled']()).toBe(true);
    component['accountName'] = 'Current Account';
    expect(component['isConfirmDisabled']()).toBe(false);

    component['selectKind']('custom');
    expect(component['isConfirmDisabled']()).toBe(true);
    component['purposeText'] = 'Electric car consumption';
    expect(component['isConfirmDisabled']()).toBe(false);
  });

  it('confirms a financial account via CreateFinancialAccountUseCase and emits accountCreated', async () => {
    let emitted: unknown;
    component.accountCreated.subscribe(acc => { emitted = acc; });

    component['selectKind']('financial');
    component['accountName'] = 'Current Account';
    component['selectScope']('joint');
    component['includeInConsolidatedBalance'].set(false);

    await component['confirm']();

    expect(mockCreateFinancialAccount.execute).toHaveBeenCalledWith({
      name: 'Current Account', type: 'bank_account', scope: 'joint', includeInConsolidatedBalance: false
    });
    expect(mockCreateCustomAccount.execute).not.toHaveBeenCalled();
    expect(emitted).toBe(financialResult);
  });

  it('confirms a custom account via CreateCustomAccountUseCase and emits accountCreated', async () => {
    let emitted: unknown;
    component.accountCreated.subscribe(acc => { emitted = acc; });

    component['selectKind']('custom');
    component['purposeText'] = 'Electric car consumption';

    await component['confirm']();

    expect(mockCreateCustomAccount.execute).toHaveBeenCalledWith({
      name: 'Electric car consumption', purpose: 'Electric car consumption'
    });
    expect(mockCreateFinancialAccount.execute).not.toHaveBeenCalled();
    expect(emitted).toBe(customResult);
  });

  it('exposes the curated custom-account presets', () => {
    expect(component['customAccountPresets'].length).toBeGreaterThan(0);
    expect(component['customAccountPresets'].some(p => p.id === 'ev_charging')).toBe(true);
  });

  it('groups presets by category when there is no search query', () => {
    const groups = component['groupedPresets']();

    expect(groups.length).toBeGreaterThan(1);
    const evGroup = groups.find(g => g.presets.some(p => p.id === 'ev_charging'));
    expect(evGroup?.category).toBe('Veículos');
  });

  it('filters presets across categories by label or category text', () => {
    component['presetSearch'] = 'elétrico';

    const groups = component['groupedPresets']();
    const allPresets = groups.flatMap(g => g.presets);

    expect(allPresets.length).toBeGreaterThan(0);
    expect(allPresets.some(p => p.id === 'ev_charging')).toBe(true);
    expect(allPresets.some(p => p.id === 'water_bill')).toBe(false);
  });

  it('selecting a preset pre-fills the purpose text and remembers the presetId', () => {
    const preset = component['customAccountPresets'][0];

    component['selectPreset'](preset);

    expect(component['selectedPresetId']()).toBe(preset.id);
    expect(component['purposeText']).toBe(preset.label);
  });

  it('selecting "Other" clears any chosen preset and the purpose text', () => {
    const preset = component['customAccountPresets'][0];
    component['selectPreset'](preset);

    component['selectOtherPreset']();

    expect(component['selectedPresetId']()).toBeUndefined();
    expect(component['purposeText']).toBe('');
  });

  it('passes the selected presetId through to CreateCustomAccountUseCase on confirm', async () => {
    const preset = component['customAccountPresets'][0];
    component['selectKind']('custom');
    component['selectPreset'](preset);

    await component['confirm']();

    expect(mockCreateCustomAccount.execute).toHaveBeenCalledWith({
      name: preset.label, purpose: preset.label, presetId: preset.id
    });
  });

  describe('custom-account upload + mapping steps', () => {
    it('proceedFromDetails advances a custom account to the upload step instead of creating immediately', () => {
      component['selectKind']('custom');
      component['purposeText'] = 'Electric car consumption';

      component['proceedFromDetails']();

      expect(component['step']()).toBe('upload');
      expect(mockCreateCustomAccount.execute).not.toHaveBeenCalled();
    });

    it('proceedFromDetails creates a financial account immediately (no upload step)', async () => {
      component['selectKind']('financial');
      component['accountName'] = 'Current Account';

      component['proceedFromDetails']();
      await Promise.resolve();

      expect(mockCreateFinancialAccount.execute).toHaveBeenCalled();
    });

    it('skipUpload creates the custom account with no records imported', async () => {
      component['selectKind']('custom');
      component['purposeText'] = 'Electric car consumption';
      component['proceedFromDetails']();

      await component['skipUpload']();

      expect(mockCreateCustomAccount.execute).toHaveBeenCalled();
      expect(mockImportCustomRecords.execute).not.toHaveBeenCalled();
    });

    it('confirm at the mapping step creates the account then imports the mapped rows against its id', async () => {
      component['selectKind']('custom');
      component['purposeText'] = 'Electric car consumption';
      component['proceedFromDetails']();

      component['rawFileRows'].set([
        ['Date', 'kWh', 'Cost'],
        ['2026-07-15', '42.3', '12.50']
      ]);
      component['columnMappings'].set(['date', 'measure', 'measure']);
      component['measureUnits'].set({ 1: 'kWh', 2: 'EUR' });
      component['step'].set('mapping');

      await component['confirm']();

      expect(mockCreateCustomAccount.execute).toHaveBeenCalled();
      expect(mockImportCustomRecords.execute).toHaveBeenCalledWith({
        accountId: customResult.id,
        headers: ['Date', 'kWh', 'Cost'],
        rows: [['2026-07-15', '42.3', '12.50']],
        columnRoles: ['date', 'measure', 'measure'],
        measureUnits: { 1: 'kWh', 2: 'EUR' }
      });
    });

    it('goBackToUpload returns to the upload step from mapping', () => {
      component['step'].set('mapping');

      component['goBackToUpload']();

      expect(component['step']()).toBe('upload');
    });
  });

  it('does nothing when confirm is called while disabled', async () => {
    component['selectKind']('financial');

    await component['confirm']();

    expect(mockCreateFinancialAccount.execute).not.toHaveBeenCalled();
  });

  it('resets to the kind step and clears fields whenever the dialog is reopened', () => {
    component['selectKind']('custom');
    component['selectPreset'](component['customAccountPresets'][0]);
    component['step'].set('details');

    component.visible = true;
    component.ngOnChanges({ visible: {} as unknown as SimpleChange });

    expect(component['step']()).toBe('kind');
    expect(component['kind']()).toBe('financial');
    expect(component['purposeText']).toBe('');
    expect(component['selectedPresetId']()).toBeUndefined();
  });

  it('emits cancel on close', () => {
    let cancelled = false;
    component.cancelled.subscribe(() => { cancelled = true; });

    component['onCancel']();

    expect(cancelled).toBe(true);
  });
});
