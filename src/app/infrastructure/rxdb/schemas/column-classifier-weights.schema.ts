import { RxJsonSchema } from 'rxdb';

export interface RxColumnClassifierWeightsDocument {
  id: string;
  matrix: number[][];
  featureVersion: number;
  updatedAt: number;
}

export const COLUMN_CLASSIFIER_WEIGHTS_SCHEMA: RxJsonSchema<RxColumnClassifierWeightsDocument> = {
  title: 'column classifier weights schema',
  description: 'describes the persisted, online-learned weights of the column/format classifier',
  version: 1,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 50 },
    matrix: { type: 'array' },
    featureVersion: { type: 'number' },
    updatedAt: { type: 'number' }
  },
  required: ['id', 'matrix', 'featureVersion', 'updatedAt']
};
