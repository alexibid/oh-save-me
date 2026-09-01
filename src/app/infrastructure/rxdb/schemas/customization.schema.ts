import { RxJsonSchema } from 'rxdb';
import { Customization } from '@domain/models/customization';

export const RxCustomizationSchema: RxJsonSchema<Customization> = {
  title: 'customizations schema',
  version: 0,
  primaryKey: 'key',
  type: 'object',
  properties: {
    key: {
      type: 'string',
      maxLength: 100
    },
    value: {
      type: 'string'
    }
  },
  required: ['key', 'value']
};
