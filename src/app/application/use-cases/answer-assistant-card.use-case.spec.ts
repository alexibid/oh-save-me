import { TestBed } from '@angular/core/testing';
import { AnswerAssistantCardUseCase } from './answer-assistant-card.use-case';
import { ConfirmRecurringExpenseUseCase } from './confirm-recurring-expense.use-case';
import { LinkInternalTransfersUseCase } from './link-internal-transfers.use-case';
import { APP_STORE_TOKEN } from '@application/app-store';
import { createMockStore, MockAppStore } from '@/mocks/store.mock';
import { AssistantCard } from '@domain/models/assistant-card.model';
import { AssistantAnswerKind } from '@domain/models/assistant-task.model';
import { Transaction } from '@domain/models/transaction';
import { Budget } from '@domain/models/budget';
import { vi } from 'vitest';

const charge: Transaction = {
  id: 'tx-1',
  date: '2026-08-05',
  description: 'EDP COMERCIAL',
  amount: -45.5,
  category: 'Utilities',
  accountId: 'acc-1'
};

const trip: Budget = {
  id: 'bud-trip',
  name: 'Férias',
  type: 'project',
  amount: 1000,
  kind: 'vacation'
};

const cardFor = (kind: AssistantAnswerKind, id = 'card-1'): AssistantCard => ({
  id,
  kind: 'confirm_recurring',
  icon: 'sync-alt',
  question: 'q',
  subtext: 's',
  targetId: charge.id,
  filter: null,
  route: null,
  action: null,
  answer: { kind, acceptLabelKey: 'yes', rejectLabelKey: 'no' }
});

describe('AnswerAssistantCardUseCase', () => {
  let useCase: AnswerAssistantCardUseCase;
  let store: MockAppStore;
  let recurrence: { confirm: ReturnType<typeof vi.fn>; reject: ReturnType<typeof vi.fn> };
  let transfers: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    store = createMockStore();
    store.transactions.set([charge]);
    store.budgets.set([trip]);

    recurrence = { confirm: vi.fn().mockResolvedValue(undefined), reject: vi.fn().mockResolvedValue(undefined) };
    transfers = { execute: vi.fn().mockResolvedValue({ repairedCount: 0, newlyLinkedPairs: 0 }) };

    TestBed.configureTestingModule({
      providers: [
        { provide: APP_STORE_TOKEN, useValue: store },
        { provide: ConfirmRecurringExpenseUseCase, useValue: recurrence },
        { provide: LinkInternalTransfersUseCase, useValue: transfers },
        AnswerAssistantCardUseCase
      ]
    });
    useCase = TestBed.inject(AnswerAssistantCardUseCase);
  });

  it('sends a recurrence answer to the recurrence use case, in both directions', async () => {
    await useCase.execute(cardFor('confirm_recurring'), true);
    expect(recurrence.confirm).toHaveBeenCalledWith(charge);

    await useCase.execute(cardFor('confirm_recurring'), false);
    expect(recurrence.reject).toHaveBeenCalledWith(charge);
  });

  it('records a duplicate answer on the movement rather than treating it as a recurrence', async () => {
    await useCase.execute(cardFor('confirm_duplicate'), true);

    expect(store.updateTransactionDuplicateReview).toHaveBeenCalledWith(charge, true);
    expect(recurrence.confirm).not.toHaveBeenCalled();
  });

  it('remembers a rejected duplicate, so the same pair is never asked about again', async () => {
    await useCase.execute(cardFor('confirm_duplicate'), false);

    expect(store.updateTransactionDuplicateReview).toHaveBeenCalledWith(charge, false);
  });

  it('links the accounts when the owner confirms a transfer', async () => {
    await useCase.execute(cardFor('confirm_transfer_link'), true);

    expect(transfers.execute).toHaveBeenCalled();
  });

  it('takes a rejected transfer out of the transfer category instead of linking it', async () => {
    await useCase.execute(cardFor('confirm_transfer_link'), false);

    expect(transfers.execute).not.toHaveBeenCalled();
    expect(store.updateTransactionCategory).toHaveBeenCalledWith(charge, 'Others');
  });

  it('closes the project the card came from', async () => {
    await useCase.execute(cardFor('close_project', 'vacation_budget_ended_bud-trip'), true);

    expect(store.updateBudget).toHaveBeenCalledWith({ ...trip, isClosed: true });
  });

  it('leaves the project open when the owner says no', async () => {
    await useCase.execute(cardFor('close_project', 'vacation_budget_ended_bud-trip'), false);

    expect(store.updateBudget).not.toHaveBeenCalled();
  });

  it('records salary confirmation and sets income category when accepted', async () => {
    await useCase.execute(cardFor('confirm_salary'), true);

    expect(store.updateTransactionIncomeInclusion).toHaveBeenCalledWith(charge, true);
    expect(store.updateTransactionCategory).toHaveBeenCalledWith(charge, 'Income');
  });

  it('records salary exclusion without changing category when rejected', async () => {
    await useCase.execute(cardFor('confirm_salary'), false);

    expect(store.updateTransactionIncomeInclusion).toHaveBeenCalledWith(charge, false);
    expect(store.updateTransactionCategory).not.toHaveBeenCalled();
  });

  it('updates category to investments when asset association is accepted', async () => {
    await useCase.execute(cardFor('associate_asset'), true);

    expect(store.updateTransactionCategory).toHaveBeenCalledWith(charge, 'Investments');
  });

  it('updates account consolidation policy for broker cash', async () => {
    store.accounts.set([
      {
        id: 'acc-inv',
        name: 'Broker',
        kind: 'financial',
        type: 'investment',
        scope: 'individual',
        includeInConsolidatedBalance: false,
        unit: 'EUR',
        openingBalance: 100,
        updatedAt: 1000,
      },
    ]);
    const brokerCard: AssistantCard = {
      ...cardFor('broker_cash_policy'),
      targetId: 'acc-inv',
    };

    await useCase.execute(brokerCard, true);

    expect(store.updateAccount).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'acc-inv', includeInConsolidatedBalance: true })
    );
  });

  it('confirms asset value by updating budget', async () => {
    const assetCard: AssistantCard = {
      ...cardFor('confirm_asset_value'),
      targetId: trip.id,
    };

    await useCase.execute(assetCard, true);

    expect(store.updateBudget).toHaveBeenCalledWith(
      expect.objectContaining({ id: trip.id })
    );
  });

  it('does nothing for a card that asks no question', async () => {
    const plain = { ...cardFor('confirm_recurring'), answer: undefined };

    await useCase.execute(plain, true);

    expect(recurrence.confirm).not.toHaveBeenCalled();
    expect(store.updateTransactionDuplicateReview).not.toHaveBeenCalled();
  });
});
