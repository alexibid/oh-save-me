import { TestBed } from '@angular/core/testing';
import { RxDbDatabaseService } from './rxdb-database.service';
import { RxdbTransactionRepository } from './rxdb-transaction.repository';
import { Transaction } from '@domain/models/transaction';

describe('RxdbTransactionRepository', () => {
  let repository: RxdbTransactionRepository;
  let dbService: RxDbDatabaseService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        RxDbDatabaseService,
        RxdbTransactionRepository
      ]
    });
    repository = TestBed.inject(RxdbTransactionRepository);
    dbService = TestBed.inject(RxDbDatabaseService);

    await dbService.initDatabase();
  });

  it('should be created', () => {
    expect(repository).toBeTruthy();
  });

  it('should save and retrieve transactions', async () => {
    const tx: Transaction = {
      id: 'tx-1',
      date: '2026-07-23',
      description: 'Test coffee',
      amount: -1.5,
      category: 'Food'
    };

    await repository.saveAll([tx]);
    const all = await repository.getAll();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe('tx-1');
    expect(all[0].description).toBe('Test coffee');
  });

  it('should support updating transactions', async () => {
    const tx: Transaction = {
      id: 'tx-1',
      date: '2026-07-23',
      description: 'Test coffee',
      amount: -1.5,
      category: 'Food'
    };

    await repository.saveAll([tx]);

    const updatedTx = { ...tx, category: 'Leisure' };
    await repository.update(updatedTx);

    const all = await repository.getAll();
    expect(all[0].category).toBe('Leisure');
  });

  it('should delete a transaction', async () => {
    const tx: Transaction = {
      id: 'tx-1',
      date: '2026-07-23',
      description: 'Test coffee',
      amount: -1.5,
      category: 'Food'
    };

    await repository.saveAll([tx]);
    await repository.delete('tx-1');

    const all = await repository.getAll();
    expect(all.length).toBe(0);
  });

  it('should round-trip investment-specific fields (regression: they were silently dropped, breaking Trade Republic balance on reload)', async () => {
    const tx: Transaction = {
      id: 'tx-buy-1',
      date: '2026-07-01',
      description: 'Buy trade',
      amount: -100.03,
      category: 'Investments',
      accountId: 'acc_trade_republic',
      shares: 1,
      price: 100.03,
      fee: 1,
      tax: 0,
      symbol: 'IE00B4L5Y983',
      assetName: 'Core MSCI World USD (Acc)',
      assetType: 'FUND',
      investmentType: 'buy'
    };

    await repository.saveAll([tx]);
    const all = await repository.getAll();
    const saved = all.find(t => t.id === 'tx-buy-1');

    expect(saved?.shares).toBe(1);
    expect(saved?.price).toBe(100.03);
    expect(saved?.fee).toBe(1);
    expect(saved?.tax).toBe(0);
    expect(saved?.symbol).toBe('IE00B4L5Y983');
    expect(saved?.assetName).toBe('Core MSCI World USD (Acc)');
    expect(saved?.assetType).toBe('FUND');
    expect(saved?.investmentType).toBe('buy');
  });

  it('should preserve investment-specific fields through update() as well', async () => {
    const tx: Transaction = {
      id: 'tx-buy-2',
      date: '2026-07-01',
      description: 'Buy trade',
      amount: -50,
      category: 'Investments',
      accountId: 'acc_trade_republic',
      shares: 5,
      symbol: 'ABC',
      investmentType: 'buy'
    };

    await repository.saveAll([tx]);
    await repository.update({ ...tx, category: 'Recategorized' });

    const all = await repository.getAll();
    const updated = all.find(t => t.id === 'tx-buy-2');
    expect(updated?.category).toBe('Recategorized');
    expect(updated?.shares).toBe(5);
    expect(updated?.symbol).toBe('ABC');
    expect(updated?.investmentType).toBe('buy');
  });

  it('should round-trip budgetId through saveAll and update', async () => {
    const tx: Transaction = {
      id: 'tx-budget-1',
      date: '2026-07-23',
      description: 'Wallbox installment',
      amount: -150,
      category: 'Housing',
      budgetId: 'budget-wallbox'
    };

    await repository.saveAll([tx]);
    let all = await repository.getAll();
    expect(all.find(t => t.id === 'tx-budget-1')?.budgetId).toBe('budget-wallbox');

    await repository.update({ ...tx, budgetId: 'budget-vacation' });
    all = await repository.getAll();
    expect(all.find(t => t.id === 'tx-budget-1')?.budgetId).toBe('budget-vacation');
  });

  it('should round-trip pendingReview through saveAll and update', async () => {
    const tx: Transaction = {
      id: 'tx-review-1',
      date: '2026-07-23',
      description: 'Unknown merchant',
      amount: -15,
      category: 'Others',
      pendingReview: true
    };

    await repository.saveAll([tx]);
    let all = await repository.getAll();
    expect(all.find(t => t.id === 'tx-review-1')?.pendingReview).toBe(true);

    await repository.update({ ...tx, category: 'Groceries', pendingReview: false });
    all = await repository.getAll();
    expect(all.find(t => t.id === 'tx-review-1')?.pendingReview).toBe(false);
  });

  it('should clear the database of all transactions', async () => {
    const tx1: Transaction = {
      id: 'tx-1',
      date: '2026-07-23',
      description: 'Test coffee',
      amount: -1.5,
      category: 'Food'
    };
    const tx2: Transaction = {
      id: 'tx-2',
      date: '2026-07-23',
      description: 'Dinner',
      amount: -30.0,
      category: 'Food'
    };

    await repository.saveAll([tx1, tx2]);
    await repository.clear();

    const all = await repository.getAll();
    expect(all.length).toBe(0);
  });
});
