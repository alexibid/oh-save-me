export type BudgetType = 'category' | 'project' | 'investment';

export type ProjectKind = 'vacation' | 'works' | 'equipment';

export type WalletKind =
  | 'retirement'
  | 'savings_account'
  | 'savings_certificate'
  | 'stocks'
  | 'house'
  | 'car'
  | 'other';

export const WALLET_KINDS: readonly WalletKind[] = [
  'retirement',
  'savings_account',
  'savings_certificate',
  'stocks',
  'house',
  'car',
  'other'
];

export interface Budget {
  readonly id: string;
  readonly name: string;
  readonly type: BudgetType;
  readonly amount: number;
  readonly scope?: 'individual' | 'joint';
  readonly totalAmount?: number;
  readonly categoryId?: string;
  readonly tags?: readonly string[];
  readonly startDate?: string;
  readonly endDate?: string;
  readonly projectStartDate?: string;
  readonly projectEndDate?: string;
  readonly isClosed?: boolean;
  readonly monthlyAllocation?: number;
  readonly kind?: ProjectKind | WalletKind;
  readonly paidInstalments?: number;
  readonly contractedInstalments?: number;
  readonly currentValue?: number;
  readonly outstandingDebt?: number;
  readonly appreciationPercent?: number;
  readonly transactionsAutoAssigned?: boolean;
  readonly targetAmount?: number;
  readonly targetDate?: string;
  readonly targetProfitPct?: number;
  readonly targetPrice?: number;
}

export const LOAN_BACKED_KINDS: readonly WalletKind[] = ['house', 'car'];

export function isLoanBackedKind(kind: Budget['kind']): boolean {
  return !!kind && (LOAN_BACKED_KINDS as readonly string[]).includes(kind);
}

export function remainingInstalments(budget: Pick<Budget, 'paidInstalments' | 'contractedInstalments'>): number {
  const contracted = budget.contractedInstalments ?? 0;
  const paid = budget.paidInstalments ?? 0;
  return Math.max(0, contracted - paid);
}

export function walletPaidAmount(budget: Budget): number {
  if (!isLoanBackedKind(budget.kind)) return budget.amount;
  return round(Math.max(0, budget.amount - (budget.outstandingDebt ?? 0)));
}

export function walletValue(budget: Budget): number {
  if (isLoanBackedKind(budget.kind)) return walletPaidAmount(budget);
  return budget.currentValue ?? budget.amount;
}

export function walletValuationGain(budget: Budget): number {
  if (isLoanBackedKind(budget.kind) || budget.currentValue === undefined) return 0;
  return round(budget.currentValue - budget.amount);
}

export function walletAppreciatedEstimate(budget: Budget): number | undefined {
  if (!isLoanBackedKind(budget.kind) || budget.appreciationPercent === undefined) return undefined;
  return round(walletPaidAmount(budget) * (1 + budget.appreciationPercent / 100));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
