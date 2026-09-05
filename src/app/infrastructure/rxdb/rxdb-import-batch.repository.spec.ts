import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { RxdbImportBatchRepository } from './rxdb-import-batch.repository';
import { RxDbDatabaseService } from './rxdb-database.service';

const createMockCollection = () => ({
      find: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          {
            toJSON: () => ({
              id: 'batch_1',
              name: 'Extrato_CGD.csv',
              importDate: '2026-08-05',
              startDate: '2026-08-01',
              endDate: '2026-08-05',
              accountId: 'acc_1',
              transactionCount: 25,
              fileChecksum: 'abc123hash',
              updatedAt: 1700000000,
            }),
          },
        ]),
      }),
      upsert: vi.fn().mockResolvedValue(undefined),
      findOne: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          toJSON: () => ({ id: 'batch_1', name: 'Extrato_CGD.csv' }),
        }),
      }),
    });

describe('RxdbImportBatchRepository', () => {
  let repository: RxdbImportBatchRepository;
  let mockDbService: Partial<RxDbDatabaseService>;
  let mockCollection: ReturnType<typeof createMockCollection>;

  beforeEach(() => {
    mockCollection = createMockCollection();

    mockDbService = {
      getDatabase: vi.fn().mockResolvedValue({
        collections: {
          import_batches: mockCollection,
        },
      }) as RxDbDatabaseService['getDatabase'],
    };

    TestBed.configureTestingModule({
      providers: [{ provide: RxDbDatabaseService, useValue: mockDbService }]
    });
    repository = TestBed.inject(RxdbImportBatchRepository);
  });

  it('should get all import batches', async () => {
    const batches = await repository.getAll();
    expect(batches).toHaveLength(1);
    expect(batches[0].id).toBe('batch_1');
  });

  it('should save import batch via upsert', async () => {
    await repository.save({
      id: 'batch_2',
      name: 'Extrato_Universo.csv',
      importDate: '2026-08-05',
      startDate: '2026-08-01',
      endDate: '2026-08-05',
      accountId: 'acc_1',
      transactionCount: 10,
      fileChecksum: 'xyz789hash',
      updatedAt: 1700000100,
    });
    expect(mockCollection.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'batch_2', name: 'Extrato_Universo.csv' })
    );
  });

  it('should soft delete import batch by setting deleted flag', async () => {
    await repository.delete('batch_1');
    expect(mockCollection.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'batch_1', deleted: true })
    );
  });
});
