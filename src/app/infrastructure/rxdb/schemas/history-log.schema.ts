import type { RxJsonSchema } from 'rxdb';
import { HistoryLog } from '@domain/models/history-log';

export const RxHistoryLogSchema: RxJsonSchema<HistoryLog> = {
  title: 'history_logs schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100
    },
    timestamp: {
      type: 'string'
    },
    action: {
      type: 'string',
      enum: ['INSERT', 'UPDATE', 'DELETE']
    },
    entity: {
      type: 'string',
      enum: ['transaction', 'category', 'budget', 'customization']
    },
    entityId: {
      type: 'string'
    },
    oldValue: {
      type: 'string'
    },
    newValue: {
      type: 'string'
    }
  },
  required: ['id', 'timestamp', 'action', 'entity', 'entityId']
};
