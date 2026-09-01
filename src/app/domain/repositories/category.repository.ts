import { CategoryInfo } from '@domain/models/category';

export interface CategoryRepository {
  getAll(): Promise<readonly CategoryInfo[]>;
  save(category: CategoryInfo): Promise<void>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}
