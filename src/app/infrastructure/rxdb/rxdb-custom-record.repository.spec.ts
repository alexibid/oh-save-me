import { TestBed } from '@angular/core/testing';
import { RxDbDatabaseService } from './rxdb-database.service';
import { RxdbCustomRecordRepository } from './rxdb-custom-record.repository';
import { CustomRecord } from '@domain/models/custom-record';

describe('RxdbCustomRecordRepository', () => {
  let repository: RxdbCustomRecordRepository;
  let dbService: RxDbDatabaseService;

  const record: CustomRecord = {
    id: 'rec_1',
    accountId: 'acc_ev',
    date: '2026-07-15',
    dimensions: { estacao: 'IONITY Lisboa' },
    measures: { kwh: { value: 42.3, unit: 'kWh' } },
    updatedAt: Date.now()
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        RxDbDatabaseService,
        RxdbCustomRecordRepository
      ]
    });
    repository = TestBed.inject(RxdbCustomRecordRepository);
    dbService = TestBed.inject(RxDbDatabaseService);

    await dbService.initDatabase();
  });

  it('should be created', () => {
    expect(repository).toBeTruthy();
  });

  it('starts empty', async () => {
    const all = await repository.getAll();
    expect(all).toEqual([]);
  });

  it('saves and returns a record, preserving dimensions and measures', async () => {
    await repository.save(record);
    const all = await repository.getAll();

    expect(all).toEqual([record]);
  });

  it('saveMany persists a batch in one call', async () => {
    const second: CustomRecord = { ...record, id: 'rec_2', date: '2026-07-16' };

    await repository.saveMany([record, second]);
    const all = await repository.getAll();

    expect(all).toHaveLength(2);

    await repository.delete('rec_2');
  });

  it('getByAccountId only returns records for that account', async () => {
    const otherAccount: CustomRecord = { ...record, id: 'rec_3', accountId: 'acc_other' };
    await repository.saveMany([record, otherAccount]);

    const forEv = await repository.getByAccountId('acc_ev');

    expect(forEv).toEqual([record]);

    await repository.delete('rec_3');
  });

  it('soft-deletes a record so it no longer appears in getAll', async () => {
    await repository.save(record);

    await repository.delete('rec_1');
    const all = await repository.getAll();

    expect(all).toEqual([]);
  });
});
