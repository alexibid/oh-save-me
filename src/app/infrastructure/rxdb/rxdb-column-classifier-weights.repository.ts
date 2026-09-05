import { Injectable, inject } from '@angular/core';
import { ColumnClassifierWeights } from '@domain/models/column-classifier-model';
import { ColumnClassifierWeightsRepository } from '@domain/repositories/column-classifier-weights.repository';
import { RxDbDatabaseService } from './rxdb-database.service';

const SINGLETON_ID = 'default';

@Injectable({
  providedIn: 'root'
})
export class RxdbColumnClassifierWeightsRepository implements ColumnClassifierWeightsRepository {
  private readonly dbService = inject(RxDbDatabaseService);

  private async getCollection() {
    const db = await this.dbService.getDatabase();
    return db.collections.column_classifier_weights;
  }

  async get(): Promise<ColumnClassifierWeights | undefined> {
    const col = await this.getCollection();
    const doc = await col.findOne(SINGLETON_ID).exec();
    return doc ? this.toDomain(doc.toJSON()) : undefined;
  }

  async save(weights: Readonly<ColumnClassifierWeights>): Promise<void> {
    const col = await this.getCollection();
    await col.upsert({
      id: SINGLETON_ID,
      matrix: weights.matrix.map(row => [...row]),
      featureVersion: weights.featureVersion,
      updatedAt: weights.updatedAt
    });
  }

  async clear(): Promise<void> {
    const col = await this.getCollection();
    const doc = await col.findOne(SINGLETON_ID).exec();
    if (doc) {
      await doc.remove();
    }
  }

  private toDomain(json: Record<string, unknown>): ColumnClassifierWeights {
    return {
      matrix: json['matrix'] as number[][],
      featureVersion: json['featureVersion'] as number,
      updatedAt: json['updatedAt'] as number
    };
  }
}
