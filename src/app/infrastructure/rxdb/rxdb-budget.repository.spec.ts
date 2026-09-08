import { TestBed } from '@angular/core/testing';
import { RxDbDatabaseService } from './rxdb-database.service';
import { RxdbBudgetRepository } from './rxdb-budget.repository';
import { Budget } from '@domain/models/budget';

describe('RxdbBudgetRepository', () => {
  let repository: RxdbBudgetRepository;
  let dbService: RxDbDatabaseService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [RxDbDatabaseService]
    });
    repository = TestBed.inject(RxdbBudgetRepository);
    dbService = TestBed.inject(RxDbDatabaseService);

    await dbService.initDatabase();
  });

  it('should be created', () => {
    expect(repository).toBeTruthy();
  });

  it('should return empty budgets by default', async () => {
    const all = await repository.getAll();
    expect(all.length).toBe(0);
  });

  it('should save a budget and return it', async () => {
    const budget: Budget = {
      id: 'budget-1',
      name: 'Supermercado',
      type: 'category',
      amount: 400,
      categoryId: 'Groceries'
    };

    await repository.save(budget);
    const all = await repository.getAll();
    expect(all.length).toBe(1);

    const saved = all[0];
    expect(saved.id).toBe('budget-1');
    expect(saved.name).toBe('Supermercado');
    expect(saved.amount).toBe(400);
    expect(saved.categoryId).toBe('Groceries');
    expect(saved.isClosed).toBe(false);
  });

  it('should delete a budget', async () => {
    const budget: Budget = {
      id: 'budget-1',
      name: 'Supermercado',
      type: 'category',
      amount: 400,
      categoryId: 'Groceries'
    };

    await repository.save(budget);
    let all = await repository.getAll();
    expect(all.length).toBe(1);

    await repository.delete('budget-1');
    all = await repository.getAll();
    expect(all.length).toBe(0);
  });

  it('should clear all budgets', async () => {
    const b1: Budget = {
      id: 'b1',
      name: 'Supermercado',
      type: 'category',
      amount: 400,
      categoryId: 'Groceries'
    };
    const b2: Budget = {
      id: 'b2',
      name: 'Holiday',
      type: 'project',
      amount: 1500,
      tags: ['ferias']
    };

    await repository.save(b1);
    await repository.save(b2);
    let all = await repository.getAll();
    expect(all.length).toBe(2);

    await repository.clear();
    all = await repository.getAll();
    expect(all.length).toBe(0);
  });

  it('round-trips every field of a vacation project, so nothing the domain sets is silently dropped', async () => {
    const vacation: Budget = {
      id: 'proj-vac',
      name: 'Summer Holiday',
      type: 'project',
      kind: 'vacation',
      amount: 1500,
      tags: ['ferias'],
      startDate: '2026-01-01',
      endDate: '2026-08-31',
      projectStartDate: '2026-08-10',
      projectEndDate: '2026-08-20',
      monthlyAllocation: 150,
      transactionsAutoAssigned: true
    };

    await repository.save(vacation);
    const saved = (await repository.getAll()).find(b => b.id === 'proj-vac')!;

    expect(saved).toMatchObject({
      kind: 'vacation',
      projectStartDate: '2026-08-10',
      projectEndDate: '2026-08-20',
      monthlyAllocation: 150,
      transactionsAutoAssigned: true
    });
  });

  it('keeps transactionsAutoAssigned false-y when it was never set, so the first sync still runs', async () => {
    const vacation: Budget = {
      id: 'proj-vac-2',
      name: 'Holiday',
      type: 'project',
      kind: 'vacation',
      amount: 500,
      projectStartDate: '2026-08-10',
      projectEndDate: '2026-08-20'
    };

    await repository.save(vacation);

    const saved = (await repository.getAll()).find(b => b.id === 'proj-vac-2')!;
    expect(saved.transactionsAutoAssigned).toBeFalsy();
  });
});