import { TestBed } from '@angular/core/testing';
import { RxDbDatabaseService } from './rxdb-database.service';
import { RxdbMappingRuleRepository } from './rxdb-mapping-rule.repository';
import { MappingRule } from '@domain/models/mapping-rule';

describe('RxdbMappingRuleRepository', () => {
  let repository: RxdbMappingRuleRepository;
  let dbService: RxDbDatabaseService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        RxDbDatabaseService,
        RxdbMappingRuleRepository
      ]
    });
    repository = TestBed.inject(RxdbMappingRuleRepository);
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

  it('upserts and round-trips a learned mapping rule', async () => {
    const rule: MappingRule = {
      signatureKey: 'data valor|descritivo|valor movimento',
      mapping: { date: { columnIndex: 0, confidence: 1 }, desc: { columnIndex: 1, confidence: 1 } },
      updatedAt: Date.now()
    };

    await repository.upsert(rule);
    const all = await repository.getAll();

    expect(all).toHaveLength(1);
    expect(all[0].signatureKey).toBe(rule.signatureKey);
    expect(all[0].mapping).toEqual(rule.mapping);
  });

  it('updates an existing rule on repeated upsert for the same signature', async () => {
    const signatureKey = 'a|b';
    await repository.upsert({ signatureKey, mapping: { date: { columnIndex: 0, confidence: 1 } }, updatedAt: Date.now() });
    await repository.upsert({ signatureKey, mapping: { date: { columnIndex: 1, confidence: 1 } }, updatedAt: Date.now() });

    const all = await repository.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].mapping.date?.columnIndex).toBe(1);
  });

  it('soft-deletes a rule so it no longer appears in getAll', async () => {
    const signatureKey = 'a|b';
    await repository.upsert({ signatureKey, mapping: {}, updatedAt: Date.now() });
    await repository.delete(signatureKey);

    const all = await repository.getAll();
    expect(all).toEqual([]);
  });

  it('clears all rules', async () => {
    await repository.upsert({ signatureKey: 'a|b', mapping: {}, updatedAt: Date.now() });
    await repository.upsert({ signatureKey: 'c|d', mapping: {}, updatedAt: Date.now() });

    await repository.clear();

    const all = await repository.getAll();
    expect(all).toEqual([]);
  });
});
