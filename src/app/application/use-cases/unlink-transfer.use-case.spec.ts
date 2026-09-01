import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { UnlinkTransferUseCase } from './unlink-transfer.use-case';
import { APP_STORE_TOKEN, AppStore } from '@application/app-store';
import { TRANSACTION_REPOSITORY_TOKEN } from '@application/tokens';
import { TransactionRepository } from '@domain/repositories/transaction.repository';
import { Transaction } from '@domain/models/transaction';

describe('UnlinkTransferUseCase', () => {
  let useCase: UnlinkTransferUseCase;
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
        UnlinkTransferUseCase,
        { provide: APP_STORE_TOKEN, useValue: mockStore },
        { provide: TRANSACTION_REPOSITORY_TOKEN, useValue: mockRepository }
      ]
    });
    useCase = TestBed.inject(UnlinkTransferUseCase);
  });

  it('clears the link fields on both sides of a linked pair — this is the user\'s escape hatch for a false-positive transfer match', async () => {
    mockTransactions.set([
      { id: 'tx_a', date: '2026-02-05', description: 'TFI Camila Duarte', amount: -50, category: 'Transfers', accountId: 'acc_1', linkedTransactionId: 'tx_b', transferAccountId: 'acc_2' },
      { id: 'tx_b', date: '2026-02-06', description: 'unrelated deposit', amount: 50, category: 'Transfers', accountId: 'acc_2', linkedTransactionId: 'tx_a', transferAccountId: 'acc_1' }
    ]);

    await useCase.execute('tx_a');

    const result = mockTransactions();
    expect(result.find(t => t.id === 'tx_a')?.linkedTransactionId).toBeUndefined();
    expect(result.find(t => t.id === 'tx_a')?.transferAccountId).toBeUndefined();
    expect(result.find(t => t.id === 'tx_b')?.linkedTransactionId).toBeUndefined();
    expect(result.find(t => t.id === 'tx_b')?.transferAccountId).toBeUndefined();
    expect(mockRepository.update).toHaveBeenCalledTimes(2);
  });

  it('does nothing when the transaction is not linked', async () => {
    mockTransactions.set([
      { id: 'tx_a', date: '2026-02-05', description: 'groceries', amount: -20, category: 'Groceries', accountId: 'acc_1' }
    ]);

    await useCase.execute('tx_a');

    expect(mockRepository.update).not.toHaveBeenCalled();
  });

  it('still clears the requested side even if its counterpart no longer exists', async () => {
    mockTransactions.set([
      { id: 'tx_a', date: '2026-02-05', description: 'a', amount: -50, category: 'Transfers', accountId: 'acc_1', linkedTransactionId: 'tx_missing', transferAccountId: 'acc_2' }
    ]);

    await useCase.execute('tx_a');

    const result = mockTransactions();
    expect(result.find(t => t.id === 'tx_a')?.linkedTransactionId).toBeUndefined();
    expect(mockRepository.update).toHaveBeenCalledTimes(1);
  });
});
