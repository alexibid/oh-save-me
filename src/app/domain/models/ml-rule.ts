import { CategoryType } from './category';

export interface MlRule {
  readonly key: string;
  readonly categoryWeights?: Readonly<Record<CategoryType, number>>;
  readonly enabled: boolean;
  readonly updatedAt: number;
}
