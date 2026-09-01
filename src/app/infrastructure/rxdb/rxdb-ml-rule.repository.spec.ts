import { TestBed } from '@angular/core/testing';
import { RxDbDatabaseService } from './rxdb-database.service';
import { RxdbMlRuleRepository } from './rxdb-ml-rule.repository';
import { MlRule } from '@domain/models/ml-rule';

describe('RxdbMlRuleRepository', () => {
  let repository: RxdbMlRuleRepository;
  let dbService: RxDbDatabaseService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        RxDbDatabaseService,
        RxdbMlRuleRepository
      ]
    });
    repository = TestBed.inject(RxdbMlRuleRepository);
    dbService = TestBed.inject(RxDbDatabaseService);

    await dbService.initDatabase();
    await repository.clear();
  });

  it('should be created', () => {
    expect(repository).toBeTruthy();
  });

  it('starts empty', async () => {
    const all = await repository.getAll();
    expect(all).toEqual([]);
  });

  it('upserts and round-trips a learned rule with categoryWeights', async () => {
    const rule: MlRule = {
      key: 'uber eats',
      categoryWeights: { Restaurants: 5 },
      enabled: true,
      updatedAt: Date.now()
    };

    await repository.upsert(rule);
    const all = await repository.getAll();

    expect(all).toHaveLength(1);
    expect(all[0].key).toBe('uber eats');
    expect(all[0].categoryWeights).toEqual({ Restaurants: 5 });
    expect(all[0].enabled).toBe(true);
  });

  it('upserts a suppression-only rule with no categoryWeights', async () => {
    const rule: MlRule = { key: 'lidl', enabled: false, updatedAt: Date.now() };

    await repository.upsert(rule);
    const all = await repository.getAll();

    expect(all).toHaveLength(1);
    expect(all[0].categoryWeights).toBeUndefined();
    expect(all[0].enabled).toBe(false);
  });

  it('updates an existing rule on repeated upsert', async () => {
    await repository.upsert({ key: 'lidl', enabled: true, updatedAt: Date.now() });
    await repository.upsert({ key: 'lidl', enabled: false, updatedAt: Date.now() });

    const all = await repository.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].enabled).toBe(false);
  });

  it('soft-deletes a rule so it no longer appears in getAll', async () => {
    await repository.upsert({ key: 'lidl', enabled: true, updatedAt: Date.now() });
    await repository.delete('lidl');

    const all = await repository.getAll();
    expect(all).toEqual([]);
  });

  it('clears all rules', async () => {
    await repository.upsert({ key: 'lidl', enabled: true, updatedAt: Date.now() });
    await repository.upsert({ key: 'pingo', enabled: true, updatedAt: Date.now() });

    await repository.clear();

    const all = await repository.getAll();
    expect(all).toEqual([]);
  });
});
