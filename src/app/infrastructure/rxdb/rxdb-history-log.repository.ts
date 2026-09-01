import { Injectable } from '@angular/core';
import { RxCollection } from 'rxdb';
import { HistoryLog } from '@domain/models/history-log';
import { HistoryLogRepository } from '@domain/repositories/history-log.repository';
import { RxDbDatabaseService } from './rxdb-database.service';

@Injectable({
  providedIn: 'root'
})
export class RxdbHistoryLogRepository implements HistoryLogRepository {
  constructor(private dbService: RxDbDatabaseService) { }

  private async getCollection(): Promise<RxCollection<any>> {
    const db = await this.dbService.getDatabase();
    return db.collections.history_logs;
  }

  async getAll(): Promise<readonly HistoryLog[]> {
    const col = await this.getCollection();
    const docs = await col.find().exec();
    return docs.map(doc => {
      const json = doc.toJSON();
      return {
        id: json.id,
        timestamp: json.timestamp,
        action: json.action,
        entity: json.entity,
        entityId: json.entityId,
        oldValue: json.oldValue,
        newValue: json.newValue
      };
    });
  }

  async save(log: HistoryLog): Promise<void> {
    const col = await this.getCollection();
    await col.upsert({
      id: log.id,
      timestamp: log.timestamp,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      oldValue: log.oldValue,
      newValue: log.newValue
    });
  }

  async delete(id: string): Promise<void> {
    const col = await this.getCollection();
    const doc = await col.findOne(id).exec();
    if (doc) {
      await doc.remove();
    }
  }

  async clear(): Promise<void> {
    const col = await this.getCollection();
    const docs = await col.find().exec();
    await Promise.all(docs.map(doc => doc.remove()));
  }
}
