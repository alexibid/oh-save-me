import type { RxJsonSchema } from 'rxdb';
import { CategoryInfo } from '@domain/models/category';

export interface RxCategoryDocument extends CategoryInfo {
  updatedAt: number;
  deleted?: boolean;
}

export const CATEGORY_SCHEMA: RxJsonSchema<RxCategoryDocument> = {
  title: 'category schema',
  description: 'describes a custom category',
  version: 4,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    icon: { type: 'string' },
    color: { type: 'string' },
    updatedAt: { type: 'number' },
    deleted: { type: 'boolean' },
    enabled: { type: 'boolean' },
    accountTypes: { type: 'array' }
  },
  required: ['id', 'name', 'icon', 'color', 'updatedAt']
};
