import { TestBed } from '@angular/core/testing';
import { RxDbDatabaseService } from './rxdb-database.service';
import { RxdbColumnClassifierWeightsRepository } from './rxdb-column-classifier-weights.repository';
import { ColumnClassifierWeights } from '@domain/models/column-classifier-model';

describe('RxdbColumnClassifierWeightsRepository', () => {
  let repository: RxdbColumnClassifierWeightsRepository;
  let dbService: RxDbDatabaseService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        RxDbDatabaseService,
        RxdbColumnClassifierWeightsRepository
      ]
    });
    repository = TestBed.inject(RxdbColumnClassifierWeightsRepository);
    dbService = TestBed.inject(RxDbDatabaseService);

    await dbService.initDatabase();
    await repository.clear();
  });

  it('should be created', () => {
    expect(repository).toBeTruthy();
  });

  it('starts empty', async () => {
    expect(await repository.get()).toBeUndefined();
  });

  it('saves and round-trips the weight matrix', async () => {
    const weights: ColumnClassifierWeights = {
      matrix: [[1, 2, 3], [4, 5, 6]],
      featureVersion: 1,
      updatedAt: 1000
    };

    await repository.save(weights);
    const loaded = await repository.get();

    expect(loaded).toEqual(weights);
  });

  it('overwrites the single row on repeated save', async () => {
    await repository.save({ matrix: [[1]], featureVersion: 1, updatedAt: 1000 });
    await repository.save({ matrix: [[2]], featureVersion: 1, updatedAt: 2000 });

    const loaded = await repository.get();
    expect(loaded?.matrix).toEqual([[2]]);
    expect(loaded?.updatedAt).toBe(2000);
  });

  it('clears the stored weights', async () => {
    await repository.save({ matrix: [[1]], featureVersion: 1, updatedAt: 1000 });
    await repository.clear();

    expect(await repository.get()).toBeUndefined();
  });
});
