import { Transaction } from '@domain/models/transaction';
import { MOCK_ACCOUNT_BANK, MOCK_ACCOUNT_INVESTMENT, MOCK_ACCOUNT_MEAL } from './accounts.mock';

function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

interface RawTx {
  readonly id: string;
  readonly date: string;
  readonly description: string;
  readonly amount: number;
  readonly category: string;
  readonly accountId: string;
  readonly tags?: readonly string[];
  readonly linkedTransactionId?: string;
  readonly transferAccountId?: string;
  readonly investmentType?: import('@domain/models/transaction').InvestmentType;
  readonly assetType?: string;
  readonly symbol?: string;
  readonly pendingReview?: boolean;
}

function generateThreeYearsTransactions(): Transaction[] {
  const rawList: RawTx[] = [];

  const startYear = 2024;
  const endYear = 2026;
  const endMonth = 8;

  for (let year = startYear; year <= endYear; year++) {
    const maxM = year === endYear ? endMonth : 12;
    for (let month = 1; month <= maxM; month++) {
      const monthStr = `${year}-${padZero(month)}`;
      const prefix = `tx-${year}-${padZero(month)}`;

      rawList.push({
        id: `${prefix}-bank-salary`,
        date: `${monthStr}-01`,
        description: `Monthly Salary ${padZero(month)}/${year}`,
        amount: 2500.00,
        category: 'Income',
        accountId: MOCK_ACCOUNT_BANK.id
      });

      rawList.push({
        id: `${prefix}-meal-allowance`,
        date: `${monthStr}-01`,
        description: `Meal Allowance ${padZero(month)}/${year}`,
        amount: 180.00,
        category: 'Income',
        accountId: MOCK_ACCOUNT_MEAL.id
      });

      rawList.push({
        id: `${prefix}-bank-water`,
        date: `${monthStr}-02`,
        description: 'Water Services',
        amount: -31.85,
        category: 'Utilities',
        accountId: MOCK_ACCOUNT_BANK.id
      });

      rawList.push({
        id: `${prefix}-bank-elec`,
        date: `${monthStr}-03`,
        description: 'Eletricidade EDP',
        amount: -65.00,
        category: 'Utilities',
        accountId: MOCK_ACCOUNT_BANK.id
      });

      rawList.push({
        id: `${prefix}-bank-net`,
        date: `${monthStr}-04`,
        description: 'Telecoms & Internet',
        amount: -45.00,
        category: 'Utilities',
        accountId: MOCK_ACCOUNT_BANK.id
      });

      rawList.push({
        id: `${prefix}-bank-groc-1`,
        date: `${monthStr}-05`,
        description: 'Supermercado Continente',
        amount: -145.20,
        category: 'Groceries',
        accountId: MOCK_ACCOUNT_BANK.id
      });

      rawList.push({
        id: `${prefix}-meal-exp-1`,
        date: `${monthStr}-06`,
        description: 'Work Restaurant Lunch',
        amount: -12.50,
        category: 'Restaurants',
        accountId: MOCK_ACCOUNT_MEAL.id
      });

      rawList.push({
        id: `${prefix}-bank-transp`,
        date: `${monthStr}-08`,
        description: 'Passe Mensal Metro',
        amount: -40.00,
        category: 'Transportation',
        accountId: MOCK_ACCOUNT_BANK.id
      });

      rawList.push({
        id: `${prefix}-bank-groc-2`,
        date: `${monthStr}-10`,
        description: 'Supermercado Pingo Doce',
        amount: -82.15,
        category: 'Groceries',
        accountId: MOCK_ACCOUNT_BANK.id
      });

      if (month === 3 || month === 7) {
        rawList.push({
          id: `${prefix}-bank-obras-buy`,
          date: `${monthStr}-11`,
          description: 'Compra de Material Obras',
          amount: -150.00,
          category: 'Others',
          tags: ['obras'],
          accountId: MOCK_ACCOUNT_BANK.id
        });

        rawList.push({
          id: `${prefix}-bank-obras-refund`,
          date: `${monthStr}-16`,
          description: 'Building Material Refund',
          amount: 50.00,
          category: 'Others',
          tags: ['obras'],
          accountId: MOCK_ACCOUNT_BANK.id
        });
      }

      rawList.push({
        id: `${prefix}-bank-health`,
        date: `${monthStr}-12`,
        description: 'Pharmacy & Health',
        amount: -25.00,
        category: 'Healthcare',
        accountId: MOCK_ACCOUNT_BANK.id
      });

      rawList.push({
        id: `${prefix}-meal-exp-2`,
        date: `${monthStr}-13`,
        description: 'Canteen Lunch',
        amount: -14.00,
        category: 'Restaurants',
        accountId: MOCK_ACCOUNT_MEAL.id
      });

      rawList.push({
        id: `${prefix}-bank-rest-1`,
        date: `${monthStr}-14`,
        description: 'Traditional Restaurant',
        amount: -38.50,
        category: 'Restaurants',
        accountId: MOCK_ACCOUNT_BANK.id
      });

      rawList.push({
        id: `${prefix}-bank-cinema`,
        date: `${monthStr}-15`,
        description: 'Cinema NOS',
        amount: -15.50,
        category: 'Entertainment',
        accountId: MOCK_ACCOUNT_BANK.id
      });

      rawList.push({
        id: `${prefix}-bank-cloud`,
        date: `${monthStr}-18`,
        description: 'Apple Cloud Subscription',
        amount: -0.99,
        category: 'Technology',
        accountId: MOCK_ACCOUNT_BANK.id
      });

      rawList.push({
        id: `${prefix}-bank-groc-3`,
        date: `${monthStr}-20`,
        description: 'Supermercado Mercadona',
        amount: -75.30,
        category: 'Groceries',
        accountId: MOCK_ACCOUNT_BANK.id
      });

      if (year === 2026 && month === 8) {
        rawList.push({
          id: `${prefix}-bank-pending-1`,
          date: `${monthStr}-20`,
          description: 'Loja Local Desconhecida',
          amount: -18.50,
          category: 'Others',
          pendingReview: true,
          accountId: MOCK_ACCOUNT_BANK.id
        });
      }

      rawList.push({
        id: `${prefix}-bank-rest-2`,
        date: `${monthStr}-22`,
        description: 'Coffee & Terrace',
        amount: -24.00,
        category: 'Restaurants',
        accountId: MOCK_ACCOUNT_BANK.id
      });

      if (year === 2026 && month === 8) {
        rawList.push({
          id: `${prefix}-bank-pending-2`,
          date: `${monthStr}-22`,
          description: 'Papelaria Bairro',
          amount: -32.00,
          category: 'Others',
          pendingReview: true,
          accountId: MOCK_ACCOUNT_BANK.id
        });
      }

      if (month === 7) {
        rawList.push({
          id: `${prefix}-bank-vacation`,
          date: `${monthStr}-23`,
          description: 'Holiday Accommodation Booking',
          amount: -300.00,
          category: 'Travel',
          tags: ['viagem', 'ferias'],
          accountId: MOCK_ACCOUNT_BANK.id
        });
      }

      rawList.push({
        id: `${prefix}-bank-atm`,
        date: `${monthStr}-25`,
        description: 'Levantamento Multibanco',
        amount: -60.00,
        category: 'Others',
        accountId: MOCK_ACCOUNT_BANK.id
      });

      const trfBankId = `${prefix}-bank-trf`;
      const trfInvestId = `${prefix}-invest-dep`;
      rawList.push({
        id: trfBankId,
        date: `${monthStr}-28`,
        description: 'Transfer To Investments',
        amount: -500.00,
        category: 'Transfers',
        accountId: MOCK_ACCOUNT_BANK.id,
        linkedTransactionId: trfInvestId,
        transferAccountId: MOCK_ACCOUNT_INVESTMENT.id
      });

      rawList.push({
        id: trfInvestId,
        date: `${monthStr}-28`,
        description: 'Funds Deposit',
        amount: 500.00,
        category: 'Transfers',
        accountId: MOCK_ACCOUNT_INVESTMENT.id,
        linkedTransactionId: trfBankId,
        transferAccountId: MOCK_ACCOUNT_BANK.id
      });

      rawList.push({
        id: `${prefix}-invest-etf`,
        date: `${monthStr}-29`,
        description: 'Compra ETF Global Core MSCI World',
        amount: -100.03,
        category: 'Investments',
        investmentType: 'buy',
        assetType: 'ETF',
        symbol: 'IWDA',
        accountId: MOCK_ACCOUNT_INVESTMENT.id
      });

      rawList.push({
        id: `${prefix}-invest-stock`,
        date: `${monthStr}-29`,
        description: 'Buy Apple Inc Shares',
        amount: -386.28,
        category: 'Investments',
        investmentType: 'buy',
        assetType: 'STOCK',
        symbol: 'AAPL',
        accountId: MOCK_ACCOUNT_INVESTMENT.id
      });

      if (month % 3 === 0 || month === 7) {
        rawList.push({
          id: `${prefix}-invest-div`,
          date: `${monthStr}-30`,
          description: 'Pagamento de Dividendos',
          amount: 15.20,
          category: 'Dividends',
          investmentType: 'dividend',
          accountId: MOCK_ACCOUNT_INVESTMENT.id
        });
      }

      const interestDay = (month === 2) ? 28 : (month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31);
      rawList.push({
        id: `${prefix}-invest-interest`,
        date: `${monthStr}-${padZero(interestDay)}`,
        description: 'Rendimento de Juros',
        amount: 0.50,
        category: 'Interest',
        investmentType: 'interest',
        accountId: MOCK_ACCOUNT_INVESTMENT.id
      });
    }
  }

  rawList.sort((a, b) => a.date.localeCompare(b.date));

  const runningBalances = new Map<string, number>([
    [MOCK_ACCOUNT_BANK.id, MOCK_ACCOUNT_BANK.openingBalance ?? 2000.00],
    [MOCK_ACCOUNT_INVESTMENT.id, MOCK_ACCOUNT_INVESTMENT.openingBalance ?? 0.00],
    [MOCK_ACCOUNT_MEAL.id, MOCK_ACCOUNT_MEAL.openingBalance ?? 150.00]
  ]);

  const transactions: Transaction[] = [];

  for (const raw of rawList) {
    const current = runningBalances.get(raw.accountId) ?? 0;
    const newBal = Math.round((current + raw.amount) * 100) / 100;
    runningBalances.set(raw.accountId, newBal);

    transactions.push({
      ...raw,
      balance: newBal
    });
  }

  return transactions;
}

export const MOCK_TRANSACTIONS: readonly Transaction[] = generateThreeYearsTransactions();

export const MOCK_TX_SALARY = MOCK_TRANSACTIONS.find(t => t.id === 'tx-2026-08-bank-salary') || MOCK_TRANSACTIONS[0];
export const MOCK_TX_SALARY_JULY = MOCK_TRANSACTIONS.find(t => t.id === 'tx-2026-07-bank-salary') || MOCK_TRANSACTIONS[0];
export const MOCK_TX_SALARY_AUGUST = MOCK_TX_SALARY;
export const MOCK_TX_WATER_JULY = MOCK_TRANSACTIONS.find(t => t.id === 'tx-2026-07-bank-water') || MOCK_TRANSACTIONS[1];
export const MOCK_TX_ELECTRICITY_JULY = MOCK_TRANSACTIONS.find(t => t.id === 'tx-2026-07-bank-elec') || MOCK_TRANSACTIONS[2];
export const MOCK_TX_INTERNET_JULY = MOCK_TRANSACTIONS.find(t => t.id === 'tx-2026-07-bank-net') || MOCK_TRANSACTIONS[3];
export const MOCK_TX_GROCERIES_JULY_1 = MOCK_TRANSACTIONS.find(t => t.id === 'tx-2026-07-bank-groc-1') || MOCK_TRANSACTIONS[4];
export const MOCK_TX_GROCERIES_1 = MOCK_TX_GROCERIES_JULY_1;
export const MOCK_TX_GROCERIES_AUG_1 = MOCK_TRANSACTIONS.find(t => t.id === 'tx-2026-08-bank-groc-1') || MOCK_TRANSACTIONS[4];
export const MOCK_TX_TRANSFER_OUT = MOCK_TRANSACTIONS.find(t => t.id === 'tx-2026-08-bank-trf') || MOCK_TRANSACTIONS[0];
export const MOCK_TX_TRANSFER_IN = MOCK_TRANSACTIONS.find(t => t.id === 'tx-2026-08-invest-dep') || MOCK_TRANSACTIONS[0];
export const MOCK_TX_BUY_ETF = MOCK_TRANSACTIONS.find(t => t.id === 'tx-2026-08-invest-etf') || MOCK_TRANSACTIONS[0];
export const MOCK_TX_BUY_STOCK = MOCK_TRANSACTIONS.find(t => t.id === 'tx-2026-08-invest-stock') || MOCK_TRANSACTIONS[0];
export const MOCK_TX_DIVIDEND = MOCK_TRANSACTIONS.find(t => t.id === 'tx-2026-07-invest-div') || MOCK_TRANSACTIONS[0];
export const MOCK_TX_INTEREST = MOCK_TRANSACTIONS.find(t => t.id === 'tx-2026-08-invest-interest') || MOCK_TRANSACTIONS[0];

export const MOCK_SCENARIO_LINK_SAME_DAY: readonly Transaction[] = [
  { ...MOCK_TX_TRANSFER_IN, id: 'tx_link_a', linkedTransactionId: undefined, transferAccountId: undefined },
  { ...MOCK_TX_TRANSFER_OUT, id: 'tx_link_b', linkedTransactionId: undefined, transferAccountId: undefined }
];

export const MOCK_SCENARIO_LINK_OLD: readonly Transaction[] = [
  { id: 'tx_old_a', date: '2026-01-05', description: 'Outgoing transfer', amount: -500, category: 'Others', accountId: MOCK_ACCOUNT_BANK.id },
  { id: 'tx_old_b', date: '2026-01-06', description: 'Incoming transfer', amount: 500, category: 'Others', accountId: MOCK_ACCOUNT_INVESTMENT.id }
];

export const MOCK_SCENARIO_LINK_NONE: readonly Transaction[] = [
  { id: 'tx_none_a', date: '2026-02-27', description: 'Supermercado', amount: -20, category: 'Groceries', accountId: MOCK_ACCOUNT_BANK.id }
];

export const MOCK_SCENARIO_LINK_ALREADY_LINKED: readonly Transaction[] = [
  MOCK_TX_TRANSFER_OUT,
  MOCK_TX_TRANSFER_IN
];

export const MOCK_SCENARIO_LINK_HALF_HEALED: readonly Transaction[] = [
  {
    id: 'tx_half_bank', date: '2026-05-19', description: 'Bank transfer', amount: 7660, category: 'Transfers',
    accountId: MOCK_ACCOUNT_BANK.id, linkedTransactionId: 'tx_half_invest', transferAccountId: MOCK_ACCOUNT_INVESTMENT.id
  },
  {
    id: 'tx_half_invest', date: '2026-05-19', description: 'Transfer sent', amount: -7660, category: 'Transfers',
    accountId: MOCK_ACCOUNT_INVESTMENT.id
  },
  { id: 'tx_half_other', date: '2026-05-20', description: 'Standalone movement', amount: 7660, category: 'Others', accountId: MOCK_ACCOUNT_BANK.id }
];

export const MOCK_SCENARIO_UNLINK_NORMAL: readonly Transaction[] = [
  MOCK_TX_TRANSFER_OUT,
  MOCK_TX_TRANSFER_IN
];

export const MOCK_SCENARIO_UNLINK_NOT_TRANSFER: readonly Transaction[] = [
  { id: 'tx_not_trf', date: '2026-02-05', description: 'Supermercado', amount: -20, category: 'Groceries', accountId: MOCK_ACCOUNT_BANK.id }
];

export const MOCK_SCENARIO_UNLINK_MISSING_LINK: readonly Transaction[] = [
  { id: 'tx_missing_link', date: '2026-02-05', description: 'Transfer', amount: -50, category: 'Transfers', accountId: MOCK_ACCOUNT_BANK.id, linkedTransactionId: 'tx_non_existent', transferAccountId: MOCK_ACCOUNT_INVESTMENT.id }
];

export const MOCK_SCENARIO_GRAY_ZONE_RECURRING: readonly Transaction[] = [
  { id: 'tx_gray_zone_1', date: '2026-07-28', description: 'Quota Ginasio', amount: -45.5, category: 'Utilities', accountId: MOCK_ACCOUNT_BANK.id },
  { id: 'tx_gray_zone_2', date: '2026-08-05', description: 'Quota Ginasio', amount: -45.5, category: 'Utilities', accountId: MOCK_ACCOUNT_BANK.id }
];

export const MOCK_SCENARIO_TRADE_REPUBLIC_POSITIONS: readonly Transaction[] = [
  {
    id: 'tr-pos-iwda-buy',
    date: '2026-07-01',
    description: 'Compra ETF Global Core MSCI World',
    amount: -246.00,
    category: 'Investments',
    investmentType: 'buy',
    assetType: 'ETF',
    assetName: 'Global Core MSCI World',
    symbol: 'IWDA',
    shares: 2.5,
    price: 98.40,
    fee: 1,
    accountId: MOCK_ACCOUNT_INVESTMENT.id
  },
  {
    id: 'tr-pos-aapl-buy',
    date: '2026-07-03',
    description: 'Buy Apple Inc Shares',
    amount: -193.14,
    category: 'Investments',
    investmentType: 'buy',
    assetType: 'STOCK',
    assetName: 'Apple Inc',
    symbol: 'AAPL',
    shares: 1,
    price: 193.14,
    fee: 1,
    accountId: MOCK_ACCOUNT_INVESTMENT.id
  },
  {
    id: 'tr-pos-aapl-sell',
    date: '2026-07-10',
    description: 'Sell Apple Inc Shares',
    amount: 201.50,
    category: 'AssetSale',
    investmentType: 'sell',
    assetType: 'STOCK',
    assetName: 'Apple Inc',
    symbol: 'AAPL',
    shares: 1,
    price: 201.50,
    fee: 1,
    tax: 2.30,
    accountId: MOCK_ACCOUNT_INVESTMENT.id
  },
  {
    id: 'tr-pos-iwda-dividend',
    date: '2026-07-15',
    description: 'Pagamento de Dividendos',
    amount: 15.20,
    category: 'Dividends',
    investmentType: 'dividend',
    assetName: 'Global Core MSCI World',
    symbol: 'IWDA',
    tax: 2.28,
    accountId: MOCK_ACCOUNT_INVESTMENT.id
  }
];

export const MOCK_SCENARIO_MONTHLY_INVESTMENTS: readonly Transaction[] = [
  {
    id: 'tr-flow-may', date: '2026-05-05', description: 'Compra ETF Global Core MSCI World',
    amount: -150, category: 'Investments', investmentType: 'buy',
    assetName: 'Global Core MSCI World', symbol: 'IWDA', shares: 1.5,
    accountId: MOCK_ACCOUNT_INVESTMENT.id
  },
  {
    id: 'tr-flow-jun', date: '2026-06-05', description: 'Compra ETF Global Core MSCI World',
    amount: -200, category: 'Investments', investmentType: 'buy',
    assetName: 'Global Core MSCI World', symbol: 'IWDA', shares: 2,
    accountId: MOCK_ACCOUNT_INVESTMENT.id
  },
  {
    id: 'tr-flow-jul', date: '2026-07-05', description: 'Compra ETF Global Core MSCI World',
    amount: -250, category: 'Investments', investmentType: 'buy',
    assetName: 'Global Core MSCI World', symbol: 'IWDA', shares: 2.5,
    accountId: MOCK_ACCOUNT_INVESTMENT.id
  }
];
