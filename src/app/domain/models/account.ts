export type AccountType = 'bank_account' | 'credit_card' | 'meal_card' | 'investment';
export type AccountScope = 'individual' | 'joint';

interface AccountBase {
  readonly id: string;
  readonly name: string;
  readonly updatedAt: number;
}

export interface FinancialAccount extends AccountBase {
  readonly kind: 'financial';
  readonly type: AccountType;
  readonly scope: AccountScope;
  readonly includeInConsolidatedBalance: boolean;
  readonly unit: string;
  readonly openingBalance?: number;
}

export interface CustomAccount extends AccountBase {
  readonly kind: 'custom';
  readonly purpose: string;
  readonly presetId?: string;
}

export type Account = FinancialAccount | CustomAccount;

export function isFinancialAccount(account: Account): account is FinancialAccount {
  return account.kind === 'financial';
}

export function isCustomAccount(account: Account): account is CustomAccount {
  return account.kind === 'custom';
}
