import { isEssentialCategory, monthlyAverages, splitEssentialSpending } from './essential-spending.utils';
import { Transaction } from '@domain/models/transaction';

const spend = (id: string, amount: number, category: string, date = '2026-08-05'): Transaction => ({
  id,
  date,
  description: id,
  amount,
  category,
  accountId: 'acc-1'
});

describe('essential spending', () => {
  it('treats a roof, food and transport as essential, and leisure as lifestyle', () => {
    expect(isEssentialCategory('Housing')).toBe(true);
    expect(isEssentialCategory('Groceries')).toBe(true);
    expect(isEssentialCategory('Entertainment')).toBe(false);
    expect(isEssentialCategory('Restaurants')).toBe(false);
  });

  it('splits a period into what the owner must pay and what they chose to', () => {
    const split = splitEssentialSpending([
      spend('rent', -700, 'Housing'),
      spend('food', -200, 'Groceries'),
      spend('cinema', -30, 'Entertainment'),
      spend('dinner', -70, 'Restaurants')
    ]);

    expect(split.essential).toBe(900);
    expect(split.lifestyle).toBe(100);
  });

  it('leaves income and transfers out of both sides', () => {
    const split = splitEssentialSpending([
      spend('salary', 2000, 'Income'),
      spend('move', -500, 'Transfers'),
      spend('rent', -700, 'Housing')
    ]);

    expect(split.essential).toBe(700);
    expect(split.lifestyle).toBe(0);
  });

  it('averages the essentials over the most recent complete months only', () => {
    const transactions = [
      spend('old', -2000, 'Housing', '2025-01-05'),
      spend('m1', -500, 'Housing', '2026-06-05'),
      spend('m2', -700, 'Housing', '2026-07-05'),
      spend('m3', -600, 'Housing', '2026-08-05')
    ];

    expect(monthlyAverages(transactions, 3, '').essentials).toBe(600);
  });

  it('leaves the running month out, so a half-finished month cannot drag the averages down', () => {
    const transactions = [
      spend('salary-jun', 3000, 'Income', '2026-06-01'),
      spend('rent-jun', -600, 'Housing', '2026-06-05'),
      spend('salary-jul', 3000, 'Income', '2026-07-01'),
      spend('rent-jul', -600, 'Housing', '2026-07-05'),
      spend('partial-aug', 200, 'Income', '2026-08-02')
    ];

    const averages = monthlyAverages(transactions, 6, '2026-08');

    expect(averages.income).toBe(3000);
    expect(averages.essentials).toBe(600);
    expect(averages.surplus).toBe(2400);
    expect(averages.monthsCounted).toBe(2);
  });

  it('reports nothing to average when there is no history to look at', () => {
    const averages = monthlyAverages([], 3, '');

    expect(averages.essentials).toBe(0);
    expect(averages.income).toBe(0);
    expect(averages.monthsCounted).toBe(0);
  });
});
