export type ColumnRole = 'skip' | 'date' | 'desc' | 'amount' | 'debit' | 'credit' | 'balance' | 'shares' | 'price' | 'fee' | 'tax' | 'symbol' | 'investmentType' | 'assetName' | 'assetType' | 'measure' | 'dimension';

export const MULTI_VALUE_ROLES: readonly ColumnRole[] = ['measure', 'dimension'];
