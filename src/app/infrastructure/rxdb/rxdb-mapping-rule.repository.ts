import { Injectable } from '@angular/core';
import { MappingRule } from '@domain/models/mapping-rule';
import { DetectedMapping } from '@domain/models/column-mapping';
import { QualityStats } from '@domain/models/column-quality-stats';
import { MappingRuleRepository } from '@domain/repositories/mapping-rule.repository';
import { RxDbDatabaseService } from './rxdb-database.service';

@Injectable({
  providedIn: 'root'
})
export class RxdbMappingRuleRepository implements MappingRuleRepository {
  constructor(private dbService: RxDbDatabaseService) { }

  private async getCollection() {
    const db = await this.dbService.getDatabase();
    return db.collections.mapping_rules;
  }

  async getAll(): Promise<readonly MappingRule[]> {
    const col = await this.getCollection();
    const docs = await col.find({
      selector: {
        deleted: { $ne: true }
      }
    }).exec();

    return docs.map(doc => this.toDomain(doc.toJSON()));
  }

  async upsert(rule: Readonly<MappingRule>): Promise<void> {
    const col = await this.getCollection();
    await col.upsert({
      ...rule,
      updatedAt: Date.now(),
      deleted: false
    });
  }

  async delete(signatureKey: string): Promise<void> {
    const col = await this.getCollection();
    const doc = await col.findOne(signatureKey).exec();
    if (doc) {
      const json = doc.toJSON();
      await col.upsert({
        ...json,
        updatedAt: Date.now(),
        deleted: true
      });
    }
  }

  async clear(): Promise<void> {
    const col = await this.getCollection();
    const docs = await col.find().exec();
    const now = Date.now();
    await Promise.all(
      docs.map(doc => {
        const json = doc.toJSON();
        return col.upsert({
          ...json,
          updatedAt: now,
          deleted: true
        });
      })
    );
  }

  private toDomain(json: Record<string, unknown>): MappingRule {
    return {
      signatureKey: json['signatureKey'] as string,
      mapping: json['mapping'] as DetectedMapping,
      updatedAt: json['updatedAt'] as number,
      qualityBaseline: json['qualityBaseline'] as QualityStats | undefined
    };
  }
}
