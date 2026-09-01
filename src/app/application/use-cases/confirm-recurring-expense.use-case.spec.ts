import { TestBed } from '@angular/core/testing';
import { ConfirmRecurringExpenseUseCase } from './confirm-recurring-expense.use-case';
import { APP_STORE_TOKEN } from '@application/app-store';
import { createMockStore, MockAppStore } from '@/mocks/store.mock';
import { Transaction } from '@domain/models/transaction';

const charge = (id: string, description: string, date: string): Transaction => ({
  id,
  date,
  description,
  amount: -45.5,
  category: 'Utilities',
  accountId: 'acc-1'
});

describe('ConfirmRecurringExpenseUseCase', () => {
  let useCase: ConfirmRecurringExpenseUseCase;
  let store: MockAppStore;

  beforeEach(() => {
    store = createMockStore();
    store.transactions.set([
      charge('edp-1', 'EDP COMERCIAL', '2026-06-05'),
      charge('edp-2', 'EDP COMERCIAL', '2026-07-05'),
      charge('edp-3', 'EDP COMERCIAL', '2026-08-05'),
      charge('other', 'FNAC LISBOA', '2026-08-06')
    ]);

    TestBed.configureTestingModule({
      providers: [
        { provide: APP_STORE_TOKEN, useValue: store },
        ConfirmRecurringExpenseUseCase
      ]
    });
    useCase = TestBed.inject(ConfirmRecurringExpenseUseCase);
  });

  it('answers for every charge sharing the description, not just the one asked about', async () => {
    await useCase.confirm(store.transactions()[2]);

    const answered = store.updateTransactionRecurrence.mock.calls.map(call => call[0].id);
    expect(answered.sort()).toEqual(['edp-1', 'edp-2', 'edp-3']);
  });

  it('records a rejection as an explicit no, never as an absence of an answer', async () => {
    await useCase.reject(store.transactions()[0]);

    const flags = store.updateTransactionRecurrence.mock.calls.map(call => call[1]);
    expect(flags).toEqual([false, false, false]);
  });

  it('leaves unrelated merchants untouched', async () => {
    await useCase.confirm(store.transactions()[0]);

    const answered = store.updateTransactionRecurrence.mock.calls.map(call => call[0].id);
    expect(answered).not.toContain('other');
  });

  it('clears the answer so the classifier may guess again', async () => {
    await useCase.clear(store.transactions()[0]);

    const flags = store.updateTransactionRecurrence.mock.calls.map(call => call[1]);
    expect(flags.every(flag => flag === undefined)).toBe(true);
  });
});
