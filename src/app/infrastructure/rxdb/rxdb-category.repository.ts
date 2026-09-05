import { Injectable, inject } from '@angular/core';
import { CategoryInfo, TEMPLATE_CATEGORIES } from '@domain/models/category';
import { CategoryRepository } from '@domain/repositories/category.repository';
import { RxDbDatabaseService } from './rxdb-database.service';

@Injectable({
  providedIn: 'root'
})
export class RxdbCategoryRepository implements CategoryRepository {
  private readonly dbService = inject(RxDbDatabaseService);

  private async getCollection() {
    const db = await this.dbService.getDatabase();
    return db.collections.categories;
  }

  async getAll(): Promise<readonly CategoryInfo[]> {
    const col = await this.getCollection();
    const docs = await col.find({
      selector: {
        deleted: { $ne: true }
      }
    }).exec();

    const dbCategories = docs.map(doc => {
      const json = doc.toJSON();
      return {
        id: json.id,
        name: json.name,
        icon: json.icon,
        color: json.color,
        enabled: json.enabled !== false
      };
    });

    const mergedMap = new Map<string, CategoryInfo>();
    TEMPLATE_CATEGORIES.forEach(c => mergedMap.set(c.id, { ...c, enabled: true }));
    dbCategories.forEach(c => mergedMap.set(c.id, { ...mergedMap.get(c.id), ...c }));

    return Array.from(mergedMap.values());
  }

  async save(category: CategoryInfo): Promise<void> {
    const col = await this.getCollection();
    const now = Date.now();
    await col.upsert({
      id: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      enabled: category.enabled !== false,
      updatedAt: now,
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
}
