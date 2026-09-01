import { DetectedMapping } from './column-mapping';
import { QualityStats } from './column-quality-stats';

export interface MappingRule {
  readonly signatureKey: string;
  readonly mapping: DetectedMapping;
  readonly updatedAt: number;
  readonly qualityBaseline?: QualityStats;
}
