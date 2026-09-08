import { TestBed } from '@angular/core/testing';
import { RxDbDatabaseService } from './rxdb-database.service';
import { RxdbAccountRepository } from './rxdb-account.repository';
import { Account, FinancialAccount, CustomAccount } from '@domain/models/account';

const financialAccount: FinancialAccount = {
  id: 'acc_1',
  kind: 'financial',
  name: 'Personal Account',
  type: 'bank_account',
  scope: 'individual',
  includeInConsolidatedBalance: true,
  unit: 'EUR',
  updatedAt: Date.now()
};

describe('RxdbAccountRepository', () => {
  let repository: RxdbAccountRepository;
  let dbService: RxDbDatabaseService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        RxDbDatabaseService,
        RxdbAccountRepository
      ]
    });
    repository = TestBed.inject(RxdbAccountRepository);
    dbService = TestBed.inject(RxDbDatabaseService);

    await dbService.initDatabase();
  });

  it('should be created', () => {
    expect(repository).toBeTruthy();
  });

  it('starts empty — no default accounts are ever auto-seeded (regression: the app must never create an account the user did not explicitly approve)', async () => {
    const all = await repository.getAll();
    expect(all).toEqual([]);
  });

  it('saves and returns an explicitly created account', async () => {
    const account: Account = financialAccount;

    await repository.save(account);
    const all = await repository.getAll();

    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Personal Account');
  });

  it('updates an existing account', async () => {
    const account: Account = financialAccount;
    await repository.save(account);

    await repository.update({ ...account, name: 'Renamed Account' });
    const all = await repository.getAll();

    expect(all[0].name).toBe('Renamed Account');
  });

  it('soft-deletes an account so it no longer appears in getAll', async () => {
    const account: Account = financialAccount;
    await repository.save(account);

    await repository.delete('acc_1');
    const all = await repository.getAll();

    expect(all).toEqual([]);
  });

  it('saves and returns a custom account, distinct from the financial branch', async () => {
    const account: CustomAccount = { id: 'acc_custom', kind: 'custom', name: 'Electric Car', purpose: 'Electric car consumption', updatedAt: Date.now() };

    await repository.save(account);
    const all = await repository.getAll();

    expect(all).toHaveLength(1);
    expect(all[0]).toEqual(expect.objectContaining({
      id: 'acc_custom', kind: 'custom', name: 'Electric Car', purpose: 'Electric car consumption'
    }));
  });
});
