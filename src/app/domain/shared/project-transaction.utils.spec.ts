import { matchesProjectBudget, isLinkedToAnyActiveProject, findUnassignedVacationWindowTransactions, syncVacationWindow } from './project-transaction.utils';
import { Budget } from '@domain/models/budget';
import { Transaction } from '@domain/models/transaction';

const makeTx = (id: string, date: string, extra: Partial<Transaction> = {}): Transaction => ({
  id,
  date,
  description: `tx-${id}`,
  amount: -10,
  category: 'outros',
  ...extra
});

const neverRecurring = (): boolean => false;
const alwaysRecurring = (): boolean => true;

describe('matchesProjectBudget', () => {
  const vacation: Budget = {
    id: 'proj-1',
    name: 'Holiday',
    type: 'project',
    kind: 'vacation',
    amount: 1000,
    tags: ['ferias-2026'],
    projectStartDate: '2026-08-01',
    projectEndDate: '2026-08-25'
  };

  it('matches a vacation transaction purely by date range, with no tag and no explicit budgetId', () => {
    const tx = makeTx('t1', '2026-08-10');
    expect(matchesProjectBudget(tx, vacation, '2026-08-31', neverRecurring)).toBe(true);
  });

  it('does not match a vacation transaction dated outside the vacation window, unless tagged or explicitly linked', () => {
    const tx = makeTx('t1', '2026-09-01');
    expect(matchesProjectBudget(tx, vacation, '2026-09-30', neverRecurring)).toBe(false);
  });

  it('matches by explicit budgetId regardless of date', () => {
    const tx = makeTx('t1', '2020-01-01', { budgetId: 'proj-1' });
    expect(matchesProjectBudget(tx, vacation, '2026-08-31', neverRecurring)).toBe(true);
  });

  it('matches a vacation transaction by tag even outside the vacation window', () => {
    const tx = makeTx('t1', '2026-09-01', { tags: ['ferias-2026'] });
    expect(matchesProjectBudget(tx, vacation, '2026-09-30', neverRecurring)).toBe(true);
  });

  it('does not auto-match a transaction inside the vacation window that the isRecurring predicate flags as recurring', () => {
    const tx = makeTx('t1', '2026-08-10');
    expect(matchesProjectBudget(tx, vacation, '2026-08-31', alwaysRecurring)).toBe(false);
  });

  it('still matches a recurring transaction if the user explicitly assigned it via budgetId', () => {
    const explicitlyAssigned = makeTx('t1', '2020-01-01', { budgetId: 'proj-1' });
    expect(matchesProjectBudget(explicitlyAssigned, vacation, '2026-08-31', alwaysRecurring)).toBe(true);
  });

  it('still matches a recurring transaction if explicitly tagged with the project tag', () => {
    const tagged = makeTx('t1', '2026-09-01', { tags: ['ferias-2026'] });
    expect(matchesProjectBudget(tagged, vacation, '2026-09-30', alwaysRecurring)).toBe(true);
  });

  const works: Budget = {
    id: 'proj-2',
    name: 'Obras Casa',
    type: 'project',
    kind: 'works',
    amount: 5000,
    tags: ['obras'],
    startDate: '2026-06-01',
    endDate: '2026-08-31'
  };

  it('for a non-vacation project, still requires a tag-matched transaction to fall within the project date window', () => {
    const inside = makeTx('t1', '2026-07-01', { tags: ['obras'] });
    const outside = makeTx('t2', '2026-09-15', { tags: ['obras'] });
    expect(matchesProjectBudget(inside, works, '2026-08-31', neverRecurring)).toBe(true);
    expect(matchesProjectBudget(outside, works, '2026-08-31', neverRecurring)).toBe(false);
  });

  it('for a non-vacation project, a manually linked (budgetId) transaction counts even outside the date window', () => {
    const tx = makeTx('t1', '2026-09-15', { budgetId: 'proj-2' });
    expect(matchesProjectBudget(tx, works, '2026-08-31', neverRecurring)).toBe(true);
  });
});

describe('isLinkedToAnyActiveProject', () => {
  it('returns true when a transaction falls within an active vacation project date range', () => {
    const vacation: Budget = {
      id: 'proj-1', name: 'Holiday', type: 'project', kind: 'vacation', amount: 1000,
      projectStartDate: '2026-08-01', projectEndDate: '2026-08-25'
    };
    const tx = makeTx('t1', '2026-08-10');
    expect(isLinkedToAnyActiveProject(tx, [vacation], '2026-08-31', neverRecurring)).toBe(true);
  });

  it('returns false when the transaction matches no active project', () => {
    const tx = makeTx('t1', '2026-01-01');
    expect(isLinkedToAnyActiveProject(tx, [], '2026-01-31', neverRecurring)).toBe(false);
  });
});

describe('findUnassignedVacationWindowTransactions', () => {
  const vacation: Budget = {
    id: 'proj-1', name: 'Holiday', type: 'project', kind: 'vacation', amount: 1000,
    projectStartDate: '2026-08-10', projectEndDate: '2026-08-20'
  };

  it('returns transactions dated inside the vacation window that have no budgetId yet', () => {
    const inside = makeTx('t1', '2026-08-15');
    const outside = makeTx('t2', '2026-09-01');
    const result = findUnassignedVacationWindowTransactions([inside, outside], vacation, neverRecurring);
    expect(result.map(t => t.id)).toEqual(['t1']);
  });

  it('excludes transactions that already have any budgetId, even a different project', () => {
    const alreadyAssigned = makeTx('t1', '2026-08-15', { budgetId: 'some-other-project' });
    expect(findUnassignedVacationWindowTransactions([alreadyAssigned], vacation, neverRecurring)).toEqual([]);
  });

  it('excludes recurring transactions from auto-assignment', () => {
    const recurring = makeTx('t1', '2026-08-15');
    expect(findUnassignedVacationWindowTransactions([recurring], vacation, alwaysRecurring)).toEqual([]);
  });

  it('returns nothing for a non-vacation project or a vacation project without a date window', () => {
    const works: Budget = { id: 'proj-2', name: 'Obras', type: 'project', kind: 'works', amount: 500 };
    const incompleteVacation: Budget = { id: 'proj-3', name: 'Holiday', type: 'project', kind: 'vacation', amount: 500 };
    const tx = makeTx('t1', '2026-08-15');
    expect(findUnassignedVacationWindowTransactions([tx], works, neverRecurring)).toEqual([]);
    expect(findUnassignedVacationWindowTransactions([tx], incompleteVacation, neverRecurring)).toEqual([]);
  });
});

describe('syncVacationWindow', () => {
  const vacation: Budget = {
    id: 'proj-vac',
    name: 'Holiday',
    type: 'project',
    kind: 'vacation',
    amount: 1000,
    projectStartDate: '2026-08-10',
    projectEndDate: '2026-08-20'
  };
  const neverRecurring = () => false;
  const alwaysRecurring = () => true;

  it('assigns an unassigned, non-recurring movement that the edited window now covers', () => {
    const gained = makeTx('t1', '2026-08-12');
    const { toAssign } = syncVacationWindow([gained], vacation, neverRecurring);
    expect(toAssign.map(t => t.id)).toEqual(['t1']);
  });

  it('releases a movement the window itself had claimed once it falls outside the new dates', () => {
    const lost = makeTx('t1', '2026-08-25', { budgetId: 'proj-vac', budgetAutoAssigned: true });
    const { toRelease } = syncVacationWindow([lost], vacation, neverRecurring);
    expect(toRelease.map(t => t.id)).toEqual(['t1']);
  });

  it('keeps a hand-assigned movement outside the window, since a flight booked earlier still belongs to the trip', () => {
    const manual = makeTx('t1', '2026-06-01', { budgetId: 'proj-vac' });
    const { toRelease } = syncVacationWindow([manual], vacation, neverRecurring);
    expect(toRelease).toEqual([]);
  });

  it('leaves a movement belonging to another project alone', () => {
    const other = makeTx('t1', '2026-08-25', { budgetId: 'proj-other', budgetAutoAssigned: true });
    const { toAssign, toRelease } = syncVacationWindow([other], vacation, neverRecurring);
    expect(toAssign).toEqual([]);
    expect(toRelease).toEqual([]);
  });

  it('never claims recurring movements, however the window moves', () => {
    const recurring = makeTx('t1', '2026-08-12');
    const { toAssign } = syncVacationWindow([recurring], vacation, alwaysRecurring);
    expect(toAssign).toEqual([]);
  });

  it('does nothing for a project that is not a dated vacation', () => {
    const works: Budget = { id: 'proj-w', name: 'Obras', type: 'project', kind: 'works', amount: 500 };
    const tx = makeTx('t1', '2026-08-12');
    expect(syncVacationWindow([tx], works, neverRecurring)).toEqual({ toAssign: [], toRelease: [] });
  });
});
