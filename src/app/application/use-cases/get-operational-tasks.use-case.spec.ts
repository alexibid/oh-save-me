import { TestBed } from '@angular/core/testing';
import { GetOperationalTasksUseCase } from './get-operational-tasks.use-case';
import { APP_STORE_TOKEN } from '@application/app-store';
import { createMockStore } from '@/mocks/store.mock';
import { I18nService } from '@application/i18n.service';
import { SuggestionDismissalService } from '@application/services/suggestion-dismissal.service';

describe('GetOperationalTasksUseCase', () => {
  let useCase: GetOperationalTasksUseCase;
  let mockStore: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    mockStore = createMockStore();
    TestBed.configureTestingModule({
      providers: [
        GetOperationalTasksUseCase,
        I18nService,
        SuggestionDismissalService,
        { provide: APP_STORE_TOKEN, useValue: mockStore },
      ],
    });
    useCase = TestBed.inject(GetOperationalTasksUseCase);
  });

  it('computes operational tasks from store data', () => {
    const tasks = useCase.tasks();
    expect(Array.isArray(tasks)).toBe(true);
  });

  it('filters out dismissed tasks in activeTasks', () => {
    const dismissalService = TestBed.inject(SuggestionDismissalService);
    mockStore.accounts.set([]);

    expect(useCase.tasks().some(t => t.kind === 'no_accounts')).toBe(true);
    expect(useCase.activeTasks().some(t => t.kind === 'no_accounts')).toBe(true);

    dismissalService.dismiss('no_accounts');
    expect(useCase.activeTasks().some(t => t.kind === 'no_accounts')).toBe(false);
  });

  it('detects broker transfer when outflow matches brokerage keyword', () => {
    mockStore.transactions.set([
      {
        id: 'tx_degiro_1',
        description: 'DEGIRO DEPOSIT',
        amount: -200,
        date: '2026-07-01',
        category: 'Others',
      },
    ]);
    const tasks = useCase.tasks();
    expect(tasks.some(t => t.kind === 'broker_transfer')).toBe(true);
  });

  it('detects broker idle cash when investment account has balance', () => {
    mockStore.accounts.set([
      {
        id: 'acc_inv_1',
        name: 'XTB Broker',
        kind: 'financial',
        type: 'investment',
        scope: 'individual',
        includeInConsolidatedBalance: false,
        unit: 'EUR',
        openingBalance: 150,
        updatedAt: 1000,
      },
    ]);
    const tasks = useCase.tasks();
    expect(tasks.some(t => t.kind === 'broker_idle_cash')).toBe(true);
  });

  it('detects structural surplus when period income exceeds expenses and budgets', () => {
    mockStore.startDate.set('2026-07-01');
    mockStore.endDate.set('2026-07-31');
    mockStore.transactions.set([
      {
        id: 'tx_inc_1',
        description: 'Vencimento',
        amount: 2500,
        date: '2026-07-05',
        category: 'Income',
      },
      {
        id: 'tx_exp_1',
        description: 'Despesa',
        amount: -500,
        date: '2026-07-10',
        category: 'Utilities',
      },
    ]);
    mockStore.budgets.set([
      {
        id: 'bud_1',
        name: 'Casa',
        type: 'category',
        amount: 200,
        categoryId: 'Utilities',
      },
    ]);
    const tasks = useCase.tasks();
    expect(tasks.some(t => t.kind === 'structural_surplus')).toBe(true);
  });

  it('detects stale asset revaluation when physical asset has old start date', () => {
    mockStore.budgets.set([
      {
        id: 'asset_house_1',
        name: 'Apartamento',
        type: 'investment',
        kind: 'house',
        amount: 250000,
        startDate: '2020-01-01',
      },
    ]);
    const tasks = useCase.tasks();
    expect(tasks.some(t => t.kind === 'stale_asset_revaluation')).toBe(true);
  });
});
