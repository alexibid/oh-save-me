import { TestBed } from '@angular/core/testing';
import { UpdateAccountConsolidationUseCase } from './update-account-consolidation.use-case';
import { APP_STORE_TOKEN } from '@application/app-store';
import { FinancialAccount } from '@domain/models/account';

describe('UpdateAccountConsolidationUseCase', () => {
  let useCase: UpdateAccountConsolidationUseCase;
  let updated: FinancialAccount[];

  const account: FinancialAccount = {
    id: 'acc_1', kind: 'financial', name: 'Conta do Avô', type: 'bank_account',
    scope: 'joint', includeInConsolidatedBalance: true, unit: 'EUR', updatedAt: 0
  };

  beforeEach(() => {
    updated = [];
    const mockStore = {
      updateAccount: async (acc: FinancialAccount) => { updated.push(acc); }
    };

    TestBed.configureTestingModule({
      providers: [
        UpdateAccountConsolidationUseCase,
        { provide: APP_STORE_TOKEN, useValue: mockStore }
      ]
    });
    useCase = TestBed.inject(UpdateAccountConsolidationUseCase);
  });

  it('toggles includeInConsolidatedBalance and bumps updatedAt, independent of any dialog', async () => {
    await useCase.execute(account, false);

    expect(updated).toHaveLength(1);
    expect(updated[0].includeInConsolidatedBalance).toBe(false);
    expect(updated[0].id).toBe('acc_1');
    expect(updated[0].updatedAt).toBeGreaterThan(0);
  });
});
