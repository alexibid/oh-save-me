import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ImportAssistantDialog } from './import-assistant-dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { I18nService } from '@ui/shared/i18n-shared';
import { TRANSACTION_REPOSITORY_TOKEN } from '@application/tokens';
import { APP_STORE_TOKEN } from '@application/app-store';
import { signal } from '@angular/core';
import { FinancialAccount } from '@domain/models/account';
import { ImportBatch } from '@domain/models/import-batch';
import { Transaction } from '@domain/models/transaction';
import { PersistMappingCorrectionUseCase } from '@application/use-cases/persist-mapping-correction.use-case';

function financialAccount(overrides: Partial<FinancialAccount> & Pick<FinancialAccount, 'id' | 'name' | 'type'>): FinancialAccount {
  return { kind: 'financial', scope: 'individual', includeInConsolidatedBalance: true, unit: 'EUR', updatedAt: 0, ...overrides };
}

describe('ImportAssistantDialog', () => {
  let component: ImportAssistantDialog;
  let fixture: ComponentFixture<ImportAssistantDialog>;

  const testAccount: FinancialAccount = financialAccount({ id: 'acc_1', name: 'Test Account', type: 'bank_account', updatedAt: Date.now() });

  const mockTransactionRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    saveAll: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined)
  };

  const mockPersistMappingCorrection = {
    execute: vi.fn().mockResolvedValue(undefined)
  };

  const mockStore = {
    accounts: signal<FinancialAccount[]>([testAccount]),
    importBatches: signal<ImportBatch[]>([]),
    transactions: signal<Transaction[]>([]),
    addAccount: vi.fn().mockResolvedValue(undefined),
    addImportBatch: vi.fn().mockResolvedValue(undefined),
    updateAccount: vi.fn().mockResolvedValue(undefined),
    setTransactions: vi.fn((txs: Transaction[]) => mockStore.transactions.set(txs))
  };

  beforeEach(async () => {
    mockStore.accounts.set([testAccount]);
    mockStore.importBatches.set([]);
    mockStore.transactions.set([]);
    mockTransactionRepository.saveAll.mockClear();
    mockStore.addAccount.mockClear();
    mockStore.addImportBatch.mockClear();
    mockStore.updateAccount.mockClear();
    mockStore.setTransactions.mockClear();
    mockPersistMappingCorrection.execute.mockClear();

    await TestBed.configureTestingModule({
      imports: [ImportAssistantDialog, NoopAnimationsModule],
      providers: [
        { provide: TRANSACTION_REPOSITORY_TOKEN, useValue: mockTransactionRepository },
        { provide: APP_STORE_TOKEN, useValue: mockStore },
        { provide: PersistMappingCorrectionUseCase, useValue: mockPersistMappingCorrection },
        I18nService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ImportAssistantDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with step 1', () => {
    expect(component['currentStep']()).toBe(1);
  });

  describe('analyzeFile', () => {
    function setupManualMappedCsv() {
      component['fileContent'] = 'Date,Desc,Amount\n2026-07-01,Salary,1000\n2026-07-02,Rent,-500';
      component['loadedFileName'].set('statement.csv');
      component['selectedAccountId'].set(testAccount.id);
      component['columnMappings'].set(['date', 'desc', 'amount']);
    }

    it('should parse a manually-mapped CSV, compute the date range and advance to step 2', async () => {
      setupManualMappedCsv();

      await component['analyzeFile']();

      expect(component['parsedTransactions']().length).toBe(2);
      expect(component['startDateStr']()).toBe('2026-07-01');
      expect(component['endDateStr']()).toBe('2026-07-02');
      expect(component['currentStep']()).toBe(2);
    });

    it('should flag the file as a duplicate when its checksum matches an existing import batch', async () => {
      setupManualMappedCsv();
      component['fileChecksum'].set('checksum_abc');
      mockStore.importBatches.set([
        { id: 'b1', name: 'Prior import', importDate: '', startDate: '2020-01-01', endDate: '2020-01-31', accountId: testAccount.id, transactionCount: 1, fileChecksum: 'checksum_abc', updatedAt: 0 }
      ]);

      await component['analyzeFile']();

      expect(component['isDuplicateFile']()).toBe(true);
    });

    it('should flag a date-range overlap against a prior import for the same account', async () => {
      setupManualMappedCsv();
      component['fileChecksum'].set('checksum_new');
      mockStore.importBatches.set([
        { id: 'b1', name: 'Prior import', importDate: '', startDate: '2026-06-25', endDate: '2026-07-01', accountId: testAccount.id, transactionCount: 1, fileChecksum: 'checksum_other', updatedAt: 0 }
      ]);

      await component['analyzeFile']();

      expect(component['isDuplicateFile']()).toBe(false);
      expect(component['hasOverlap']()).toBe(true);
    });

    it('should report no overlap and no duplicate when the period and checksum are both new', async () => {
      setupManualMappedCsv();
      component['fileChecksum'].set('checksum_new');
      mockStore.importBatches.set([
        { id: 'b1', name: 'Unrelated import', importDate: '', startDate: '2020-01-01', endDate: '2020-01-31', accountId: testAccount.id, transactionCount: 1, fileChecksum: 'checksum_other', updatedAt: 0 }
      ]);

      await component['analyzeFile']();

      expect(component['isDuplicateFile']()).toBe(false);
      expect(component['hasOverlap']()).toBe(false);
    });
  });

  describe('suggestStatementBalance (auto-fill "Saldo Atual" from the file\'s own balance column)', () => {
    it('clears the assistant-suggested marker once the user edits the pre-filled balance', () => {
      component['statementBalanceSuggestedByAssistant'].set(true);

      component['onStatementBalanceChange']('321.00');

      expect(component['statementBalanceInput']()).toBe('321.00');
      expect(component['statementBalanceSuggestedByAssistant']()).toBe(false);
    });
  });

  describe('auto-detect column mapping', () => {
    it('detects a known bank signature with high confidence and does not require manual review', () => {
      component['selectedAccountId'].set(testAccount.id);

      component['applyAutoDetectedMapping'](
        ['Data Mov.', 'Descrição', 'Débito', 'Crédito', 'Saldo Cont.'],
        [['23-07-2026', 'COMPRAS C.DEB LIDL', '15,50', '', '1234,56']]
      );

      expect(component['columnMappings']()).toEqual(['date', 'desc', 'debit', 'credit', 'balance']);
      expect(component['detectionNeedsReview']()).toBe(false);
    });

    it('flags detection as needing manual review when a required field is missing', () => {
      component['selectedAccountId'].set(testAccount.id);

      component['applyAutoDetectedMapping'](['Descricao'], [['Loja X']]);

      expect(component['detectionNeedsReview']()).toBe(true);
    });

    it('parses transactions using the auto-detected mapping when analyzing the file', async () => {
      component['selectedAccountId'].set(testAccount.id);
      component['applyAutoDetectedMapping'](['Data', 'Descricao', 'Valor'], [['01/01/2026', 'Almoço', '8,50']]);
      component['fileContent'] = 'Data,Descricao,Valor\n01/01/2026,Almoço,8,50';
      component['loadedFileName'].set('extrato.csv');
      component['statementBalanceInput'].set('100');

      await component['analyzeFile']();

      expect(component['parsedTransactions']().length).toBe(1);
      expect(component['parsedTransactions']()[0].description).toBe('Almoço');
    });
  });

  describe('account suggestion from a recognized bank signature', () => {
    it('pre-fills the new-account name/type and auto-opens the form when there are no accounts yet', () => {
      mockStore.accounts.set([]);

      component['applyAutoDetectedMapping'](
        ['Data Mov.', 'Descrição', 'Débito', 'Crédito', 'Saldo Cont.'],
        [['23-07-2026', 'COMPRAS C.DEB LIDL', '15,50', '', '1234,56']]
      );

      expect(component['newAccountName']).toBe('CGD Extrato Normal');
      expect(component['newAccountType']).toBe('bank_account');
      expect(component['showNewAccountForm']()).toBe(true);
      expect(component['accountSuggestedByAssistant']()).toBe(true);
    });

    it('translates every account type to a human label, for the assistant explanation shown next to the pre-filled form', () => {
      expect(component['accountTypeLabel']('bank_account')).toBe(component['i18n'].t().accountTypeBankAccount);
      expect(component['accountTypeLabel']('credit_card')).toBe(component['i18n'].t().accountTypeCreditCard);
      expect(component['accountTypeLabel']('meal_card')).toBe(component['i18n'].t().accountTypeMealCard);
      expect(component['accountTypeLabel']('investment')).toBe(component['i18n'].t().accountTypeInvestment);
    });

    it('clears the assistant-suggested marker once the user edits the suggested name', () => {
      mockStore.accounts.set([]);
      component['applyAutoDetectedMapping'](
        ['Data Mov.', 'Descrição', 'Débito', 'Crédito', 'Saldo Cont.'],
        [['23-07-2026', 'COMPRAS C.DEB LIDL', '15,50', '', '1234,56']]
      );
      expect(component['accountSuggestedByAssistant']()).toBe(true);

      component['onNewAccountNameChange']('Outro Nome');

      expect(component['accountSuggestedByAssistant']()).toBe(false);
    });

    it('clears the assistant-suggested marker once the user edits the suggested type', () => {
      mockStore.accounts.set([]);
      component['applyAutoDetectedMapping'](
        ['Data Mov.', 'Descrição', 'Débito', 'Crédito', 'Saldo Cont.'],
        [['23-07-2026', 'COMPRAS C.DEB LIDL', '15,50', '', '1234,56']]
      );

      component['onNewAccountTypeChange']('credit_card');

      expect(component['accountSuggestedByAssistant']()).toBe(false);
    });

    it('opens the form and suggests even when unrelated accounts already exist (regression: the prompt was silently invisible whenever the user had any account at all)', () => {

      component['applyAutoDetectedMapping'](
        ['Data Mov.', 'Descrição', 'Débito', 'Crédito', 'Saldo Cont.'],
        [['23-07-2026', 'COMPRAS C.DEB LIDL', '15,50', '', '1234,56']]
      );

      expect(component['newAccountName']).toBe('CGD Extrato Normal');
      expect(component['showNewAccountForm']()).toBe(true);
    });

    it('does not re-suggest when an account matching the detected bank already exists', () => {
      mockStore.accounts.set([financialAccount({ id: 'acc_cgd', name: 'CGD Extrato Normal', type: 'bank_account', updatedAt: Date.now() })]);

      component['applyAutoDetectedMapping'](
        ['Data Mov.', 'Descrição', 'Débito', 'Crédito', 'Saldo Cont.'],
        [['23-07-2026', 'COMPRAS C.DEB LIDL', '15,50', '', '1234,56']]
      );

      expect(component['newAccountName']).toBe('');
      expect(component['showNewAccountForm']()).toBe(false);
    });

    it('never overwrites a name the user already typed', () => {
      component['newAccountName'] = 'A Minha Conta';

      component['applyAutoDetectedMapping'](
        ['Data Mov.', 'Descrição', 'Débito', 'Crédito', 'Saldo Cont.'],
        [['23-07-2026', 'COMPRAS C.DEB LIDL', '15,50', '', '1234,56']]
      );

      expect(component['newAccountName']).toBe('A Minha Conta');
    });

    it('leaves the name blank for an unrecognized file', () => {
      component['applyAutoDetectedMapping'](['Coluna A', 'Coluna B'], [['x', 'y']]);

      expect(component['newAccountName']).toBe('');
    });
  });

  describe('account suggestion — ambiguous tie (Cartão Refeição vs Caixa Classic)', () => {
    it('opens the form with both tied candidates instead of guessing, and leaves the name blank', () => {
      mockStore.accounts.set([]);

      component['applyAutoDetectedMapping'](
        ['Data', 'Data valor', 'Descrição', 'Débito', 'Crédito', 'Fraccionar'],
        [['23-07-2026', '23-07-2026', 'PINGO DOCE', '12,00', '', 'x']]
      );

      expect(component['showNewAccountForm']()).toBe(true);
      expect(component['newAccountName']).toBe('');
      expect(component['accountSuggestedByAssistant']()).toBe(false);
      expect(component['accountSuggestionCandidates']()).toEqual(expect.arrayContaining([
        { name: 'Cartão Refeição Padrão', type: 'meal_card' },
        { name: 'Caixa Classic', type: 'credit_card' }
      ]));
    });

    it('choosing a candidate applies it exactly like a confident suggestion and clears the tie', () => {
      mockStore.accounts.set([]);
      component['applyAutoDetectedMapping'](
        ['Data', 'Data valor', 'Descrição', 'Débito', 'Crédito', 'Fraccionar'],
        [['23-07-2026', '23-07-2026', 'PINGO DOCE', '12,00', '', 'x']]
      );

      component['chooseAccountCandidate']({ name: 'Caixa Classic', type: 'credit_card' });

      expect(component['accountSuggestionCandidates']()).toEqual([]);
      expect(component['newAccountName']).toBe('Caixa Classic');
      expect(component['newAccountType']).toBe('credit_card');
      expect(component['accountSuggestedByAssistant']()).toBe(true);
    });

    it('does not show a tie for a confidently-recognized single-match file', () => {
      mockStore.accounts.set([]);

      component['applyAutoDetectedMapping'](
        ['Data Mov.', 'Descrição', 'Débito', 'Crédito', 'Saldo Cont.'],
        [['23-07-2026', 'COMPRAS C.DEB LIDL', '15,50', '', '1234,56']]
      );

      expect(component['accountSuggestionCandidates']()).toEqual([]);
    });
  });

  describe('proceedToStep3 (learned-mapping persistence)', () => {
    it('persists the corrected mapping when the fallback mapper was shown (low confidence)', () => {
      component['selectedAccountId'].set(testAccount.id);
      component['applyAutoDetectedMapping'](['Descricao'], [['Loja X']]);
      component['rawFileRows'].set([['Descricao'], ['Loja X']]);
      component['columnMappings'].set(['desc']);

      component['proceedToStep3']();

      expect(mockPersistMappingCorrection.execute).toHaveBeenCalledTimes(1);
      expect(mockPersistMappingCorrection.execute).toHaveBeenCalledWith(
        ['Descricao'],
        { desc: { columnIndex: 0, confidence: 1 } },
        [['Loja X']]
      );
      expect(component['currentStep']()).toBe(3);
    });

    it('does not persist anything when the detection was already confident', () => {
      component['selectedAccountId'].set(testAccount.id);
      component['applyAutoDetectedMapping'](
        ['Data Mov.', 'Descrição', 'Débito', 'Crédito', 'Saldo Cont.'],
        [['23-07-2026', 'COMPRAS C.DEB LIDL', '15,50', '', '1234,56']]
      );
      component['rawFileRows'].set([['Data Mov.', 'Descrição', 'Débito', 'Crédito', 'Saldo Cont.']]);

      component['proceedToStep3']();

      expect(mockPersistMappingCorrection.execute).not.toHaveBeenCalled();
      expect(component['currentStep']()).toBe(3);
    });
  });

  describe('debit/credit vs signed amount (required-field leniency)', () => {

    it('should be invalid when nothing is mapped', () => {
      component['selectedAccountId'].set(testAccount.id);
      component['columnMappings'].set(['date', 'desc']);

      expect(component['isStep2Invalid']()).toBe(true);
      expect(component['missingRequiredColumns']().length).toBeGreaterThan(0);
    });

    it('should satisfy the "amount" requirement with a debit/credit pair, without a separate amount column', () => {
      component['selectedAccountId'].set(testAccount.id);
      component['columnMappings'].set(['date', 'desc', 'debit', 'credit']);
      component['statementBalanceInput'].set('100');

      expect(component['isStep2Invalid']()).toBe(false);
      expect(component['missingRequiredColumns']()).toEqual([]);
    });

    it('should satisfy the "amount" requirement with a single signed amount column', () => {
      component['selectedAccountId'].set(testAccount.id);
      component['columnMappings'].set(['date', 'desc', 'amount', 'credit']);
      component['statementBalanceInput'].set('100');

      expect(component['isStep2Invalid']()).toBe(false);
    });

    it('should drop the "amount" chip from the mapper once debit or credit is already mapped', () => {
      component['selectedAccountId'].set(testAccount.id);
      component['columnMappings'].set(['date', 'desc', 'debit']);

      const roles = component['requiredFieldsForMapper']().map(f => f.role);
      expect(roles).not.toContain('amount');
    });
  });

  describe('createNewAccount', () => {
    it('should persist the new account via the store and select it', async () => {
      component['newAccountName'] = 'Cartão Novo';
      component['newAccountType'] = 'investment';

      await component['createNewAccount']();

      expect(mockStore.addAccount).toHaveBeenCalledTimes(1);
      const savedAccount = mockStore.addAccount.mock.calls[0][0] as FinancialAccount;
      expect(savedAccount.name).toBe('Cartão Novo');
      expect(savedAccount.type).toBe('investment');
      expect(component['selectedAccountId']()).toBe(savedAccount.id);
      expect(component['showNewAccountForm']()).toBe(false);
    });

    it('should do nothing when the account name is blank', async () => {
      component['newAccountName'] = '   ';

      await component['createNewAccount']();

      expect(mockStore.addAccount).not.toHaveBeenCalled();
    });
  });

  describe('confirmAndProcess', () => {
    it('should save the import batch, persist only unique transactions and emit importCompleted', async () => {
      const existingTx: Transaction = {
        id: 'tx_existing', date: '2026-07-01', description: 'Already imported', amount: -10,
        category: 'Others', accountId: testAccount.id
      };
      const duplicateTx: Transaction = { ...existingTx };
      const newTx: Transaction = {
        id: 'tx_new', date: '2026-07-02', description: 'New transaction', amount: -20,
        category: 'Others', accountId: testAccount.id
      };

      mockStore.transactions.set([existingTx]);
      component['selectedAccountId'].set(testAccount.id);
      component['parsedTransactions'].set([duplicateTx, newTx]);
      component['startDateStr'].set('2026-07-01');
      component['endDateStr'].set('2026-07-02');
      component['batchFriendlyName'].set('Julho 2026');
      component['fileChecksum'].set('checksum_confirm');

      const completedSpy = vi.fn();
      component.importCompleted.subscribe(completedSpy);

      await component['confirmAndProcess']();

      expect(mockStore.addImportBatch).toHaveBeenCalledTimes(1);
      const savedBatch = mockStore.addImportBatch.mock.calls[0][0] as ImportBatch;
      expect(savedBatch.accountId).toBe(testAccount.id);
      expect(savedBatch.fileChecksum).toBe('checksum_confirm');

      expect(mockStore.setTransactions).toHaveBeenCalledTimes(1);
      const persisted = mockStore.setTransactions.mock.calls[0][0] as Transaction[];
      expect(persisted.map(t => t.id).sort()).toEqual(['tx_existing', 'tx_new']);

      expect(mockTransactionRepository.saveAll).toHaveBeenCalledTimes(1);
      expect(completedSpy).toHaveBeenCalledTimes(1);
    });

    it('should emit triageReady with the newly-saved transactions, flagging Others as pendingReview', async () => {
      const newTx: Transaction = {
        id: 'tx_new', date: '2026-07-02', description: 'New transaction', amount: -20,
        category: 'Others', accountId: testAccount.id
      };

      mockStore.transactions.set([]);
      component['selectedAccountId'].set(testAccount.id);
      component['parsedTransactions'].set([newTx]);
      component['startDateStr'].set('2026-07-02');
      component['endDateStr'].set('2026-07-02');
      component['fileChecksum'].set('checksum_triage');

      const triageSpy = vi.fn();
      component.triageReady.subscribe(triageSpy);

      await component['confirmAndProcess']();

      expect(triageSpy).toHaveBeenCalledTimes(1);
      const emitted = triageSpy.mock.calls[0][0] as Transaction[];
      expect(emitted).toHaveLength(1);
      expect(emitted[0]).toMatchObject({ id: 'tx_new', pendingReview: true });
    });

    it('should not emit triageReady when every parsed transaction is already imported', async () => {
      const existingTx: Transaction = {
        id: 'tx_existing', date: '2026-07-01', description: 'Already imported', amount: -10,
        category: 'Others', accountId: testAccount.id
      };

      mockStore.transactions.set([existingTx]);
      component['selectedAccountId'].set(testAccount.id);
      component['parsedTransactions'].set([{ ...existingTx }]);
      component['startDateStr'].set('2026-07-01');
      component['endDateStr'].set('2026-07-01');
      component['fileChecksum'].set('checksum_no_triage');

      const triageSpy = vi.fn();
      component.triageReady.subscribe(triageSpy);

      await component['confirmAndProcess']();

      expect(triageSpy).not.toHaveBeenCalled();
    });

    it('should not touch the store when every parsed transaction is already imported', async () => {
      const existingTx: Transaction = {
        id: 'tx_existing', date: '2026-07-01', description: 'Already imported', amount: -10,
        category: 'Others', accountId: testAccount.id
      };

      mockStore.transactions.set([existingTx]);
      component['selectedAccountId'].set(testAccount.id);
      component['parsedTransactions'].set([{ ...existingTx }]);
      component['startDateStr'].set('2026-07-01');
      component['endDateStr'].set('2026-07-01');
      component['fileChecksum'].set('checksum_dup_only');

      await component['confirmAndProcess']();

      expect(mockStore.setTransactions).not.toHaveBeenCalled();
      expect(mockTransactionRepository.saveAll).not.toHaveBeenCalled();
    });

    describe('internal transfer linking', () => {
      const investmentAccount: FinancialAccount = financialAccount({
        id: 'acc_2', name: 'Investment', type: 'investment', updatedAt: 0
      });

      it('links opposite-sign transactions across accounts within 3 days and categorizes both as Transfers', async () => {
        const counterpart: Transaction = {
          id: 'tx_counterpart', date: '2026-07-06', description: 'Deposit from checking',
          amount: 1000, category: 'Others', accountId: investmentAccount.id
        };
        const newTx: Transaction = {
          id: 'tx_new', date: '2026-07-05', description: 'Transfer to investment',
          amount: -1000, category: 'Others', accountId: testAccount.id
        };

        mockStore.accounts.set([testAccount, investmentAccount]);
        mockStore.transactions.set([counterpart]);
        component['selectedAccountId'].set(testAccount.id);
        component['parsedTransactions'].set([newTx]);
        component['startDateStr'].set('2026-07-05');
        component['endDateStr'].set('2026-07-05');
        component['fileChecksum'].set('checksum_transfer');

        await component['confirmAndProcess']();

        const finalCall = mockStore.setTransactions.mock.calls.at(-1)![0] as Transaction[];
        const finalNewTx = finalCall.find(t => t.id === 'tx_new')!;
        const finalCounterpart = finalCall.find(t => t.id === 'tx_counterpart')!;

        expect(finalNewTx.category).toBe('Transfers');
        expect(finalNewTx.linkedTransactionId).toBe('tx_counterpart');
        expect(finalNewTx.transferAccountId).toBe(investmentAccount.id);

        expect(finalCounterpart.category).toBe('Transfers');
        expect(finalCounterpart.linkedTransactionId).toBe('tx_new');
        expect(finalCounterpart.transferAccountId).toBe(testAccount.id);

        expect(mockTransactionRepository.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'tx_new', category: 'Transfers' }));
        expect(mockTransactionRepository.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'tx_counterpart', category: 'Transfers' }));
      });

      it('does not touch category when no counterpart transaction exists', async () => {
        const newTx: Transaction = {
          id: 'tx_lonely', date: '2026-07-05', description: 'Groceries',
          amount: -42, category: 'Others', accountId: testAccount.id
        };

        mockStore.transactions.set([]);
        component['selectedAccountId'].set(testAccount.id);
        component['parsedTransactions'].set([newTx]);
        component['startDateStr'].set('2026-07-05');
        component['endDateStr'].set('2026-07-05');
        component['fileChecksum'].set('checksum_no_transfer');

        await component['confirmAndProcess']();

        const finalCall = mockStore.setTransactions.mock.calls.at(-1)![0] as Transaction[];
        expect(finalCall.find(t => t.id === 'tx_lonely')!.category).toBe('Others');
      });
    });

    describe('statement balance anchor', () => {
      it('should chain same-day transactions in their true order via the reported balance (regression: CGD real export scrambles a day — neither as-listed nor reversed matches)', async () => {

        const trf1: Transaction = { id: 'trf1', date: '2026-07-31', description: 'TRF APCOR', amount: 1563.00, category: 'Others', accountId: testAccount.id, balance: 5943.62 };
        const trf2: Transaction = { id: 'trf2', date: '2026-07-31', description: 'TRF APCOR', amount: 1431.00, category: 'Others', accountId: testAccount.id, balance: 4380.62 };
        const viaVerde: Transaction = { id: 'trf3', date: '2026-07-31', description: 'VIA VERDE', amount: -11.29, category: 'Others', accountId: testAccount.id, balance: 2949.62 };
        const compras: Transaction = { id: 'trf4', date: '2026-07-31', description: 'COMPRAS C.DEB', amount: -57.68, category: 'Others', accountId: testAccount.id, balance: 2960.91 };
        const comissao: Transaction = { id: 'trf5', date: '2026-07-31', description: 'COMISSAO', amount: -1.20, category: 'Others', accountId: testAccount.id, balance: 3018.59 };

        mockStore.transactions.set([]);
        component['selectedAccountId'].set(testAccount.id);

        component['parsedTransactions'].set([trf1, trf2, viaVerde, compras, comissao]);
        component['startDateStr'].set('2026-07-31');
        component['endDateStr'].set('2026-07-31');
        component['fileChecksum'].set('checksum_sameday');
        component['statementBalanceInput'].set('5943,62');

        await component['confirmAndProcess']();

        const persisted = mockStore.setTransactions.mock.calls[0][0] as Transaction[];
        const byId = (id: string) => persisted.find(t => t.id === id)?.balance;

        expect(byId('trf5')).toBe(3018.59);
        expect(byId('trf4')).toBe(2960.91);
        expect(byId('trf3')).toBe(2949.62);
        expect(byId('trf2')).toBe(4380.62);
        expect(byId('trf1')).toBe(5943.62);
      });
    });

    describe('statement balance anchor (basic)', () => {
      it('should recompute every transaction\'s balance (existing + new) off the provided anchor, and save the derived openingBalance', async () => {
        const existingTx: Transaction = {
          id: 'tx_old', date: '2026-07-01', description: 'Old', amount: -10, category: 'Others', accountId: testAccount.id
        };
        const newTx: Transaction = {
          id: 'tx_new', date: '2026-07-02', description: 'New', amount: -20, category: 'Others', accountId: testAccount.id
        };

        mockStore.transactions.set([existingTx]);
        component['selectedAccountId'].set(testAccount.id);
        component['parsedTransactions'].set([newTx]);
        component['startDateStr'].set('2026-07-02');
        component['endDateStr'].set('2026-07-02');
        component['fileChecksum'].set('checksum_anchor');
        component['statementBalanceInput'].set('970');

        await component['confirmAndProcess']();

        const persisted = mockStore.setTransactions.mock.calls[0][0] as Transaction[];
        expect(persisted.find(t => t.id === 'tx_old')?.balance).toBe(990);
        expect(persisted.find(t => t.id === 'tx_new')?.balance).toBe(970);

        expect(mockTransactionRepository.saveAll).toHaveBeenCalledTimes(1);
        const saved = mockTransactionRepository.saveAll.mock.calls[0][0] as Transaction[];
        expect(saved.length).toBe(2);

        expect(mockStore.updateAccount).toHaveBeenCalledTimes(1);
        expect(mockStore.updateAccount.mock.calls[0][0].openingBalance).toBe(1000);
      });

      it('should fall back to the old prepend-only behavior when no anchor was provided', async () => {
        const existingTx: Transaction = {
          id: 'tx_old', date: '2026-07-01', description: 'Old', amount: -10, category: 'Others', accountId: testAccount.id
        };
        const newTx: Transaction = {
          id: 'tx_new', date: '2026-07-02', description: 'New', amount: -20, category: 'Others', accountId: testAccount.id
        };

        mockStore.transactions.set([existingTx]);
        component['selectedAccountId'].set(testAccount.id);
        component['parsedTransactions'].set([newTx]);
        component['startDateStr'].set('2026-07-02');
        component['endDateStr'].set('2026-07-02');
        component['fileChecksum'].set('checksum_no_anchor');

        await component['confirmAndProcess']();

        expect(mockTransactionRepository.saveAll).toHaveBeenCalledTimes(1);
        const saved = mockTransactionRepository.saveAll.mock.calls[0][0] as Transaction[];
        expect(saved.length).toBe(1);
        expect(saved[0].id).toBe('tx_new');
        expect(saved[0].balance).toBeUndefined();
      });
    });
  });

  describe('statement balance requirement', () => {
    it('should require a statement balance for bank_account accounts', () => {
      component['selectedAccountId'].set(testAccount.id);
      expect(component['isStatementBalanceRequired']()).toBe(true);
    });

    it('should not require a statement balance for investment accounts', () => {
      const investAcc: FinancialAccount = financialAccount({ id: 'acc_invest', name: 'Broker', type: 'investment' });
      mockStore.accounts.set([investAcc]);
      component['selectedAccountId'].set(investAcc.id);
      expect(component['isStatementBalanceRequired']()).toBe(false);
    });

    it('should not require a statement balance for credit_card accounts (no running balance to anchor)', () => {
      const creditAcc: FinancialAccount = financialAccount({ id: 'acc_credit', name: 'Cartão Universo', type: 'credit_card' });
      mockStore.accounts.set([creditAcc]);
      component['selectedAccountId'].set(creditAcc.id);
      expect(component['isStatementBalanceRequired']()).toBe(false);
    });

    it('should not require a statement balance for meal_card accounts (kept on manual openingBalance instead)', () => {
      const mealAcc: FinancialAccount = financialAccount({ id: 'acc_meal', name: 'Cartão Refeição', type: 'meal_card' });
      mockStore.accounts.set([mealAcc]);
      component['selectedAccountId'].set(mealAcc.id);
      expect(component['isStatementBalanceRequired']()).toBe(false);
    });

    it('should block step 2 when columns are fully mapped but the balance is still missing', () => {
      component['selectedAccountId'].set(testAccount.id);
      component['columnMappings'].set(['date', 'desc', 'debit', 'credit']);

      expect(component['isStep2Invalid']()).toBe(true);
    });

    it('should unblock step 2 once the statement balance is filled in', () => {
      component['selectedAccountId'].set(testAccount.id);
      component['columnMappings'].set(['date', 'desc', 'debit', 'credit']);
      component['statementBalanceInput'].set('1234,56');

      expect(component['isStep2Invalid']()).toBe(false);
      expect(component['statementBalance']()).toBe(1234.56);
    });
  });
});
