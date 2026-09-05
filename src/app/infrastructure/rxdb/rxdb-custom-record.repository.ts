import { Injectable, inject } from '@angular/core';
import { CustomRecord, CustomRecordMeasure } from '@domain/models/custom-record';
import { CustomRecordRepository } from '@domain/repositories/custom-record.repository';
import { RxDbDatabaseService } from './rxdb-database.service';

@Injectable({
  providedIn: 'root'
})
export class RxdbCustomRecordRepository implements CustomRecordRepository {
  private readonly dbService = inject(RxDbDatabaseService);

  private async getCollection() {
    const db = await this.dbService.getDatabase();
    return db.collections.custom_records;
  }

  async getAll(): Promise<readonly CustomRecord[]> {
    const col = await this.getCollection();
    const docs = await col.find({
      selector: {
        deleted: { $ne: true }
      }
    }).exec();

    return docs.map(doc => this.toDomain(doc.toJSON()));
  }

  async getByAccountId(accountId: string): Promise<readonly CustomRecord[]> {
    const col = await this.getCollection();
    const docs = await col.find({
      selector: {
        accountId,
        deleted: { $ne: true }
      }
    }).exec();

    return docs.map(doc => this.toDomain(doc.toJSON()));
  }

  async save(record: Readonly<CustomRecord>): Promise<void> {
    const col = await this.getCollection();
    await col.upsert({ ...record, deleted: false });
  }

  async saveMany(records: readonly Readonly<CustomRecord>[]): Promise<void> {
    const col = await this.getCollection();
    await Promise.all(records.map(record => col.upsert({ ...record, deleted: false })));
  }

  async delete(id: string): Promise<void> {
    const col = await this.getCollection();
    const doc = await col.findOne(id).exec();
    if (doc) {
      const json = doc.toJSON();
      await col.upsert({ ...json, deleted: true });
    }
  }

  private toDomain(json: Record<string, unknown>): CustomRecord {
    return {
      id: json['id'] as string,
      accountId: json['accountId'] as string,
      date: json['date'] as string,
      dimensions: json['dimensions'] as Record<string, string>,
      measures: json['measures'] as Record<string, CustomRecordMeasure>,
      importBatchId: json['importBatchId'] as string | undefined,
      updatedAt: json['updatedAt'] as number
    };
  }
}
