import { TestBed } from '@angular/core/testing';
import { Transaction } from '@domain/models/transaction';
import { AllocationMovementsDialogComponent } from './allocation-movements-dialog';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { signal } from '@angular/core';
import { APP_STORE_TOKEN } from '@application/app-store';
import { I18nService } from '@application/i18n.service';
import { I18nService as UiI18nService } from '@ui/shared/i18n-shared';

const createMockStore = () => ({
      transactions: signal([
        { id: 't1', date: '2026-08-05', description: 'Hotel', amount: -800, category: 'Travel' },
        { id: 't2', date: '2026-08-10', description: 'Restaurante', amount: -630.61, category: 'Restaurants' },
        { id: 't3', date: '2026-08-30', description: 'Fora do período de férias', amount: -50, category: 'Groceries' }
      ]),
      categories: signal([]),
      startDate: signal('2026-07-28'),
      endDate: signal('2026-08-28'),
      updateTransactionBudget: vi.fn()
    });

describe('AllocationMovementsDialogComponent — vacation project date-range matching', () => {
  let component: AllocationMovementsDialogComponent;
  let mockStore: ReturnType<typeof createMockStore>;

  const vacationBudget = {
    id: 'proj-vacation',
    name: 'Férias Algarve 2026',
    type: 'project' as const,
    kind: 'vacation' as const,
    amount: 1000,
    tags: ['ferias-algarve-2026'],
    startDate: '2026-08-01',
    endDate: '2026-09-01',
    projectStartDate: '2026-08-01',
    projectEndDate: '2026-08-25'
  };

  beforeEach(async () => {
    mockStore = createMockStore();

    await TestBed.configureTestingModule({
      imports: [AllocationMovementsDialogComponent],
      providers: [
        { provide: DialogRef, useValue: { close: () => {} } },
        { provide: DIALOG_DATA, useValue: { budget: vacationBudget } },
        { provide: APP_STORE_TOKEN, useValue: mockStore },
        { provide: I18nService, useValue: { currentLang: signal('pt'), formatDate: (d: string) => d } },
        { provide: UiI18nService, useValue: { currentLang: signal('pt'), onLangChange: signal('pt'), translate: (k: string) => k } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(AllocationMovementsDialogComponent);
    component = fixture.componentInstance;
  });

  it('lists a transaction that only matches by vacation date range as associated, even without a tag or explicit budgetId', () => {
    const associatedIds = component['associatedTransactions']().map((t: Transaction) => t.id);
    expect(associatedIds).toEqual(['t1', 't2']);
  });

  it('excludes a transaction outside the vacation date range from associated, and lists it as available instead', () => {
    const availableIds = component['availableTransactions']().map((t: Transaction) => t.id);
    expect(availableIds).toEqual(['t3']);
  });

  it('sums the associated transactions to the same total that the budget progress calculation would report as spent', () => {
    const associated = component['associatedTransactions']() as { amount: number }[];
    const totalSpent = Math.round(-associated.reduce((sum, t) => sum + t.amount, 0) * 100) / 100;
    expect(totalSpent).toBe(1430.61);
  });

  it('persists a detach requested from the table, instead of dropping the event', async () => {
    await component['onBudgetApplied']({ transactionId: 't2', budgetId: undefined });

    expect(mockStore.updateTransactionBudget).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't2' }),
      undefined
    );
  });

  it('persists an assignment requested from the available tab', async () => {
    await component['onBudgetApplied']({ transactionId: 't3', budgetId: vacationBudget.id });

    expect(mockStore.updateTransactionBudget).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't3' }),
      vacationBudget.id
    );
  });

  it('ignores an event for a transaction that no longer exists rather than writing a bogus record', async () => {
    await component['onBudgetApplied']({ transactionId: 'gone', budgetId: undefined });

    expect(mockStore.updateTransactionBudget).not.toHaveBeenCalled();
  });
});

describe('AllocationMovementsDialogComponent — detaching after the window was materialised', () => {
  const materialisedVacation = {
    id: 'proj-vacation',
    name: 'Férias Algarve 2026',
    type: 'project' as const,
    kind: 'vacation' as const,
    amount: 1000,
    tags: ['ferias-algarve-2026'],
    startDate: '2026-08-01',
    endDate: '2026-09-01',
    projectStartDate: '2026-08-01',
    projectEndDate: '2026-08-25',
    transactionsAutoAssigned: true
  };

  function buildComponent(transactions: readonly unknown[]): AllocationMovementsDialogComponent {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AllocationMovementsDialogComponent],
      providers: [
        { provide: DialogRef, useValue: { close: () => {} } },
        { provide: DIALOG_DATA, useValue: { budget: materialisedVacation } },
        {
          provide: APP_STORE_TOKEN,
          useValue: {
            transactions: signal(transactions),
            categories: signal([]),
            startDate: signal('2026-07-28'),
            endDate: signal('2026-08-28'),
            updateTransactionBudget: vi.fn()
          }
        },
        { provide: I18nService, useValue: { currentLang: signal('pt'), formatDate: (d: string) => d } },
        { provide: UiI18nService, useValue: { currentLang: signal('pt'), onLangChange: signal('pt'), translate: (k: string) => k } }
      ]
    });
    return TestBed.createComponent(AllocationMovementsDialogComponent).componentInstance;
  }

  it('keeps a transaction associated while it still carries the budgetId', () => {
    const component = buildComponent([
      { id: 't1', date: '2026-08-05', description: 'Hotel', amount: -800, category: 'Travel', budgetId: 'proj-vacation' }
    ]);

    expect(component['associatedTransactions']().map((t: Transaction) => t.id)).toEqual(['t1']);
  });

  it('moves a detached transaction to available even though its date still falls inside the vacation window', () => {
    const component = buildComponent([
      { id: 't1', date: '2026-08-05', description: 'Hotel', amount: -800, category: 'Travel' }
    ]);

    expect(component['associatedTransactions']()).toEqual([]);
    expect(component['availableTransactions']().map((t: Transaction) => t.id)).toEqual(['t1']);
  });
});
