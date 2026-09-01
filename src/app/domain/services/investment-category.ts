import { InvestmentType } from '@domain/models/transaction';
import { CategoryType } from '@domain/models/category';

const INVESTMENT_TYPE_CATEGORY: Partial<Record<InvestmentType, CategoryType>> = {
  buy: 'Investments',
  sell: 'AssetSale',
  dividend: 'Dividends',
  interest: 'Interest',
  deposit: 'Transfers',
  withdrawal: 'Transfers',
  fee: 'Fees',
  tax: 'Taxes'
};

export function categorizeInvestmentTransaction(investmentType: InvestmentType | undefined): CategoryType | undefined {
  if (!investmentType) return undefined;
  return INVESTMENT_TYPE_CATEGORY[investmentType];
}
