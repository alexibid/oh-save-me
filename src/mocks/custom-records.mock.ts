import { CustomRecord } from '@domain/models/custom-record';
import { MOCK_ACCOUNT_CUSTOM } from './accounts.mock';

export const MOCK_CUSTOM_RECORDS: readonly CustomRecord[] = [
  {
    id: 'cr-01',
    accountId: MOCK_ACCOUNT_CUSTOM.id,
    date: '2026-08-01',
    dimensions: { metric: 'energy_reading' },
    measures: { consumption: { value: 124.5, unit: 'kWh' } },
    updatedAt: 1754000000000
  },
  {
    id: 'cr-02',
    accountId: MOCK_ACCOUNT_CUSTOM.id,
    date: '2026-08-15',
    dimensions: { metric: 'water_meter' },
    measures: { consumption: { value: 8.2, unit: 'm3' } },
    updatedAt: 1755000000000
  }
];
