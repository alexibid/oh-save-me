import { Injectable } from '@angular/core';
import { Unit } from '@domain/models/unit';
import { UnitRepository } from '@domain/repositories/unit.repository';
import { RxDbDatabaseService } from './rxdb-database.service';

@Injectable({
  providedIn: 'root'
})
export class RxdbUnitRepository implements UnitRepository {
  constructor(private dbService: RxDbDatabaseService) { }

  private async getCollection() {
    const db = await this.dbService.getDatabase();
    return db.collections.units;
  }

  async getAll(): Promise<readonly Unit[]> {
    const col = await this.getCollection();
    const docs = await col.find({
      selector: {
        deleted: { $ne: true }
      }
    }).exec();

    return docs.map(doc => this.toDomain(doc.toJSON()));
  }

  async save(unit: Readonly<Unit>): Promise<void> {
    const col = await this.getCollection();
    await col.upsert({ ...unit, deleted: false });
  }

  async delete(code: string): Promise<void> {
    const col = await this.getCollection();
    const doc = await col.findOne(code).exec();
    if (doc) {
      const json = doc.toJSON();
      await col.upsert({ ...json, deleted: true });
    }
  }

  private toDomain(json: Record<string, unknown>): Unit {
    return {
      code: json['code'] as string,
      symbol: json['symbol'] as string,
      category: json['category'] as Unit['category'],
      label: json['label'] as string,
      custom: json['custom'] as boolean
    };
  }
}
