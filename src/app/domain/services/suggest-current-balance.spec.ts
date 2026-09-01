import { suggestCurrentBalance } from './suggest-current-balance';

describe('suggestCurrentBalance', () => {
  it('picks the balance reading from the most recent date', () => {
    const rows = [
      ['23-07-2026', '1234,56'],
      ['24-07-2026', '1300,00'],
      ['22-07-2026', '1000,00']
    ];

    expect(suggestCurrentBalance(rows, 0, 1)).toBe(1300);
  });

  it('takes the highest reading among several rows sharing the most recent date', () => {
    const rows = [
      ['24-07-2026', '2449,15'],
      ['24-07-2026', '2222,77'],
      ['23-07-2026', '2190,92']
    ];

    expect(suggestCurrentBalance(rows, 0, 1)).toBe(2449.15);
  });

  it('ignores rows with an unparseable date', () => {
    const rows = [
      ['not-a-date', '9999,99'],
      ['23-07-2026', '1234,56']
    ];

    expect(suggestCurrentBalance(rows, 0, 1)).toBe(1234.56);
  });

  it('ignores rows with an empty balance value', () => {
    const rows = [
      ['24-07-2026', ''],
      ['23-07-2026', '1234,56']
    ];

    expect(suggestCurrentBalance(rows, 0, 1)).toBe(1234.56);
  });

  it('returns undefined when no row has both a valid date and balance', () => {
    const rows = [['not-a-date', '']];

    expect(suggestCurrentBalance(rows, 0, 1)).toBeUndefined();
  });

  it('returns undefined for an empty file', () => {
    expect(suggestCurrentBalance([], 0, 1)).toBeUndefined();
  });
});
