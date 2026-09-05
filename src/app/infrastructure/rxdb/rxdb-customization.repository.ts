import { Injectable, inject } from '@angular/core';
import { RxCollection } from 'rxdb';
import { Customization } from '@domain/models/customization';
import { CustomizationRepository } from '@domain/repositories/customization.repository';
import { RxDbDatabaseService } from './rxdb-database.service';

@Injectable({
  providedIn: 'root'
})
export class RxdbCustomizationRepository implements CustomizationRepository {
  private readonly dbService = inject(RxDbDatabaseService);

  private async getCollection(): Promise<RxCollection<Customization>> {
    const db = await this.dbService.getDatabase();
    return db.collections.customizations;
  }

  async getAll(): Promise<readonly Customization[]> {
    const col = await this.getCollection();
    const docs = await col.find().exec();
    return docs.map(doc => {
      const json = doc.toJSON();
      return {
        key: json.key,
        value: json.value
      };
    });
  }

  async save(customization: Customization): Promise<void> {
    const col = await this.getCollection();
    await col.upsert({
      key: customization.key,
      value: customization.value
    });
  }

  async delete(key: string): Promise<void> {
    const col = await this.getCollection();
    const doc = await col.findOne(key).exec();
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
