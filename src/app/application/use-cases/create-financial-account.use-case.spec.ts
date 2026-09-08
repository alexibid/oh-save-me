import { TestBed } from '@angular/core/testing';
import { CreateFinancialAccountUseCase } from './create-financial-account.use-case';
import { APP_STORE_TOKEN } from '@application/app-store';
import { FinancialAccount } from '@domain/models/account';

describe('CreateFinancialAccountUseCase', () => {
  let useCase: CreateFinancialAccountUseCase;
  let added: FinancialAccount[];

  beforeEach(() => {
    added = [];
    const mockStore = {
      addAccount: async (account: FinancialAccount) => { added.push(account); }
    };

    TestBed.configureTestingModule({
      providers: [
        CreateFinancialAccountUseCase,
        { provide: APP_STORE_TOKEN, useValue: mockStore }
      ]
    });
    useCase = TestBed.inject(CreateFinancialAccountUseCase);
  });

  it('builds a FinancialAccount from the given input and persists it via the store', async () => {
    const result = await useCase.execute({
      name: '  New Account  ',
      type: 'bank_account',
      scope: 'individual',
      includeInConsolidatedBalance: true
    });

    expect(result.kind).toBe('financial');
    expect(result.name).toBe('New Account');
    expect(result.type).toBe('bank_account');
    expect(result.scope).toBe('individual');
    expect(result.includeInConsolidatedBalance).toBe(true);
    expect(result.unit).toBe('EUR');
    expect(added).toEqual([result]);
  });

  it('respects a joint scope with consolidated balance excluded', async () => {
    const result = await useCase.execute({
      name: 'Grandfather Account',
      type: 'bank_account',
      scope: 'joint',
      includeInConsolidatedBalance: false
    });

    expect(result.scope).toBe('joint');
    expect(result.includeInConsolidatedBalance).toBe(false);
  });
});
