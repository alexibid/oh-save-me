import { isTransferCategory, isInvestmentCategory, findTransferLinks, repairAsymmetricTransferLinks } from './transfer.utils';
import { Transaction } from '@domain/models/transaction';
import { CategoryInfo } from '@domain/models/category';

describe('isTransferCategory', () => {
  it('returns true for the Transfers category', () => {
    expect(isTransferCategory('Transfers')).toBe(true);
  });

  it('returns false for any other category', () => {
    expect(isTransferCategory('Groceries')).toBe(false);
    expect(isTransferCategory('Income')).toBe(false);
  });
});

describe('isInvestmentCategory', () => {
  it('returns true for category with investment account type', () => {
    const cat: CategoryInfo = { id: 'Taxes', name: 'Taxes', icon: 'tax', color: 'red', accountTypes: ['investment'] };
    expect(isInvestmentCategory(cat)).toBe(true);
  });

  it('returns false for category without investment account type', () => {
    const cat: CategoryInfo = { id: 'Groceries', name: 'Groceries', icon: 'cart', color: 'green' };
    expect(isInvestmentCategory(cat)).toBe(false);
  });
});

describe('findTransferLinks', () => {
  it('links two opposite-sign transactions on different accounts within 3 days', () => {
    const txs: Transaction[] = [
      { id: 'tx_a', date: '2026-02-27', description: 'Incoming transfer', amount: 10000, category: 'Others', accountId: 'acc_tr' },
      { id: 'tx_b', date: '2026-02-27', description: 'trf trade republic', amount: -10000, category: 'Others', accountId: 'acc_cgd' }
    ];

    const patches = findTransferLinks(txs);

    expect(patches.get('tx_a')).toEqual({ linkedTransactionId: 'tx_b', transferAccountId: 'acc_cgd', category: 'Transfers' });
    expect(patches.get('tx_b')).toEqual({ linkedTransactionId: 'tx_a', transferAccountId: 'acc_tr', category: 'Transfers' });
  });

  it('does not link transactions on the same account', () => {
    const txs: Transaction[] = [
      { id: 'tx_a', date: '2026-02-27', description: 'a', amount: 100, category: 'Others', accountId: 'acc_1' },
      { id: 'tx_b', date: '2026-02-27', description: 'b', amount: -100, category: 'Others', accountId: 'acc_1' }
    ];

    expect(findTransferLinks(txs).size).toBe(0);
  });

  it('does not link transactions further than 3 days apart', () => {
    const txs: Transaction[] = [
      { id: 'tx_a', date: '2026-02-27', description: 'a', amount: 100, category: 'Others', accountId: 'acc_1' },
      { id: 'tx_b', date: '2026-03-05', description: 'b', amount: -100, category: 'Others', accountId: 'acc_2' }
    ];

    expect(findTransferLinks(txs).size).toBe(0);
  });

  it('does not link transactions whose amounts do not cancel out', () => {
    const txs: Transaction[] = [
      { id: 'tx_a', date: '2026-02-27', description: 'a', amount: 100, category: 'Others', accountId: 'acc_1' },
      { id: 'tx_b', date: '2026-02-27', description: 'b', amount: -95, category: 'Others', accountId: 'acc_2' }
    ];

    expect(findTransferLinks(txs).size).toBe(0);
  });

  it('skips transactions already linked, so re-running is a no-op (idempotent)', () => {
    const txs: Transaction[] = [
      { id: 'tx_a', date: '2026-02-27', description: 'a', amount: 100, category: 'Transfers', accountId: 'acc_1', linkedTransactionId: 'tx_b', transferAccountId: 'acc_2' },
      { id: 'tx_b', date: '2026-02-27', description: 'b', amount: -100, category: 'Transfers', accountId: 'acc_2', linkedTransactionId: 'tx_a', transferAccountId: 'acc_1' }
    ];

    expect(findTransferLinks(txs).size).toBe(0);
  });

  it('finds multiple independent transfer pairs across a larger historical set (retroactive backfill scenario)', () => {
    const txs: Transaction[] = [
      { id: 'tx_a1', date: '2026-01-10', description: 'a1', amount: 500, category: 'Others', accountId: 'acc_1' },
      { id: 'tx_a2', date: '2026-01-10', description: 'a2', amount: -500, category: 'Others', accountId: 'acc_2' },
      { id: 'tx_b1', date: '2026-02-15', description: 'b1', amount: -300, category: 'Others', accountId: 'acc_1' },
      { id: 'tx_b2', date: '2026-02-16', description: 'b2', amount: 300, category: 'Others', accountId: 'acc_2' },
      { id: 'tx_unrelated', date: '2026-01-10', description: 'groceries', amount: -20, category: 'Groceries', accountId: 'acc_1' }
    ];

    const patches = findTransferLinks(txs);

    expect(patches.size).toBe(4);
    expect(patches.get('tx_a1')?.linkedTransactionId).toBe('tx_a2');
    expect(patches.get('tx_b1')?.linkedTransactionId).toBe('tx_b2');
    expect(patches.has('tx_unrelated')).toBe(false);
  });

  it('returns an empty map for an empty or single-transaction input', () => {
    expect(findTransferLinks([]).size).toBe(0);
    expect(findTransferLinks([
      { id: 'tx_a', date: '2026-02-27', description: 'a', amount: 100, category: 'Others', accountId: 'acc_1' }
    ]).size).toBe(0);
  });
});

describe('repairAsymmetricTransferLinks', () => {
  it('restores a counterpart\'s back-link when only one side of a pair still points to the other', () => {

    const txs: Transaction[] = [
      {
        id: 'tx_cgd', date: '2026-05-19', description: 'TFI Alexandre Lourenc', amount: 7660, category: 'Transfers',
        accountId: 'acc_cgd', linkedTransactionId: 'tx_tr', transferAccountId: 'acc_tr'
      },
      {
        id: 'tx_tr', date: '2026-05-19', description: 'Outgoing transfer', amount: -7660, category: 'Transfers',
        accountId: 'acc_tr'
      }
    ];

    const patches = repairAsymmetricTransferLinks(txs);

    expect(patches.size).toBe(1);
    expect(patches.get('tx_tr')).toEqual({ linkedTransactionId: 'tx_cgd', transferAccountId: 'acc_cgd', category: 'Transfers' });
    expect(patches.has('tx_cgd')).toBe(false);
  });

  it('does nothing when every link is already reciprocal', () => {
    const txs: Transaction[] = [
      { id: 'tx_a', date: '2026-02-27', description: 'a', amount: 100, category: 'Transfers', accountId: 'acc_1', linkedTransactionId: 'tx_b', transferAccountId: 'acc_2' },
      { id: 'tx_b', date: '2026-02-27', description: 'b', amount: -100, category: 'Transfers', accountId: 'acc_2', linkedTransactionId: 'tx_a', transferAccountId: 'acc_1' }
    ];

    expect(repairAsymmetricTransferLinks(txs).size).toBe(0);
  });

  it('ignores a dangling link pointing at a transaction that no longer exists', () => {
    const txs: Transaction[] = [
      { id: 'tx_a', date: '2026-02-27', description: 'a', amount: 100, category: 'Transfers', accountId: 'acc_1', linkedTransactionId: 'tx_deleted', transferAccountId: 'acc_2' }
    ];

    expect(repairAsymmetricTransferLinks(txs).size).toBe(0);
  });

  it('does not clobber a counterpart that is already validly paired with someone else', () => {
    const txs: Transaction[] = [

      { id: 'tx_a', date: '2026-02-27', description: 'a', amount: 100, category: 'Transfers', accountId: 'acc_1', linkedTransactionId: 'tx_b', transferAccountId: 'acc_2' },
      { id: 'tx_b', date: '2026-02-27', description: 'b', amount: -100, category: 'Transfers', accountId: 'acc_2', linkedTransactionId: 'tx_c', transferAccountId: 'acc_3' },
      { id: 'tx_c', date: '2026-02-27', description: 'c', amount: 100, category: 'Transfers', accountId: 'acc_3', linkedTransactionId: 'tx_b', transferAccountId: 'acc_2' }
    ];

    expect(repairAsymmetricTransferLinks(txs).size).toBe(0);
  });

  it('returns an empty map when nothing has a linkedTransactionId at all', () => {
    const txs: Transaction[] = [
      { id: 'tx_a', date: '2026-02-27', description: 'a', amount: 100, category: 'Others', accountId: 'acc_1' }
    ];

    expect(repairAsymmetricTransferLinks(txs).size).toBe(0);
  });
});
