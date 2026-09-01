export type InvestmentType =
  | 'buy' | 'sell' | 'dividend' | 'interest'
  | 'deposit' | 'withdrawal' | 'fee' | 'tax' | 'other';

export interface Transaction {
  readonly id: string;
  readonly date: string;
  readonly description: string;
  readonly amount: number;
  readonly category: string;
  readonly tags?: readonly string[];
  readonly notes?: string;
  readonly balance?: number;
  readonly account?: string;
  readonly accountId?: string;
  readonly importBatchId?: string;
  readonly transferAccountId?: string;
  readonly linkedTransactionId?: string;
  readonly budgetId?: string;
  readonly budgetAutoAssigned?: boolean;
  readonly pendingReview?: boolean;
  readonly isRecurring?: boolean;
  readonly countsAsIncome?: boolean;
  readonly isDuplicate?: boolean;
  readonly shares?: number;
  readonly price?: number;
  readonly fee?: number;
  readonly tax?: number;
  readonly symbol?: string;
  readonly assetName?: string;
  readonly assetType?: string;
  readonly investmentType?: InvestmentType;
}
