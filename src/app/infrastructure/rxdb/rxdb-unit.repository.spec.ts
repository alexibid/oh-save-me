import { TestBed } from '@angular/core/testing';
import { RxDbDatabaseService } from './rxdb-database.service';
import { RxdbUnitRepository } from './rxdb-unit.repository';
import { Unit } from '@domain/models/unit';

describe('RxdbUnitRepository', () => {
  let repository: RxdbUnitRepository;
  let dbService: RxDbDatabaseService;

  const unit: Unit = { code: 'CUSTOM_X', symbol: 'x', category: 'physical_measure', label: 'Custom X', custom: true };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        RxDbDatabaseService,
        RxdbUnitRepository
      ]
    });
    repository = TestBed.inject(RxdbUnitRepository);
    dbService = TestBed.inject(RxDbDatabaseService);

    await dbService.initDatabase();
  });

  it('should be created', () => {
    expect(repository).toBeTruthy();
  });

  it('starts empty — built-in units are never persisted here, only user-added custom ones', async () => {
    const all = await repository.getAll();
    expect(all).toEqual([]);
  });

  it('saves and returns an explicitly added custom unit', async () => {
    await repository.save(unit);
    const all = await repository.getAll();

    expect(all).toEqual([unit]);
  });

  it('soft-deletes a unit so it no longer appears in getAll', async () => {
    await repository.save(unit);

    await repository.delete('CUSTOM_X');
    const all = await repository.getAll();

    expect(all).toEqual([]);
  });
});
