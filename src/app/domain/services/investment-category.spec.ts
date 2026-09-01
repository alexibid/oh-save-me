import { categorizeInvestmentTransaction } from './investment-category';
import { InvestmentType } from '@domain/models/transaction';

describe('categorizeInvestmentTransaction', () => {
  const cases: [InvestmentType, string][] = [
    ['buy', 'Investments'],
    ['sell', 'AssetSale'],
    ['dividend', 'Dividends'],
    ['interest', 'Interest'],
    ['deposit', 'Transfers'],
    ['withdrawal', 'Transfers'],
    ['fee', 'Fees'],
    ['tax', 'Taxes']
  ];

  cases.forEach(([investmentType, expectedCategory]) => {
    it(`maps '${investmentType}' to '${expectedCategory}'`, () => {
      expect(categorizeInvestmentTransaction(investmentType)).toBe(expectedCategory);
    });
  });

  it("returns undefined for 'other' (no confident opinion, falls through to text-based prediction)", () => {
    expect(categorizeInvestmentTransaction('other')).toBeUndefined();
  });

  it('returns undefined when there is no investmentType at all', () => {
    expect(categorizeInvestmentTransaction(undefined)).toBeUndefined();
  });
});
