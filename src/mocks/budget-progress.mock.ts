import { Budget } from '@domain/models/budget';
import { BudgetProgress } from '@application/selectors/budget.selectors';

export function createMockBudgetProgress(budget: Budget, spent = 150): BudgetProgress {
  return {
    budget,
    spent,
    percentage: budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0,
    remaining: budget.amount - spent,
    isOverBudget: spent > budget.amount,
    status: 'active',
    accumulatedReserve: 500,
    periodAllocation: budget.amount,
    progressColor: '#10b981'
  };
}

export function createMockCategoryBudgetProgress(
  categoryId: string,
  amount: number,
  spent = 100
): BudgetProgress {
  const budget: Budget = {
    id: categoryId,
    name: categoryId,
    type: 'category',
    categoryId,
    amount
  };

  return createMockBudgetProgress(budget, spent);
}
