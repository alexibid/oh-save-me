import { Injectable, inject } from '@angular/core';
import { MlRule } from '@domain/models/ml-rule';
import { CategoryType } from '@domain/models/category';
import { MlRuleRepository } from '@domain/repositories/ml-rule.repository';
import { RxDbDatabaseService } from './rxdb-database.service';

@Injectable({
  providedIn: 'root'
})
export class RxdbMlRuleRepository implements MlRuleRepository {
  private readonly dbService = inject(RxDbDatabaseService);

  private async getCollection() {
    const db = await this.dbService.getDatabase();
    return db.collections.ml_rules;
  }

  async getAll(): Promise<readonly MlRule[]> {
    const col = await this.getCollection();
    const docs = await col.find({
      selector: {
        deleted: { $ne: true }
      }
    }).exec();

    return docs.map(doc => this.toDomain(doc.toJSON()));
  }

  async upsert(rule: Readonly<MlRule>): Promise<void> {
    const col = await this.getCollection();
    await col.upsert({
      ...rule,
      updatedAt: Date.now(),
      deleted: false
    });
  }

  async delete(key: string): Promise<void> {
    const col = await this.getCollection();
    const doc = await col.findOne(key).exec();
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

  private toDomain(json: Record<string, unknown>): MlRule {
    return {
      key: json['key'] as string,
      categoryWeights: json['categoryWeights'] as Readonly<Record<CategoryType, number>> | undefined,
      enabled: json['enabled'] as boolean,
      updatedAt: json['updatedAt'] as number
    };
  }
}
