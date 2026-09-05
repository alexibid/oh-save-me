import { MOCK_ACCOUNTS, MOCK_ACCOUNT_BANK, MOCK_ACCOUNT_INVESTMENT, MOCK_ACCOUNT_MEAL } from './accounts.mock';
import { MOCK_TRANSACTIONS } from './transactions.mock';
import { MOCK_BUDGETS } from './budgets.mock';
import { Transaction } from '@domain/models/transaction';
import { Account } from '@domain/models/account';
import { Budget } from '@domain/models/budget';
import { isTransferCategory } from '@domain/shared/transfer.utils';

function computeMockMetrics() {
  const bankTxs = MOCK_TRANSACTIONS.filter(t => t.accountId === MOCK_ACCOUNT_BANK.id);
  const investTxs = MOCK_TRANSACTIONS.filter(t => t.accountId === MOCK_ACCOUNT_INVESTMENT.id);
  const mealTxs = MOCK_TRANSACTIONS.filter(t => t.accountId === MOCK_ACCOUNT_MEAL.id);

  const bankEnding = bankTxs[bankTxs.length - 1]?.balance ?? 0;
  const investEndingCash = investTxs[investTxs.length - 1]?.balance ?? 0;
  const mealEnding = mealTxs[mealTxs.length - 1]?.balance ?? 0;

  const investBuys = investTxs
    .filter(t => t.investmentType === 'buy')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const investTotalBalance = Math.round((investEndingCash + investBuys) * 100) / 100;
  const consolidated = Math.round((bankEnding + investTotalBalance) * 100) / 100;

  const nonTransferTxs = MOCK_TRANSACTIONS.filter(t => !isTransferCategory(t.category));
  const overallIncome = nonTransferTxs.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const overallExpenses = nonTransferTxs.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);

  const currentCycleTxs = MOCK_TRANSACTIONS.filter(t => t.date >= '2026-07-28' && t.date <= '2026-08-28');
  const currentNonTransfer = currentCycleTxs.filter(t => !isTransferCategory(t.category));
  const currentIncome = currentNonTransfer.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const currentExpenses = currentNonTransfer.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);

  const prevCycleTxs = MOCK_TRANSACTIONS.filter(t => t.date >= '2026-06-28' && t.date <= '2026-07-27');
  const prevNonTransfer = prevCycleTxs.filter(t => !isTransferCategory(t.category));
  const prevIncome = prevNonTransfer.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const prevExpenses = prevNonTransfer.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);

  return {
    totalConsolidatedBalance: consolidated,
    bankAccount: {
      id: MOCK_ACCOUNT_BANK.id,
      openingBalance: MOCK_ACCOUNT_BANK.openingBalance ?? 2000.00,
      endingBalance: bankEnding,
      transactionCount: bankTxs.length
    },
    investmentAccount: {
      id: MOCK_ACCOUNT_INVESTMENT.id,
      openingBalance: 0.00,
      cashBalance: investEndingCash,
      investedValue: investBuys,
      totalBalance: investTotalBalance,
      transactionCount: investTxs.length
    },
    mealAccount: {
      id: MOCK_ACCOUNT_MEAL.id,
      openingBalance: MOCK_ACCOUNT_MEAL.openingBalance ?? 150.00,
      endingBalance: mealEnding,
      transactionCount: mealTxs.length
    },
    currentCycle: {
      startDate: '2026-07-28',
      endDate: '2026-08-28',
      totalIncome: Math.round(currentIncome * 100) / 100,
      totalExpenses: Math.round(currentExpenses * 100) / 100
    },
    previousCycle: {
      startDate: '2026-06-28',
      endDate: '2026-07-27',
      totalIncome: Math.round(prevIncome * 100) / 100,
      totalExpenses: Math.round(prevExpenses * 100) / 100
    },
    overall: {
      totalIncome: Math.round(overallIncome * 100) / 100,
      totalExpenses: Math.round(overallExpenses * 100) / 100,
      netCashflow: Math.round((overallIncome + overallExpenses) * 100) / 100,
      totalTransfers: 0,
      totalTransactionsCount: MOCK_TRANSACTIONS.length
    }
  };
}

export const MOCK_METRICS = computeMockMetrics();

export function assertMockDataIntegrity(
  transactions: readonly Transaction[] = MOCK_TRANSACTIONS,
  accounts: readonly Account[] = MOCK_ACCOUNTS,
  _budgets: readonly Budget[] = MOCK_BUDGETS
): { readonly isValid: boolean; readonly errors: readonly string[] } {
  const errors: string[] = [];
  const validAccountIds = new Set(accounts.map(a => a.id));

  for (const tx of transactions) {
    if (tx.accountId && !validAccountIds.has(tx.accountId)) {
      errors.push(`Transaction ${tx.id} references non-existent account ${tx.accountId}`);
    }
  }

  const linkedTxs = transactions.filter(t => t.linkedTransactionId);
  const txMap = new Map(transactions.map(t => [t.id, t]));

  for (const tx of linkedTxs) {
    const counterpart = txMap.get(tx.linkedTransactionId!);
    if (!counterpart) {
      errors.push(`Transaction ${tx.id} has broken linkedTransactionId ${tx.linkedTransactionId}`);
    } else if (Math.round((tx.amount + counterpart.amount) * 100) / 100 !== 0) {
      errors.push(`Linked transactions ${tx.id} and ${counterpart.id} amounts do not net to zero: ${tx.amount} + ${counterpart.amount}`);
    }
  }

  const bankTxs = transactions
    .filter(t => t.accountId === MOCK_ACCOUNT_BANK.id && t.balance !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date));

  let prevBalance = MOCK_ACCOUNT_BANK.openingBalance ?? 0;
  for (const tx of bankTxs) {
    const expected = Math.round((prevBalance + tx.amount) * 100) / 100;
    if (Math.abs(tx.balance! - expected) > 0.01) {
      errors.push(`Bank transaction ${tx.id} balance continuity failed. Expected: ${expected}, Got: ${tx.balance}`);
    }
    prevBalance = tx.balance!;
  }

  const mealTxs = transactions
    .filter(t => t.accountId === MOCK_ACCOUNT_MEAL.id && t.balance !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date));

  let prevMealBalance = MOCK_ACCOUNT_MEAL.openingBalance ?? 0;
  for (const tx of mealTxs) {
    const expected = Math.round((prevMealBalance + tx.amount) * 100) / 100;
    if (Math.abs(tx.balance! - expected) > 0.01) {
      errors.push(`Meal transaction ${tx.id} balance continuity failed. Expected: ${expected}, Got: ${tx.balance}`);
    }
    prevMealBalance = tx.balance!;
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
