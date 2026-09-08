import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { vi } from 'vitest';
import { AllocationMovementsDialogComponent } from './allocation-movements-dialog';
import { APP_STORE_TOKEN } from '@application/app-store';
import { TransactionClassificationSelectors } from '@application/selectors/transaction-classification.selectors';
import { I18nService } from '@application/i18n.service';
import { I18nService as UiI18nService } from '@ui/shared/i18n-shared';
import { createMockStore, MockAppStore } from '@/mocks/store.mock';
import { Budget } from '@domain/models/budget';
import { Transaction } from '@domain/models/transaction';

const wallet: Budget = {
  id: 'w-house', name: 'Casa', type: 'investment', amount: 100000,
  kind: 'house', tags: ['casa'], isClosed: false
};

function instalment(id: string, date: string, budgetId?: string): Transaction {
  return { id, date, description: 'Mortgage Instalment', amount: -450, category: 'Housing', budgetId };
}

describe('AllocationMovementsDialogComponent — grouping similar movements', () => {
  let component: AllocationMovementsDialogComponent;
  let store: MockAppStore;

  const i18nStub = {
    currentLang: signal('pt'),
    onLangChange: signal('pt'),
    translate: (key: string) => key,
    getCategoryName: (key: string) => key,
    formatDate: (value: string) => value,
    formatCurrency: (value: number) => value.toString(),
    currencySymbol: () => '€'
  };

  beforeEach(() => {
    store = createMockStore();
    store.budgets.set([wallet]);
    store.transactions.set([
      instalment('t1', '2026-01-05'),
      instalment('t2', '2026-02-05'),
      instalment('t3', '2026-03-05'),
      { id: 't4', date: '2026-03-06', description: 'Supermercado', amount: -60, category: 'Groceries' }
    ]);
    store.startDate.set('2026-01-01');
    store.endDate.set('2026-12-31');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        { provide: APP_STORE_TOKEN, useValue: store },
        { provide: DialogRef, useValue: { close: vi.fn() } },
        { provide: DIALOG_DATA, useValue: { budget: wallet } },
        { provide: TransactionClassificationSelectors, useValue: { isRecurring: signal(() => false) } },
        { provide: I18nService, useValue: i18nStub },
        { provide: UiI18nService, useValue: i18nStub }
      ]
    });

    component = TestBed.createComponent(AllocationMovementsDialogComponent).componentInstance;
  });

  it('associates a single movement while similar ones are not grouped', async () => {
    await component['onAssociationToggle']('t1');

    expect(store.updateTransactionBudget).toHaveBeenCalledTimes(1);
    expect(store.updateTransactionBudget.mock.calls[0][0].id).toBe('t1');
    expect(store.updateTransactionBudget.mock.calls[0][1]).toBe('w-house');
  });

  it('associates every movement currently listed when asked to select them all', async () => {
    component['activeTab'].set('available');

    await component['onSelectAllListed']();

    expect(store.applyTransactionsBudget).toHaveBeenCalledTimes(1);
    const [batch, budgetId] = store.applyTransactionsBudget.mock.calls[0];
    expect(batch.map(t => t.id).sort()).toEqual(['t1', 't2', 't3', 't4']);
    expect(budgetId).toBe('w-house');
  });

  it('associates only what the search left on screen', async () => {
    component['activeTab'].set('available');
    component['searchQuery'].set('Instalment');

    await component['onSelectAllListed']();

    const [batch] = store.applyTransactionsBudget.mock.calls[0];
    expect(batch.map(t => t.id).sort()).toEqual(['t1', 't2', 't3']);
  });

  it('writes the whole batch in one go, instead of one movement at a time', async () => {
    component['activeTab'].set('available');

    await component['onSelectAllListed']();

    expect(store.applyTransactionsBudget).toHaveBeenCalledTimes(1);
    expect(store.updateTransactionBudget).not.toHaveBeenCalled();
  });

  it('removes every association when asked to clear them from the associated tab', async () => {
    store.transactions.set([
      instalment('t1', '2026-01-05', 'w-house'),
      instalment('t2', '2026-02-05', 'w-house')
    ]);
    component['activeTab'].set('associated');

    await component['onSelectAllListed']();

    const [batch, budgetId] = store.applyTransactionsBudget.mock.calls[0];
    expect(batch).toHaveLength(2);
    expect(budgetId).toBeUndefined();
  });
});
