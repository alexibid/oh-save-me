import { Injectable, inject } from '@angular/core';
import { DetectedMapping } from '@domain/models/column-mapping';
import { buildSignatureKey, computeQualityStats } from '@domain/services/column-detection-engine';
import { MAPPING_RULE_REPOSITORY_TOKEN } from '@application/tokens';

@Injectable({
  providedIn: 'root'
})
export class PersistMappingCorrectionUseCase {
  private readonly mappingRuleRepository = inject(MAPPING_RULE_REPOSITORY_TOKEN, { optional: true });

  async execute(
    headers: readonly string[],
    mapping: DetectedMapping,
    sampleRows?: readonly string[][]
  ): Promise<void> {
    if (!this.mappingRuleRepository) return;

    const signatureKey = buildSignatureKey(headers);
    await this.mappingRuleRepository.upsert({
      signatureKey,
      mapping,
      updatedAt: Date.now(),
      ...(sampleRows ? { qualityBaseline: computeQualityStats(mapping, sampleRows) } : {})
    });
  }
}
