import type { RxJsonSchema } from 'rxdb';

export interface RxBudgetDocument {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly amount: number;
  readonly totalAmount?: number;
  readonly categoryId?: string;
  readonly tags?: readonly string[];
  readonly startDate?: string;
  readonly endDate?: string;
  readonly projectStartDate?: string;
  readonly projectEndDate?: string;
  readonly isClosed?: boolean;
  readonly monthlyAllocation?: number;
  readonly kind?: string;
  readonly paidInstalments?: number;
  readonly contractedInstalments?: number;
  readonly currentValue?: number;
  readonly outstandingDebt?: number;
  readonly appreciationPercent?: number;
  readonly transactionsAutoAssigned?: boolean;
  readonly updatedAt: number;
  readonly deleted?: boolean;
}

export const BUDGET_SCHEMA: RxJsonSchema<RxBudgetDocument> = {
  title: 'budget schema',
  description: 'describes a budget constraint or project budget',
  version: 7,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    type: { type: 'string' },
    amount: { type: 'number' },
    totalAmount: { type: 'number' },
    categoryId: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    startDate: { type: 'string' },
    endDate: { type: 'string' },
    projectStartDate: { type: 'string' },
    projectEndDate: { type: 'string' },
    isClosed: { type: 'boolean' },
    monthlyAllocation: { type: 'number' },
    kind: { type: 'string' },
    paidInstalments: { type: 'number' },
    contractedInstalments: { type: 'number' },
    currentValue: { type: 'number' },
    outstandingDebt: { type: 'number' },
    appreciationPercent: { type: 'number' },
    transactionsAutoAssigned: { type: 'boolean' },
    updatedAt: { type: 'number' },
    deleted: { type: 'boolean' }
  },
  required: ['id', 'name', 'type', 'amount', 'updatedAt']
};
