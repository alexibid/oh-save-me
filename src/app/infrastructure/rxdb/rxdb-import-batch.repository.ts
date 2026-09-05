import { Injectable, inject } from '@angular/core';
import { ImportBatch } from '@domain/models/import-batch';
import { ImportBatchRepository } from '@domain/repositories/import-batch.repository';
import { RxDbDatabaseService } from './rxdb-database.service';

@Injectable({
  providedIn: 'root'
})
export class RxdbImportBatchRepository implements ImportBatchRepository {
  private readonly dbService = inject(RxDbDatabaseService);

  private async getCollection() {
    const db = await this.dbService.getDatabase();
    return db.collections.import_batches;
  }

  async getAll(): Promise<readonly ImportBatch[]> {
    const col = await this.getCollection();
    const docs = await col.find({
      selector: {
        deleted: { $ne: true }
      }
    }).exec();

    return docs.map(doc => {
      const json = doc.toJSON();
      return {
        id: json.id,
        name: json.name,
        importDate: json.importDate,
        startDate: json.startDate,
        endDate: json.endDate,
        accountId: json.accountId,
        transactionCount: json.transactionCount,
        fileChecksum: json.fileChecksum,
        updatedAt: json.updatedAt
      };
    });
  }

  async save(batch: Readonly<ImportBatch>): Promise<void> {
    const col = await this.getCollection();
    await col.upsert({
      id: batch.id,
      name: batch.name,
      importDate: batch.importDate,
      startDate: batch.startDate,
      endDate: batch.endDate,
      accountId: batch.accountId,
      transactionCount: batch.transactionCount,
      fileChecksum: batch.fileChecksum,
      updatedAt: Date.now(),
      deleted: false
    });
  }

  async delete(id: string): Promise<void> {
    const col = await this.getCollection();
    const doc = await col.findOne(id).exec();
    if (doc) {
      const json = doc.toJSON();
      await col.upsert({
        ...json,
        updatedAt: Date.now(),
        deleted: true
      });
    }
  }
}
