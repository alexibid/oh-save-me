import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { LinkInternalTransfersUseCase } from './link-internal-transfers.use-case';
import { APP_STORE_TOKEN, AppStore } from '@application/app-store';
import { TRANSACTION_REPOSITORY_TOKEN } from '@application/tokens';
import { TransactionRepository } from '@domain/repositories/transaction.repository';
import { Transaction } from '@domain/models/transaction';

describe('LinkInternalTransfersUseCase', () => {
  let useCase: LinkInternalTransfersUseCase;
  let mockTransactions: ReturnType<typeof signal<Transaction[]>>;
  let mockStore: Partial<AppStore>;
  let mockRepository: Partial<TransactionRepository>;

  beforeEach(() => {
    mockTransactions = signal<Transaction[]>([]);
    mockStore = {
      transactions: mockTransactions,
      setTransactions: (txs: Transaction[]) => mockTransactions.set(txs)
    };
    mockRepository = { update: vi.fn().mockResolvedValue(undefined) };

    TestBed.configureTestingModule({
      providers: [
        LinkInternalTransfersUseCase,
        { provide: APP_STORE_TOKEN, useValue: mockStore },
        { provide: TRANSACTION_REPOSITORY_TOKEN, useValue: mockRepository }
      ]
    });
    useCase = TestBed.inject(LinkInternalTransfersUseCase);
  });

  it('links a same-day opposite-sign transfer pair across accounts and persists both', async () => {
    mockTransactions.set([
      { id: 'tx_a', date: '2026-02-27', description: 'Incoming transfer', amount: 10000, category: 'Others', accountId: 'acc_tr' },
      { id: 'tx_b', date: '2026-02-27', description: 'trf trade republic', amount: -10000, category: 'Others', accountId: 'acc_cgd' }
    ]);

    await useCase.execute();

    const result = mockTransactions();
    expect(result.find(t => t.id === 'tx_a')).toMatchObject({ category: 'Transfers', linkedTransactionId: 'tx_b', transferAccountId: 'acc_cgd' });
    expect(result.find(t => t.id === 'tx_b')).toMatchObject({ category: 'Transfers', linkedTransactionId: 'tx_a', transferAccountId: 'acc_tr' });
    expect(mockRepository.update).toHaveBeenCalledTimes(2);
  });

  it('backfills historical transactions that predate this feature, not just newly-imported ones', async () => {

    mockTransactions.set([
      { id: 'tx_old_a', date: '2026-01-05', description: 'old transfer out', amount: -500, category: 'Others', accountId: 'acc_1' },
      { id: 'tx_old_b', date: '2026-01-06', description: 'old transfer in', amount: 500, category: 'Others', accountId: 'acc_2' }
    ]);

    await useCase.execute();

    const result = mockTransactions();
    expect(result.find(t => t.id === 'tx_old_a')?.category).toBe('Transfers');
    expect(result.find(t => t.id === 'tx_old_b')?.category).toBe('Transfers');
  });

  it('does nothing when no unlinked transfer pair exists', async () => {
    mockTransactions.set([
      { id: 'tx_a', date: '2026-02-27', description: 'groceries', amount: -20, category: 'Groceries', accountId: 'acc_1' }
    ]);

    await useCase.execute();

    expect(mockRepository.update).not.toHaveBeenCalled();
    expect(mockTransactions()[0].category).toBe('Groceries');
  });

  it('is idempotent — running it twice does not touch already-linked transactions again', async () => {
    mockTransactions.set([
      { id: 'tx_a', date: '2026-02-27', description: 'a', amount: 100, category: 'Others', accountId: 'acc_1' },
      { id: 'tx_b', date: '2026-02-27', description: 'b', amount: -100, category: 'Others', accountId: 'acc_2' }
    ]);

    await useCase.execute();
    (mockRepository.update as import("vitest").Mock).mockClear();
    await useCase.execute();

    expect(mockRepository.update).not.toHaveBeenCalled();
  });

  it('returns a summary of repaired vs newly-linked pairs', async () => {
    mockTransactions.set([
      { id: 'tx_a', date: '2026-02-27', description: 'a', amount: 100, category: 'Others', accountId: 'acc_1' },
      { id: 'tx_b', date: '2026-02-27', description: 'b', amount: -100, category: 'Others', accountId: 'acc_2' }
    ]);

    const summary = await useCase.execute();

    expect(summary).toEqual({ repairedCount: 0, newlyLinkedPairs: 1 });
  });

  it('repairs a pair where only one side still points to the other, without mis-matching the healed side to something else', async () => {
    mockTransactions.set([
      {
        id: 'tx_cgd', date: '2026-05-19', description: 'TFI Alexandre Lourenc', amount: 7660, category: 'Transfers',
        accountId: 'acc_cgd', linkedTransactionId: 'tx_tr', transferAccountId: 'acc_tr'
      },
      {
        id: 'tx_tr', date: '2026-05-19', description: 'Outgoing transfer', amount: -7660, category: 'Transfers',
        accountId: 'acc_tr'
      },

      { id: 'tx_other', date: '2026-05-20', description: 'unrelated', amount: 7660, category: 'Others', accountId: 'acc_other' }
    ]);

    await useCase.execute();

    const result = mockTransactions();
    expect(result.find(t => t.id === 'tx_tr')).toMatchObject({ linkedTransactionId: 'tx_cgd', transferAccountId: 'acc_cgd', category: 'Transfers' });
    expect(result.find(t => t.id === 'tx_cgd')).toMatchObject({ linkedTransactionId: 'tx_tr', transferAccountId: 'acc_tr' });
    expect(result.find(t => t.id === 'tx_other')?.category).toBe('Others');
  });
});
