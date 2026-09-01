import { TestBed } from '@angular/core/testing';
import { CreateCustomAccountUseCase } from './create-custom-account.use-case';
import { APP_STORE_TOKEN } from '@application/app-store';
import { CustomAccount } from '@domain/models/account';

describe('CreateCustomAccountUseCase', () => {
  let useCase: CreateCustomAccountUseCase;
  let added: CustomAccount[];

  beforeEach(() => {
    added = [];
    const mockStore = {
      addAccount: async (account: CustomAccount) => { added.push(account); }
    };

    TestBed.configureTestingModule({
      providers: [
        CreateCustomAccountUseCase,
        { provide: APP_STORE_TOKEN, useValue: mockStore }
      ]
    });
    useCase = TestBed.inject(CreateCustomAccountUseCase);
  });

  it('builds a CustomAccount with no scope/consolidated-balance fields at all and persists it via the store', async () => {
    const result = await useCase.execute({ name: ' Carro Elétrico ', purpose: ' Consumo do carro elétrico ' });

    expect(result.kind).toBe('custom');
    expect(result.name).toBe('Carro Elétrico');
    expect(result.purpose).toBe('Consumo do carro elétrico');
    expect(result).not.toHaveProperty('scope');
    expect(result).not.toHaveProperty('includeInConsolidatedBalance');
    expect(added).toEqual([result]);
  });

  it('carries the presetId through when the account was created from a preset', async () => {
    const result = await useCase.execute({ name: 'Carro Elétrico', purpose: 'Consumo do carro elétrico', presetId: 'ev_charging' });

    expect(result.presetId).toBe('ev_charging');
  });
});
