import type { RxJsonSchema } from 'rxdb';
import { InvestmentType } from '@domain/models/transaction';

export interface RxTransactionDocument {
  readonly id: string;
  readonly date: string;
  readonly description: string;
  readonly amount: number;
  readonly category: string;
  readonly tags?: readonly string[];
  readonly notes?: string;
  readonly balance?: number;
  readonly account?: string;
  readonly accountId: string;
  readonly importBatchId: string;
  readonly transferAccountId?: string;
  readonly linkedTransactionId?: string;
  readonly budgetId?: string;
  readonly budgetAutoAssigned?: boolean;
  readonly pendingReview?: boolean;
  readonly updatedAt: number;
  readonly deleted?: boolean;
  readonly shares?: number;
  readonly price?: number;
  readonly fee?: number;
  readonly tax?: number;
  readonly symbol?: string;
  readonly assetName?: string;
  readonly assetType?: string;
  readonly investmentType?: InvestmentType;
  readonly isRecurring?: boolean;
  readonly countsAsIncome?: boolean;
  readonly isDuplicate?: boolean;
}

export const TRANSACTION_SCHEMA: RxJsonSchema<RxTransactionDocument> = {
  title: 'transaction schema',
  description: 'describes a transaction',
  version: 10,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    date: { type: 'string' },
    description: { type: 'string' },
    amount: { type: 'number' },
    category: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
    balance: { type: 'number' },
    account: { type: 'string' },
    accountId: { type: 'string' },
    importBatchId: { type: 'string' },
    transferAccountId: { type: 'string' },
    linkedTransactionId: { type: 'string' },
    budgetId: { type: 'string' },
    budgetAutoAssigned: { type: 'boolean' },
    pendingReview: { type: 'boolean' },
    isRecurring: { type: 'boolean' },
    countsAsIncome: { type: 'boolean' },
    isDuplicate: { type: 'boolean' },
    updatedAt: { type: 'number' },
    deleted: { type: 'boolean' },
    shares: { type: 'number' },
    price: { type: 'number' },
    fee: { type: 'number' },
    tax: { type: 'number' },
    symbol: { type: 'string' },
    assetName: { type: 'string' },
    assetType: { type: 'string' },
    investmentType: { type: 'string' }
  },
  required: ['id', 'date', 'description', 'amount', 'category', 'accountId', 'importBatchId', 'updatedAt']
};
