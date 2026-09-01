import { Budget } from '@domain/models/budget';
import { Transaction } from '@domain/models/transaction';

export function isCandidateVacationTransaction(t: Transaction, isRecurring: (t: Transaction) => boolean): boolean {
  if (t.amount >= 0) return false;
  if (t.category === 'Investments' || t.category === 'Transfers' || t.category === 'Income' || t.category === 'Dividends' || t.category === 'Interest') {
    return false;
  }
  return !isRecurring(t);
}

export function matchesProjectBudget(
  t: Transaction,
  budget: Budget,
  filterEndDate: string,
  isRecurring: (t: Transaction) => boolean
): boolean {
  if (t.budgetId === budget.id) return true;

  const isAutoVacationWindow = budget.kind === 'vacation'
    && !budget.transactionsAutoAssigned
    && budget.projectStartDate
    && budget.projectEndDate;
  if (isAutoVacationWindow && isCandidateVacationTransaction(t, isRecurring)) {
    if (t.date >= budget.projectStartDate! && t.date <= budget.projectEndDate!) return true;
  }

  const tagMatch = !!t.tags?.length && !!budget.tags?.length && t.tags.some(tag => budget.tags?.includes(tag));
  if (!tagMatch) return false;
  if (budget.kind === 'vacation') return true;

  const startLimit = budget.startDate || '0000-01-01';
  const endLimit = budget.endDate && budget.endDate < filterEndDate ? budget.endDate : filterEndDate;
  return t.date >= startLimit && t.date <= endLimit;
}

export function isLinkedToAnyActiveProject(
  t: Transaction,
  activeProjects: readonly Budget[],
  filterEndDate: string,
  isRecurring: (t: Transaction) => boolean
): boolean {
  return activeProjects.some(proj => matchesProjectBudget(t, proj, filterEndDate, isRecurring));
}

export interface VacationWindowSync {
  readonly toAssign: readonly Transaction[];
  readonly toRelease: readonly Transaction[];
}

export function syncVacationWindow(
  transactions: readonly Transaction[],
  vacation: Budget,
  isRecurring: (t: Transaction) => boolean
): VacationWindowSync {
  if (vacation.kind !== 'vacation' || !vacation.projectStartDate || !vacation.projectEndDate) {
    return { toAssign: [], toRelease: [] };
  }

  const start = vacation.projectStartDate;
  const end = vacation.projectEndDate;
  const isInsideWindow = (t: Transaction): boolean =>
    isCandidateVacationTransaction(t, isRecurring) && t.date >= start && t.date <= end;

  return {
    toAssign: transactions.filter(t => !t.budgetId && isInsideWindow(t)),
    toRelease: transactions.filter(
      t => t.budgetId === vacation.id && t.budgetAutoAssigned === true && !(t.date >= start && t.date <= end)
    )
  };
}

export function findUnassignedVacationWindowTransactions(
  transactions: readonly Transaction[],
  vacationProject: Budget,
  isRecurring: (t: Transaction) => boolean
): readonly Transaction[] {
  if (vacationProject.kind !== 'vacation' || !vacationProject.projectStartDate || !vacationProject.projectEndDate) {
    return [];
  }
  return transactions.filter(t =>
    !t.budgetId &&
    isCandidateVacationTransaction(t, isRecurring) &&
    t.date >= vacationProject.projectStartDate! &&
    t.date <= vacationProject.projectEndDate!
  );
}
