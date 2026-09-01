import { classifyRecurringTransactions } from './recurring-transaction-classifier';
import { Transaction } from '@domain/models/transaction';

const makeTx = (id: string, date: string, extra: Partial<Transaction> = {}): Transaction => ({
  id,
  date,
  description: 'tx',
  amount: -10,
  category: 'Others',
  ...extra
});

describe('classifyRecurringTransactions', () => {
  it('classifies a monthly, same-amount, same-description series as recurring', () => {
    const monthlyRent: Transaction[] = [
      makeTx('t1', '2026-01-05', { description: 'RENDA CASA', amount: -750 }),
      makeTx('t2', '2026-02-05', { description: 'RENDA CASA', amount: -750 }),
      makeTx('t3', '2026-03-05', { description: 'RENDA CASA', amount: -750 }),
      makeTx('t4', '2026-04-05', { description: 'RENDA CASA', amount: -750 })
    ];

    const result = classifyRecurringTransactions(monthlyRent);

    expect(result.get('t1')?.isRecurring).toBe(true);
    expect(result.get('t4')?.isRecurring).toBe(true);
  });

  it('classifies a salary transfer in the Income category as recurring', () => {
    const salaries: Transaction[] = [
      makeTx('t1', '2026-01-28', { description: 'TRF INSTITUTO DE GEST', amount: 1800, category: 'Income' }),
      makeTx('t2', '2026-02-28', { description: 'TRF INSTITUTO DE GEST', amount: 1800, category: 'Income' }),
      makeTx('t3', '2026-03-27', { description: 'TRF INSTITUTO DE GEST', amount: 1810, category: 'Income' })
    ];

    const result = classifyRecurringTransactions(salaries);

    expect(result.get('t1')?.isRecurring).toBe(true);
  });

  it('classifies a single one-off purchase as not recurring', () => {
    const oneOff: Transaction[] = [
      makeTx('t1', '2026-08-10', { description: 'COMPRAS C.DEB REPSOL', amount: -60, category: 'Transportation' })
    ];

    const result = classifyRecurringTransactions(oneOff);

    expect(result.get('t1')?.isRecurring).toBe(false);
  });

  it('classifies irregular, varying-amount purchases at the same merchant as not recurring', () => {
    const irregularFuelStops: Transaction[] = [
      makeTx('t1', '2026-01-03', { description: 'COMPRAS C.DEB REPSOL', amount: -42, category: 'Transportation' }),
      makeTx('t2', '2026-02-19', { description: 'COMPRAS C.DEB REPSOL', amount: -18, category: 'Transportation' }),
      makeTx('t3', '2026-08-10', { description: 'COMPRAS C.DEB REPSOL', amount: -60, category: 'Transportation' })
    ];

    const result = classifyRecurringTransactions(irregularFuelStops);

    expect(result.get('t3')?.isRecurring).toBe(false);
  });

  it('returns a classification for every transaction id passed in', () => {
    const txs: Transaction[] = [makeTx('t1', '2026-01-01'), makeTx('t2', '2026-01-02')];

    const result = classifyRecurringTransactions(txs);

    expect(result.size).toBe(2);
    expect(result.has('t1')).toBe(true);
    expect(result.has('t2')).toBe(true);
  });

  it('confidence is a probability between 0 and 1', () => {
    const txs: Transaction[] = [makeTx('t1', '2026-01-01')];

    const result = classifyRecurringTransactions(txs);
    const confidence = result.get('t1')!.confidence;

    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });

  it('takes the owner answer over its own guess, in both directions', () => {
    const monthly = [1, 2, 3, 4, 5, 6].map(month => ({
      id: `netflix-${month}`,
      date: `2026-0${month}-05`,
      description: 'NETFLIX',
      amount: -9.99,
      category: 'Entertainment',
      accountId: 'acc-1'
    }));

    const guessed = classifyRecurringTransactions(monthly);
    expect(guessed.get('netflix-1')?.isRecurring).toBe(true);
    expect(guessed.get('netflix-1')?.confirmedByOwner).toBe(false);

    const rejected = classifyRecurringTransactions(
      monthly.map(tx => ({ ...tx, isRecurring: false }))
    );
    expect(rejected.get('netflix-1')?.isRecurring).toBe(false);
    expect(rejected.get('netflix-1')?.confirmedByOwner).toBe(true);
  });

  it('marks a one-off as recurring when the owner says so, however weak the signal', () => {
    const single = [{
      id: 'rent-1',
      date: '2026-08-01',
      description: 'RENDA',
      amount: -700,
      category: 'Housing',
      accountId: 'acc-1',
      isRecurring: true
    }];

    const result = classifyRecurringTransactions(single);
    expect(result.get('rent-1')?.isRecurring).toBe(true);
    expect(result.get('rent-1')?.confidence).toBe(1);
  });
});
