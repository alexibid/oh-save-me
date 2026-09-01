import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CategoriesSelectors } from './categories.selectors';
import { APP_STORE_TOKEN } from '@application/app-store';
import { I18nService } from '@application/i18n.service';
import { Budget } from '@domain/models/budget';
import { Transaction } from '@domain/models/transaction';
import { MOCK_TRANSACTIONS } from '@/mocks/transactions.mock';
import { MOCK_CATEGORIES } from '@/mocks/categories.mock';
import { MOCK_ACCOUNTS } from '@/mocks/accounts.mock';
import { MOCK_BUDGET_PROJECT_VACATION } from '@/mocks/budgets.mock';

describe('CategoriesSelectors', () => {
  const VACATION = MOCK_BUDGET_PROJECT_VACATION;

  const PENDING_IN_WINDOW = MOCK_TRANSACTIONS.find(t => t.id === 'tx-2026-08-bank-pending-1')!;

  const budgets = signal<readonly Budget[]>([]);
  const transactions = signal<readonly Transaction[]>(MOCK_TRANSACTIONS);

  let selectors: CategoriesSelectors;

  beforeEach(() => {
    budgets.set([]);
    transactions.set(MOCK_TRANSACTIONS);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: APP_STORE_TOKEN,
          useValue: {
            budgets,
            transactions,
            categories: signal(MOCK_CATEGORIES),
            accounts: signal(MOCK_ACCOUNTS),
            startDate: signal('2026-08-01'),
            endDate: signal('2026-08-31'),
            preset: signal('current_month')
          }
        },
        {
          provide: I18nService,
          useValue: {
            currentLang: signal('pt'),
            onLangChange: signal('pt'),
            translate: (key: string) => key,
            getCategoryName: (id: string) => id,
            formatCurrency: (value: number) => String(value)
          }
        }
      ]
    });

    selectors = TestBed.inject(CategoriesSelectors);
  });

  const totalFor = (categoryId: string): number => {
    const chart = selectors.chartData();
    const index = chart.ids.indexOf(categoryId);
    return index === -1 ? 0 : chart.datasets[0].data[index];
  };

  it('should count a transaction under its category when no project claims it', () => {
    expect(totalFor(PENDING_IN_WINDOW.category)).toBeLessThanOrEqual(PENDING_IN_WINDOW.amount);
  });

  it('should drop a vacation-window transaction from its category, since a movement belongs either to a project or to a category', () => {
    const withoutProject = totalFor(PENDING_IN_WINDOW.category);

    budgets.set([VACATION]);

    expect(totalFor(PENDING_IN_WINDOW.category)).toBe(withoutProject - PENDING_IN_WINDOW.amount);
  });

  it('should keep counting transactions dated outside the vacation window under their own category', () => {
    const groceriesBeforeWindow = MOCK_TRANSACTIONS.find(t => t.id === 'tx-2026-08-bank-groc-1')!;
    expect(groceriesBeforeWindow.date < VACATION.projectStartDate!).toBe(true);

    budgets.set([VACATION]);

    expect(totalFor(groceriesBeforeWindow.category)).toBeLessThanOrEqual(groceriesBeforeWindow.amount);
  });

  it('should return a transaction to its category once the user detaches it, instead of the window re-claiming it', () => {
    budgets.set([{ ...VACATION, transactionsAutoAssigned: true }]);

    expect(totalFor(PENDING_IN_WINDOW.category)).toBeLessThanOrEqual(PENDING_IN_WINDOW.amount);
  });

  it('should keep a transaction out of its category while it stays explicitly assigned to the project', () => {
    const detached = totalFor(PENDING_IN_WINDOW.category);

    budgets.set([{ ...VACATION, transactionsAutoAssigned: true }]);
    transactions.set(
      MOCK_TRANSACTIONS.map(t => t.id === PENDING_IN_WINDOW.id ? { ...t, budgetId: VACATION.id } : t)
    );

    expect(totalFor(PENDING_IN_WINDOW.category)).toBe(detached - PENDING_IN_WINDOW.amount);
  });

  it('should count transactions under their category again once the vacation project is closed', () => {
    budgets.set([{ ...VACATION, isClosed: true }]);

    expect(totalFor(PENDING_IN_WINDOW.category)).toBeLessThanOrEqual(PENDING_IN_WINDOW.amount);
  });
});
