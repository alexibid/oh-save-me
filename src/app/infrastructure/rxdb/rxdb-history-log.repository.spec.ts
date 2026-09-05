import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { RxdbHistoryLogRepository } from './rxdb-history-log.repository';
import { RxDbDatabaseService } from './rxdb-database.service';

const createMockCollection = () => ({
      find: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          {
            toJSON: () => ({
              id: 'log_1',
              timestamp: '2026-08-05T15:00:00.000Z',
              action: 'INSERT',
              entity: 'transaction',
              entityId: 'tx_123',
            }),
            remove: vi.fn(),
          },
        ]),
      }),
      upsert: vi.fn().mockResolvedValue(undefined),
      findOne: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue({ remove: vi.fn().mockResolvedValue(undefined) }),
      }),
    });

describe('RxdbHistoryLogRepository', () => {
  let repository: RxdbHistoryLogRepository;
  let mockDbService: Partial<RxDbDatabaseService>;
  let mockCollection: ReturnType<typeof createMockCollection>;

  beforeEach(() => {
    mockCollection = createMockCollection();

    mockDbService = {
      getDatabase: vi.fn().mockResolvedValue({
        collections: {
          history_logs: mockCollection,
        },
      }) as RxDbDatabaseService['getDatabase'],
    };

    TestBed.configureTestingModule({
      providers: [{ provide: RxDbDatabaseService, useValue: mockDbService }]
    });
    repository = TestBed.inject(RxdbHistoryLogRepository);
  });

  it('should get all history logs', async () => {
    const logs = await repository.getAll();
    expect(logs).toHaveLength(1);
    expect(logs[0].id).toBe('log_1');
  });

  it('should save history log via upsert', async () => {
    await repository.save({
      id: 'log_2',
      timestamp: '2026-08-05T15:01:00.000Z',
      action: 'UPDATE',
      entity: 'category',
      entityId: 'cat_1',
    });
    expect(mockCollection.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'log_2', action: 'UPDATE' })
    );
  });

  it('should delete history log by id', async () => {
    await repository.delete('log_1');
    expect(mockCollection.findOne).toHaveBeenCalledWith('log_1');
  });
});
