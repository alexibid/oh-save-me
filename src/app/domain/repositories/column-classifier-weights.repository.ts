import { ColumnClassifierWeights } from '@domain/models/column-classifier-model';

export interface ColumnClassifierWeightsRepository {
  get(): Promise<ColumnClassifierWeights | undefined>;
  save(weights: Readonly<ColumnClassifierWeights>): Promise<void>;
  clear(): Promise<void>;
}
