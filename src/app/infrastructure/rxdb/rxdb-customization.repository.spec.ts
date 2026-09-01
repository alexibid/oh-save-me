import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RxdbCustomizationRepository } from './rxdb-customization.repository';
import { RxDbDatabaseService } from './rxdb-database.service';

describe('RxdbCustomizationRepository', () => {
  let repository: RxdbCustomizationRepository;
  let mockDbService: Partial<RxDbDatabaseService>;
  let mockCollection: any;

  beforeEach(() => {
    mockCollection = {
      find: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          { toJSON: () => ({ key: 'app_lang', value: 'pt' }), remove: vi.fn() }
        ])
      }),
      upsert: vi.fn().mockResolvedValue(undefined),
      findOne: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue({ remove: vi.fn().mockResolvedValue(undefined) })
      })
    };

    mockDbService = {
      getDatabase: vi.fn().mockResolvedValue({
        collections: {
          customizations: mockCollection
        }
      }) as any
    };

    repository = new RxdbCustomizationRepository(mockDbService as RxDbDatabaseService);
  });

  it('should get all customizations', async () => {
    const list = await repository.getAll();
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual({ key: 'app_lang', value: 'pt' });
  });

  it('should save customization via upsert', async () => {
    await repository.save({ key: 'theme', value: 'dark' });
    expect(mockCollection.upsert).toHaveBeenCalledWith({ key: 'theme', value: 'dark' });
  });

  it('should delete customization by key', async () => {
    await repository.delete('app_lang');
    expect(mockCollection.findOne).toHaveBeenCalledWith('app_lang');
  });
});
