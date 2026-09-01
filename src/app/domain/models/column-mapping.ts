export type DetectableField =
  | 'date' | 'desc' | 'amount' | 'debit' | 'credit' | 'balance' | 'availableBalance'
  | 'shares' | 'price' | 'fee' | 'tax' | 'symbol' | 'investmentType'
  | 'assetName' | 'assetType';

export interface FieldDetection {
  columnIndex: number;
  confidence: number;
}

export type DetectedMapping = Partial<Record<DetectableField, FieldDetection>>;
