import { TestBed } from '@angular/core/testing';
import { ImportCustomRecordsUseCase } from './import-custom-records.use-case';
import { APP_STORE_TOKEN } from '@application/app-store';
import { CsvParserService } from '@application/csv-parser.service';
import { CustomRecord } from '@domain/models/custom-record';

describe('ImportCustomRecordsUseCase', () => {
  let useCase: ImportCustomRecordsUseCase;
  let added: (readonly CustomRecord[])[];

  beforeEach(() => {
    added = [];
    const mockStore = {
      addCustomRecords: async (records: readonly CustomRecord[]) => { added = [...added, records]; }
    };
    const mockCsvParser = {
      generateHash: async (date: string, description: string, _amount: number, accountId: string, occurrence: number) =>
        `hash_${date}_${accountId}_${occurrence}_${description.length}`
    };

    TestBed.configureTestingModule({
      providers: [
        ImportCustomRecordsUseCase,
        { provide: APP_STORE_TOKEN, useValue: mockStore },
        { provide: CsvParserService, useValue: mockCsvParser }
      ]
    });
    useCase = TestBed.inject(ImportCustomRecordsUseCase);
  });

  it('builds a measure with its unit and a dimension from the mapped columns', async () => {
    const result = await useCase.execute({
      accountId: 'acc_ev',
      headers: ['Date', 'kWh', 'Station'],
      rows: [['2026-07-15', '42.3', 'IONITY Lisboa']],
      columnRoles: ['date', 'measure', 'dimension'],
      measureUnits: { 1: 'kWh' }
    });

    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-07-15');
    expect(result[0].measures['kWh']).toEqual({ value: 42.3, unit: 'kWh' });
    expect(result[0].dimensions['Station']).toBe('IONITY Lisboa');
    expect(added).toEqual([result]);
  });

  it('defaults a measure to EUR when no unit was assigned for its column', async () => {
    const result = await useCase.execute({
      accountId: 'acc_ppr',
      headers: ['Date', 'Amount'],
      rows: [['2026-07-15', '100.00']],
      columnRoles: ['date', 'measure'],
      measureUnits: {}
    });

    expect(result[0].measures['Amount']).toEqual({ value: 100, unit: 'EUR' });
  });

  it('skips non-numeric values for a measure column instead of throwing', async () => {
    const result = await useCase.execute({
      accountId: 'acc_x',
      headers: ['Date', 'Amount'],
      rows: [['2026-07-15', 'n/a']],
      columnRoles: ['date', 'measure'],
      measureUnits: {}
    });

    expect(result[0].measures).toEqual({});
  });

  it('ignores skipped columns entirely', async () => {
    const result = await useCase.execute({
      accountId: 'acc_x',
      headers: ['Date', 'Notas', 'Amount'],
      rows: [['2026-07-15', 'ignore this', '10']],
      columnRoles: ['date', 'skip', 'measure'],
      measureUnits: {}
    });

    expect(result[0].dimensions).toEqual({});
    expect(Object.keys(result[0].measures)).toEqual(['Amount']);
  });

  it('gives two rows with identical content different ids via the occurrence counter, matching transaction dedup discipline', async () => {
    const result = await useCase.execute({
      accountId: 'acc_x',
      headers: ['Date', 'Amount'],
      rows: [['2026-07-15', '10'], ['2026-07-15', '10']],
      columnRoles: ['date', 'measure'],
      measureUnits: {}
    });

    expect(result[0].id).not.toBe(result[1].id);
  });

  it('carries the importBatchId through to every record', async () => {
    const result = await useCase.execute({
      accountId: 'acc_x',
      headers: ['Date', 'Amount'],
      rows: [['2026-07-15', '10']],
      columnRoles: ['date', 'measure'],
      measureUnits: {},
      importBatchId: 'batch_1'
    });

    expect(result[0].importBatchId).toBe('batch_1');
  });
});
