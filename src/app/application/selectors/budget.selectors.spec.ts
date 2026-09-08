import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { BudgetSelectors } from './budget.selectors';
import { APP_STORE_TOKEN } from '@application/app-store';
import { Account } from '@domain/models/account';
import { Budget } from '@domain/models/budget';
import { CategoryInfo } from '@domain/models/category';
import { Transaction } from '@domain/models/transaction';
import { I18nService } from '@application/i18n.service';
import { vi } from 'vitest';
import {
  FREE_BALANCE_ACCOUNT,
  FREE_BALANCE_CATEGORY,
  FREE_BALANCE_CATEGORY_BUDGET,
  createCategorySpendTransaction
} from '@/mocks/free-balance-scenario.mock';

describe('BudgetSelectors', () => {
  let selectors: BudgetSelectors;

  const mockBudgets = signal<Budget[]>([
    {
      id: 'b-1',
      name: 'Obras Casa',
      amount: 1000,
      type: 'project',
      tags: ['obras']
    },
    {
      id: 'b-2',
      name: 'Groceries',
      amount: 400,
      type: 'category',
      categoryId: 'cat-alimentacao'
    },
    {
      id: 'b-3',
      name: 'Viagem Expirada Sucesso',
      amount: 500,
      type: 'project',
      tags: ['viagem'],
      endDate: '2026-07-10'
    },
    {
      id: 'b-4',
      name: 'Jantar Expirado Warning',
      amount: 100,
      type: 'project',
      tags: ['jantar'],
      endDate: '2026-07-10'
    },
    {
      id: 'b-5',
      name: 'Carro Expirado Danger',
      amount: 100,
      type: 'project',
      tags: ['carro'],
      endDate: '2026-07-10'
    }
  ]);

  const mockTransactions = signal<Transaction[]>([
    {
      id: 't-1',
      date: '2026-07-10',
      description: 'Compra cimento',
      amount: -150,
      category: 'outros',
      tags: ['obras']
    },
    {
      id: 't-2',
      date: '2026-07-12',
      description: 'Cement refund',
      amount: 50,
      category: 'outros',
      tags: ['obras']
    },
    {
      id: 't-3',
      date: '2026-07-15',
      description: 'Supermercado Continente',
      amount: -120,
      category: 'cat-alimentacao',
      tags: []
    },
    {
      id: 't-4',
      date: '2026-07-16',
      description: 'Ajuste Supermercado',
      amount: 20,
      category: 'cat-alimentacao',
      tags: []
    },
    {
      id: 't-5',
      date: '2026-07-05',
      description: 'Voo',
      amount: -300,
      category: 'outros',
      tags: ['viagem']
    },
    {
      id: 't-6',
      date: '2026-07-06',
      description: 'Restaurante',
      amount: -120,
      category: 'outros',
      tags: ['jantar']
    },
    {
      id: 't-7',
      date: '2026-07-07',
      description: 'Oficina',
      amount: -150,
      category: 'outros',
      tags: ['carro']
    }
  ]);

  const mockCategories = signal<CategoryInfo[]>([
    { id: 'cat-alimentacao', name: 'Groceries', icon: 'category-groceries', color: '#10b981' },
    { id: 'cat-transport', name: 'Transporte', icon: 'category-transport', color: '#6366f1' }
  ]);

  const mockStore = {
    budgets: mockBudgets,
    transactions: mockTransactions,
    categories: mockCategories,
    accounts: signal<Account[]>([]),
    startDate: signal('2026-07-01'),
    endDate: signal('2026-07-31')
  };

  beforeEach(() => {
    mockStore.startDate.set('2026-07-01');
    mockStore.endDate.set('2026-07-31');
    mockCategories.set([
      { id: 'cat-alimentacao', name: 'Groceries', icon: 'category-groceries', color: '#10b981' },
      { id: 'cat-transport', name: 'Transporte', icon: 'category-transport', color: '#6366f1' }
    ]);
    TestBed.configureTestingModule({
      providers: [
        BudgetSelectors,
        { provide: APP_STORE_TOKEN, useValue: mockStore },
        {
          provide: I18nService,
          useValue: {
            currentLang: signal('pt'),
            getCategoryName: (id: string) => id
          }
        }
      ]
    });
    selectors = TestBed.inject(BudgetSelectors);
  });

  it('should compute net spent correctly by offsetting debits with credits', () => {
    const progressList = selectors.budgetsProgress();

    const obrasProgress = progressList.find(p => p.budget.id === 'b-1');
    expect(obrasProgress).toBeDefined();
    expect(obrasProgress?.spent).toBe(100);
    expect(obrasProgress?.remaining).toBe(900);
    expect(obrasProgress?.percentage).toBe(10);
    expect(obrasProgress?.isOverBudget).toBe(false);
    expect(obrasProgress?.status).toBe('active');

    const alimentacaoProgress = progressList.find(p => p.budget.id === 'b-2');
    expect(alimentacaoProgress).toBeDefined();
    expect(alimentacaoProgress?.spent).toBe(100);
    expect(alimentacaoProgress?.remaining).toBe(300);
    expect(alimentacaoProgress?.percentage).toBe(25);
    expect(alimentacaoProgress?.status).toBe('active');
  });

  it('should compute expired status and correct execution results based on consumption percentage', () => {
    const progressList = selectors.budgetsProgress();

    const viagem = progressList.find(p => p.budget.id === 'b-3');
    expect(viagem).toBeDefined();
    expect(viagem?.status).toBe('expired');
    expect(viagem?.executionResult).toBe('success');

    const jantar = progressList.find(p => p.budget.id === 'b-4');
    expect(jantar).toBeDefined();
    expect(jantar?.status).toBe('expired');
    expect(jantar?.executionResult).toBe('warning');

    const carro = progressList.find(p => p.budget.id === 'b-5');
    expect(carro).toBeDefined();
    expect(carro?.status).toBe('expired');
    expect(carro?.executionResult).toBe('danger');
  });

  describe('accumulatedReserve', () => {
    beforeAll(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-30'));
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    it('should compute accumulatedReserve correctly based on months elapsed', () => {
      const testBudgets: Budget[] = [
        {
          id: 'acc-1',
          name: 'Project with monthly allocation',
          amount: 1000,
          type: 'project',
          startDate: '2026-05-15',
          monthlyAllocation: 100
        },
        {
          id: 'acc-2',
          name: 'Project with monthly allocation and expired endDate',
          amount: 1000,
          type: 'project',
          startDate: '2026-05-15',
          endDate: '2026-06-20',
          monthlyAllocation: 100
        },
        {
          id: 'acc-3',
          name: 'Project with monthly allocation and future endDate',
          amount: 1000,
          type: 'project',
          startDate: '2026-05-15',
          endDate: '2026-08-20',
          monthlyAllocation: 100
        },
        {
          id: 'acc-4',
          name: 'Project without monthly allocation',
          amount: 1000,
          type: 'project',
          startDate: '2026-05-15'
        },
        {
          id: 'acc-5',
          name: 'Project without startDate',
          amount: 1000,
          type: 'project',
          monthlyAllocation: 100
        },
        {
          id: 'acc-6',
          name: 'Category budget',
          amount: 500,
          type: 'category',
          categoryId: 'cat-test',
          startDate: '2026-05-15',
          monthlyAllocation: 100
        },
        {
          id: 'acc-7',
          name: 'Project spanning across years',
          amount: 2000,
          type: 'project',
          startDate: '2025-12-01',
          monthlyAllocation: 100
        }
      ];

      mockCategories.update(list => [...list, { id: 'cat-test', name: 'Test Category', icon: 'category-general', color: '#94a3b8' }]);
      mockBudgets.set(testBudgets);
      mockTransactions.set([]);

      const progressList = selectors.budgetsProgress();

      const p1 = progressList.find(p => p.budget.id === 'acc-1');
      expect(p1?.accumulatedReserve).toBe(300);

      const p2 = progressList.find(p => p.budget.id === 'acc-2');
      expect(p2?.accumulatedReserve).toBe(200);

      const p3 = progressList.find(p => p.budget.id === 'acc-3');
      expect(p3?.accumulatedReserve).toBe(300);

      const p4 = progressList.find(p => p.budget.id === 'acc-4');
      expect(p4?.accumulatedReserve).toBe(0);

      const p5 = progressList.find(p => p.budget.id === 'acc-5');
      expect(p5?.accumulatedReserve).toBe(100);

      const p6 = progressList.find(p => p.budget.id === 'acc-6');
      expect(p6?.accumulatedReserve).toBe(300);

      const p7 = progressList.find(p => p.budget.id === 'acc-7');
      expect(p7?.accumulatedReserve).toBe(800);
    });

    it('should calculate retainedReserve and remaining based on user reserve logic when spent is recorded', () => {
      const testBudgets: Budget[] = [
        {
          id: 'res-1',
          name: 'Disney Reserve',
          amount: 3000,
          type: 'project',
          startDate: '2026-05-15',
          monthlyAllocation: 200,
          tags: ['disney']
        },
        {
          id: 'res-2',
          name: 'Normal Project',
          amount: 7000,
          type: 'project',
          tags: ['nisa']
        }
      ];

      const testTransactions: Transaction[] = [
        {
          id: 'tx-d1',
          date: '2026-07-01',
          description: 'Voo Disney',
          amount: -2479.96,
          category: 'viagem',
          tags: ['disney']
        },
        {
          id: 'tx-n1',
          date: '2026-07-01',
          description: 'Hyundai',
          amount: -4706.39,
          category: 'carro',
          tags: ['nisa']
        }
      ];

      mockBudgets.set(testBudgets);
      mockTransactions.set(testTransactions);

      const progressList = selectors.budgetsProgress();

      const disney = progressList.find(p => p.budget.id === 'res-1');
      expect(disney).toBeDefined();
      expect(disney?.accumulatedReserve).toBe(600);
      expect(disney?.periodAllocation).toBe(200);
      expect(disney?.spent).toBe(2479.96);
      expect(disney?.remaining).toBe(520.04);
      expect(disney?.progressColor).toBe('#10b981');
      expect(disney?.isOverBudget).toBe(false);

      const normal = progressList.find(p => p.budget.id === 'res-2');
      expect(normal).toBeDefined();
      expect(normal?.accumulatedReserve).toBe(0);
      expect(normal?.periodAllocation).toBe(0);
      expect(normal?.spent).toBe(4706.39);
      expect(normal?.remaining).toBe(2293.61);
      expect(normal?.progressColor).toBe('#10b981');
      expect(normal?.isOverBudget).toBe(false);
    });
  });

  describe('walletBalance', () => {
    it('should sum each account\'s latest statement balance, or net transaction flow when no balance is reported', () => {
      mockStore.accounts.set([
        { id: 'acc_bank', kind: 'financial', name: 'Bank', type: 'bank_account', updatedAt: 0 },
        { id: 'acc_credit', kind: 'financial', name: 'Credit Card', type: 'credit_card', updatedAt: 0 }
      ] as unknown as Account[]);
      mockTransactions.set([
        { id: 't1', date: '2026-07-01', description: 'Older', amount: -50, category: 'outros', accountId: 'acc_bank', balance: 950 },
        { id: 't2', date: '2026-07-10', description: 'Newer', amount: -20, category: 'outros', accountId: 'acc_bank', balance: 930 },
        { id: 't3', date: '2026-07-05', description: 'Purchase', amount: -100, category: 'outros', accountId: 'acc_credit' },
        { id: 't4', date: '2026-07-06', description: 'Payment', amount: 40, category: 'outros', accountId: 'acc_credit' }
      ] as unknown as Transaction[]);
      mockStore.endDate.set('');

      expect(selectors.walletBalance()).toBe(870);
    });

    it('should rewind each account balance to the selected period end date', () => {
      mockStore.accounts.set([
        { id: 'acc_bank', kind: 'financial', name: 'Bank', type: 'bank_account', updatedAt: 0 }
      ] as unknown as Account[]);
      mockTransactions.set([
        { id: 't1', date: '2026-07-01', description: 'Within period', amount: -50, category: 'outros', accountId: 'acc_bank', balance: 950 },
        { id: 't2', date: '2026-08-15', description: 'After period end', amount: -30, category: 'outros', accountId: 'acc_bank', balance: 920 }
      ] as unknown as Transaction[]);
      mockStore.endDate.set('2026-07-31');

      expect(selectors.walletBalance()).toBe(950);
    });

    it('excludes investment accounts — that money is not freely spendable', () => {
      mockStore.accounts.set([
        { id: 'acc_bank', kind: 'financial', name: 'Bank', type: 'bank_account', updatedAt: 0 },
        { id: 'acc_invest', kind: 'financial', name: 'Investments', type: 'investment', updatedAt: 0, openingBalance: 5000 }
      ] as unknown as Account[]);
      mockTransactions.set([
        { id: 't1', date: '2026-07-01', description: 'Salary', amount: 1000, category: 'outros', accountId: 'acc_bank', balance: 1000 }
      ] as unknown as Transaction[]);
      mockStore.endDate.set('');

      expect(selectors.walletBalance()).toBe(1000);
    });
  });

  describe('investmentBalance', () => {
    it('sums only investment accounts, mirroring what walletBalance excludes', () => {
      mockStore.accounts.set([
        { id: 'acc_bank', kind: 'financial', name: 'Bank', type: 'bank_account', updatedAt: 0 },
        { id: 'acc_invest', kind: 'financial', name: 'Investments', type: 'investment', updatedAt: 0, openingBalance: 5000 }
      ] as unknown as Account[]);
      mockTransactions.set([
        { id: 't1', date: '2026-07-01', description: 'Salary', amount: 1000, category: 'outros', accountId: 'acc_bank', balance: 1000 }
      ] as unknown as Transaction[]);
      mockStore.endDate.set('');

      expect(selectors.investmentBalance()).toBe(5000);
    });
  });

  describe('categoryMonthlySpend / suggestedBudgetAmount', () => {
    it('sums each month\'s net spend for the category, excluding months with no activity', () => {
      mockTransactions.set([
        { id: 't1', date: '2026-05-10', description: 'a', amount: -100, category: 'Groceries' },
        { id: 't2', date: '2026-05-20', description: 'b', amount: -20, category: 'Groceries' },
        { id: 't3', date: '2026-06-05', description: 'c', amount: -150, category: 'Groceries' },
        { id: 't4', date: '2026-06-10', description: 'd', amount: -30, category: 'Housing' }
      ] as unknown as Transaction[]);

      const result = selectors.categoryMonthlySpend('Groceries');

      expect(result).toEqual([120, 150]);
    });

    it('ignores an income month for the category (net positive is not a spend)', () => {
      mockTransactions.set([
        { id: 't1', date: '2026-05-10', description: 'refund', amount: 50, category: 'Groceries' }
      ] as unknown as Transaction[]);

      expect(selectors.categoryMonthlySpend('Groceries')).toEqual([]);
    });

    it('suggestedBudgetAmount wraps categoryMonthlySpend through computeSuggestedCategoryBudget', () => {
      mockTransactions.set([
        { id: 't1', date: '2026-01-10', description: 'a', amount: -100, category: 'Groceries' },
        { id: 't2', date: '2026-02-10', description: 'b', amount: -110, category: 'Groceries' },
        { id: 't3', date: '2026-03-10', description: 'c', amount: -105, category: 'Groceries' }
      ] as unknown as Transaction[]);

      const result = selectors.suggestedBudgetAmount('Groceries');

      expect(result).toEqual({ average: 105, includedMonths: 3, excludedOutlierMonths: 0, activeMonthsCount: 3 });
    });

    it('scales category budget periodAllocation according to active filter period length', () => {
      mockBudgets.set([
        { id: 'b-cat-1', name: 'Transport', amount: 100, type: 'category', categoryId: 'cat-transport' }
      ] as unknown as Budget[]);
      mockStore.startDate.set('2026-01-01');
      mockStore.endDate.set('2026-12-31');

      const progress = selectors.categoryBudgetProgress('cat-transport');
      expect(progress?.periodAllocation).toBe(1200);
      expect(progress?.budget.amount).toBe(100);
    });

    it('categoryMonthlyBreakdown groups transactions per month, sorted chronologically, flagging the outlier month', () => {
      mockTransactions.set([
        { id: 't1', date: '2026-01-05', description: 'a', amount: -100, category: 'Groceries' },
        { id: 't2', date: '2026-02-10', description: 'b', amount: -110, category: 'Groceries' },
        { id: 't3', date: '2026-03-15', description: 'c', amount: -105, category: 'Groceries' },
        { id: 't4', date: '2026-04-01', description: 'd', amount: -500, category: 'Groceries' }
      ] as unknown as Transaction[]);

      const result = selectors.categoryMonthlyBreakdown('Groceries');

      expect(result.map(m => m.monthKey)).toEqual(['2026-01', '2026-02', '2026-03', '2026-04']);
      expect(result.map(m => m.total)).toEqual([100, 110, 105, 500]);
      expect(result.map(m => m.isOutlier)).toEqual([false, false, false, true]);
      expect(result[0].transactions.map(t => t.id)).toEqual(['t1']);
    });
  });

  describe('categoryBudgetProgress', () => {
    it('returns null when no category budget exists for the id', () => {
      mockBudgets.set([]);

      expect(selectors.categoryBudgetProgress('cat-none')).toBeNull();
    });

    it('returns the matching BudgetProgress when a category budget exists', () => {
      mockBudgets.set([
        { id: 'b-cat', name: 'Groceries', amount: 400, type: 'category', categoryId: 'cat-alimentacao' }
      ]);
      mockTransactions.set([
        { id: 't1', date: '2026-07-15', description: 'Supermercado', amount: -120, category: 'cat-alimentacao', tags: [] },
        { id: 't2', date: '2026-07-16', description: 'Refund', amount: 20, category: 'cat-alimentacao', tags: [] }
      ] as unknown as Transaction[]);

      const progress = selectors.categoryBudgetProgress('cat-alimentacao');

      expect(progress).not.toBeNull();
      expect(progress?.budget.id).toBe('b-cat');
      expect(progress?.spent).toBe(100);
      expect(progress?.remaining).toBe(300);
      expect(progress?.percentage).toBe(25);
    });

    it('returns null when only a project budget exists for that tag/id (does not cross-match by type)', () => {
      mockBudgets.set([
        { id: 'b-proj', name: 'Obras Casa', amount: 1000, type: 'project', tags: ['obras'] }
      ]);

      expect(selectors.categoryBudgetProgress('obras')).toBeNull();
    });
  });

  describe('accountPeriodMetrics', () => {
    it('should compute per-account wallet balance, period cashflow and income/expenses, scoped to that account\'s own transactions in the selected period', () => {
      mockStore.accounts.set([
        { id: 'acc_bank', kind: 'financial', name: 'Bank', type: 'bank_account', updatedAt: 0 },
        { id: 'acc_credit', kind: 'financial', name: 'Credit Card', type: 'credit_card', updatedAt: 0 }
      ] as unknown as Account[]);
      mockTransactions.set([
        { id: 't1', date: '2026-07-01', description: 'Salary', amount: 1000, category: 'outros', accountId: 'acc_bank', balance: 1000 },
        { id: 't2', date: '2026-07-10', description: 'Groceries', amount: -50, category: 'outros', accountId: 'acc_bank', balance: 950 },
        { id: 't3', date: '2026-06-15', description: 'Outside period', amount: -999, category: 'outros', accountId: 'acc_bank', balance: 1 },
        { id: 't4', date: '2026-07-05', description: 'Purchase', amount: -100, category: 'outros', accountId: 'acc_credit' },
        { id: 't5', date: '2026-07-06', description: 'Payment', amount: 40, category: 'outros', accountId: 'acc_credit' }
      ] as unknown as Transaction[]);
      mockStore.startDate.set('2026-07-01');
      mockStore.endDate.set('2026-07-31');

      const metrics = selectors.accountPeriodMetrics();

      const bank = metrics.find(m => m.account.id === 'acc_bank');
      expect(bank).toBeDefined();
      expect(bank?.walletBalance).toBe(950);
      expect(bank?.totalIncome).toBe(1000);
      expect(bank?.totalExpenses).toBe(-50);
      expect(bank?.periodCashflow).toBe(950);
      expect(bank?.periodStartDate).toBe('2026-07-01');
      expect(bank?.periodEndDate).toBe('2026-07-31');

      const credit = metrics.find(m => m.account.id === 'acc_credit');
      expect(credit).toBeDefined();
      expect(credit?.walletBalance).toBe(-60);
      expect(credit?.totalIncome).toBe(40);
      expect(credit?.totalExpenses).toBe(-100);
      expect(credit?.periodCashflow).toBe(-60);
    });

    it('should report lastUpdateDate as the account\'s true most recent transaction even when it falls outside the selected period, so a stale account is still visible', () => {
      mockStore.accounts.set([
        { id: 'acc_stale', kind: 'financial', name: 'Stale Card', type: 'credit_card', updatedAt: 0 }
      ] as unknown as Account[]);
      mockTransactions.set([
        { id: 't1', date: '2026-03-16', description: 'Last real movement', amount: -20, category: 'outros', accountId: 'acc_stale' }
      ] as unknown as Transaction[]);
      mockStore.startDate.set('2026-07-01');
      mockStore.endDate.set('2026-07-31');

      const metrics = selectors.accountPeriodMetrics();
      const stale = metrics.find(m => m.account.id === 'acc_stale');

      expect(stale?.lastUpdateDate).toBe('2026-03-16');
      expect(stale?.periodStartDate).toBe('2026-07-01');
      expect(stale?.periodEndDate).toBe('2026-07-31');
      expect(stale?.periodCashflow).toBe(0);
    });

    it('should exclude Transfers-category transactions from totalIncome/totalExpenses (internal movement, not real income/expense)', () => {
      mockStore.accounts.set([
        { id: 'acc_bank', kind: 'financial', name: 'Bank', type: 'bank_account', updatedAt: 0 }
      ] as unknown as Account[]);
      mockTransactions.set([
        { id: 't1', date: '2026-07-01', description: 'Salary', amount: 1000, category: 'outros', accountId: 'acc_bank', balance: 1000 },
        { id: 't2', date: '2026-07-10', description: 'Groceries', amount: -50, category: 'outros', accountId: 'acc_bank', balance: 950 },
        { id: 't3', date: '2026-07-12', description: 'Transfer to investment', amount: -500, category: 'Transfers', accountId: 'acc_bank', balance: 450 }
      ] as unknown as Transaction[]);
      mockStore.startDate.set('2026-07-01');
      mockStore.endDate.set('2026-07-31');

      const metrics = selectors.accountPeriodMetrics();
      const bank = metrics.find(m => m.account.id === 'acc_bank');

      expect(bank?.totalIncome).toBe(1000);
      expect(bank?.totalExpenses).toBe(-50);
    });

    it('should report an empty lastUpdateDate only when the account has no transactions at all', () => {
      mockStore.accounts.set([
        { id: 'acc_empty', kind: 'financial', name: 'Empty', type: 'bank_account', updatedAt: 0 }
      ] as unknown as Account[]);
      mockTransactions.set([]);
      mockStore.startDate.set('2026-07-01');
      mockStore.endDate.set('2026-07-31');

      const metrics = selectors.accountPeriodMetrics();
      const empty = metrics.find(m => m.account.id === 'acc_empty');
      expect(empty?.lastUpdateDate).toBe('');
      expect(empty?.periodCashflow).toBe(0);
    });
  });

  describe('accountBalances — investment accounts', () => {
    it('should value an investment account as cash plus the cost-basis of currently held positions, not just the plain transaction sum', () => {
      mockStore.accounts.set([
        { id: 'acc_invest', kind: 'financial', name: 'Broker', type: 'investment', updatedAt: 0 }
      ] as unknown as Account[]);
      mockTransactions.set([
        { id: 't1', date: '2026-01-01', description: 'Deposit', amount: 1000, category: 'outros', accountId: 'acc_invest', investmentType: 'deposit' },
        { id: 't2', date: '2026-01-02', description: 'Buy', amount: -600, category: 'outros', accountId: 'acc_invest', investmentType: 'buy', symbol: 'ABC', shares: 10 }
      ] as unknown as Transaction[]);
      mockStore.endDate.set('');

      const balances = selectors.accountBalances();
      const invest = balances.find(b => b.account.id === 'acc_invest');
      expect(invest?.balance).toBe(1000);
    });
  });

  describe('accountBalances — openingBalance', () => {
    it('should add openingBalance to the plain transaction-sum fallback, for an account whose statements never report a running balance', () => {
      mockStore.accounts.set([
        { id: 'acc_meal', kind: 'financial', name: 'Meal Card', type: 'meal_card', updatedAt: 0, openingBalance: 280.99 }
      ] as unknown as Account[]);
      mockTransactions.set([
        { id: 't1', date: '2026-01-01', description: 'Lunch', amount: -100, category: 'outros', accountId: 'acc_meal' },
        { id: 't2', date: '2026-01-02', description: 'Lunch', amount: -180.99, category: 'outros', accountId: 'acc_meal' }
      ] as unknown as Transaction[]);
      mockStore.endDate.set('');

      const balances = selectors.accountBalances();
      const meal = balances.find(b => b.account.id === 'acc_meal');
      expect(meal?.balance).toBe(0);
    });

    it('should add openingBalance to an investment account\'s cash side', () => {
      mockStore.accounts.set([
        { id: 'acc_invest', kind: 'financial', name: 'Broker', type: 'investment', updatedAt: 0, openingBalance: 50 }
      ] as unknown as Account[]);
      mockTransactions.set([
        { id: 't1', date: '2026-01-02', description: 'Buy', amount: -600, category: 'outros', accountId: 'acc_invest', investmentType: 'buy', symbol: 'ABC', shares: 10 }
      ] as unknown as Transaction[]);
      mockStore.endDate.set('');

      const balances = selectors.accountBalances();
      const invest = balances.find(b => b.account.id === 'acc_invest');
      expect(invest?.balance).toBe(50);
    });

    it('should not apply openingBalance when the account reports a real statement balance', () => {
      mockStore.accounts.set([
        { id: 'acc_bank', kind: 'financial', name: 'Bank', type: 'bank_account', updatedAt: 0, openingBalance: 1000 }
      ] as unknown as Account[]);
      mockTransactions.set([
        { id: 't1', date: '2026-01-01', description: 'Deposit', amount: 200, category: 'outros', accountId: 'acc_bank', balance: 200 }
      ] as unknown as Transaction[]);
      mockStore.endDate.set('');

      const balances = selectors.accountBalances();
      const bank = balances.find(b => b.account.id === 'acc_bank');
      expect(bank?.balance).toBe(200);
    });

    it('should return openingBalance for an account with no transactions at all', () => {
      mockStore.accounts.set([
        { id: 'acc_empty', kind: 'financial', name: 'Empty', type: 'meal_card', updatedAt: 0, openingBalance: 42 }
      ] as unknown as Account[]);
      mockTransactions.set([]);
      mockStore.endDate.set('');

      const balances = selectors.accountBalances();
      const empty = balances.find(b => b.account.id === 'acc_empty');
      expect(empty?.balance).toBe(42);
    });
  });

  describe('Reserves and Remaining calculations', () => {
    it('should calculate categoryRemainingReserve correctly', () => {
      mockBudgets.set([
        { id: 'b-cat-1', name: 'Transport', amount: 100, type: 'category', categoryId: 'cat-transport' },
        { id: 'b-cat-2', name: 'Groceries', amount: 400, type: 'category', categoryId: 'cat-alimentacao' }
      ] as unknown as Budget[]);
      mockTransactions.set([
        { id: 't1', date: '2026-07-05', description: 'Bus ticket', amount: -20, category: 'cat-transport' },
        { id: 't2', date: '2026-07-06', description: 'Supermarket', amount: -350, category: 'cat-alimentacao' }
      ] as unknown as Transaction[]);
      mockStore.startDate.set('2026-07-01');
      mockStore.endDate.set('2026-07-31');

      expect(selectors.categoryRemainingReserve()).toBe(130);
    });

    it('reserves nothing for a category the owner never budgeted, however regular its history', () => {
      mockStore.categories.set([
        { id: 'cat-transport', name: 'Transporte', icon: 'category-transport', color: '#6366f1' }
      ] as unknown as CategoryInfo[]);
      mockBudgets.set([]);
      mockTransactions.set([
        { id: 't1', date: '2026-04-05', description: 'a', amount: -100, category: 'cat-transport' },
        { id: 't2', date: '2026-05-05', description: 'b', amount: -100, category: 'cat-transport' },
        { id: 't3', date: '2026-06-05', description: 'c', amount: -100, category: 'cat-transport' },
        { id: 't4', date: '2026-07-05', description: 'd', amount: -30, category: 'cat-transport' }
      ] as unknown as Transaction[]);
      mockStore.startDate.set('2026-07-01');
      mockStore.endDate.set('2026-07-31');

      expect(selectors.categoryRemainingReserve()).toBe(0);
    });

    it('should use the user-configured budget instead of the assistant suggestion once one is set for that category', () => {
      mockStore.categories.set([
        { id: 'cat-transport', name: 'Transporte', icon: 'category-transport', color: '#6366f1' }
      ] as unknown as CategoryInfo[]);
      mockBudgets.set([
        { id: 'b-cat-transport', name: 'Transport', amount: 50, type: 'category', categoryId: 'cat-transport' }
      ] as unknown as Budget[]);
      mockTransactions.set([
        { id: 't1', date: '2026-04-05', description: 'a', amount: -100, category: 'cat-transport' },
        { id: 't2', date: '2026-05-05', description: 'b', amount: -100, category: 'cat-transport' },
        { id: 't3', date: '2026-06-05', description: 'c', amount: -100, category: 'cat-transport' },
        { id: 't4', date: '2026-07-05', description: 'd', amount: -30, category: 'cat-transport' }
      ] as unknown as Transaction[]);
      mockStore.startDate.set('2026-07-01');
      mockStore.endDate.set('2026-07-31');

      expect(selectors.categoryRemainingReserve()).toBe(20);
    });

    it('should reserve the sum of targets minus the sum of executed across categories, not the sum of each category floored at zero individually', () => {
      mockStore.categories.set([
        { id: 'cat-transport', name: 'Transporte', icon: 'category-transport', color: '#6366f1' },
        { id: 'cat-alimentacao', name: 'Groceries', icon: 'category-groceries', color: '#10b981' }
      ] as unknown as CategoryInfo[]);
      mockBudgets.set([
        { id: 'b-cat-transport', name: 'Transport', amount: 100, type: 'category', categoryId: 'cat-transport' },
        { id: 'b-cat-alimentacao', name: 'Groceries', amount: 200, type: 'category', categoryId: 'cat-alimentacao' }
      ] as unknown as Budget[]);
      mockTransactions.set([
        { id: 't1', date: '2026-07-05', description: 'Overspent transport', amount: -150, category: 'cat-transport' },
        { id: 't2', date: '2026-07-06', description: 'Groceries', amount: -50, category: 'cat-alimentacao' }
      ] as unknown as Transaction[]);
      mockStore.startDate.set('2026-07-01');
      mockStore.endDate.set('2026-07-31');

      expect(selectors.categoryRemainingReserve()).toBe(100);
    });

    it('should include an unbudgeted category with a meaningful historical suggestion even when it has zero spend in the current period', () => {
      mockStore.categories.set([
        { id: 'cat-books', name: 'Livros', icon: 'category-education', color: '#f59e0b' }
      ] as unknown as CategoryInfo[]);
      mockBudgets.set([]);
      mockTransactions.set([
        { id: 't1', date: '2026-04-05', description: 'a', amount: -20, category: 'cat-books' },
        { id: 't2', date: '2026-05-05', description: 'b', amount: -20, category: 'cat-books' },
        { id: 't3', date: '2026-06-05', description: 'c', amount: -20, category: 'cat-books' }
      ] as unknown as Transaction[]);
      mockStore.startDate.set('2026-07-01');
      mockStore.endDate.set('2026-07-31');

      const items = selectors.allCategoryExecutionsForPeriod();
      expect(items.some(i => i.budget.categoryId === 'cat-books')).toBe(true);
      expect(items.find(i => i.budget.categoryId === 'cat-books')?.spent).toBe(0);
    });

    it('should go negative when the aggregate spent exceeds the aggregate target, to keep Balance Livre Real additive and visible', () => {
      mockStore.categories.set([
        { id: 'cat-transport', name: 'Transporte', icon: 'category-transport', color: '#6366f1' },
        { id: 'cat-alimentacao', name: 'Groceries', icon: 'category-groceries', color: '#10b981' }
      ] as unknown as CategoryInfo[]);
      mockBudgets.set([
        { id: 'b-cat-transport', name: 'Transport', amount: 100, type: 'category', categoryId: 'cat-transport' },
        { id: 'b-cat-alimentacao', name: 'Groceries', amount: 200, type: 'category', categoryId: 'cat-alimentacao' }
      ] as unknown as Budget[]);
      mockTransactions.set([
        { id: 't1', date: '2026-07-05', description: 'Overspent transport', amount: -350, category: 'cat-transport' },
        { id: 't2', date: '2026-07-06', description: 'Groceries', amount: -50, category: 'cat-alimentacao' }
      ] as unknown as Transaction[]);
      mockStore.startDate.set('2026-07-01');
      mockStore.endDate.set('2026-07-31');

      expect(selectors.categoryRemainingReserve()).toBe(-100);
    });

    it('should report the overspend total as the sum of each category excess, ignoring categories still under budget', () => {
      mockStore.categories.set([
        { id: 'cat-transport', name: 'Transporte', icon: 'category-transport', color: '#6366f1' },
        { id: 'cat-alimentacao', name: 'Groceries', icon: 'category-groceries', color: '#10b981' }
      ] as unknown as CategoryInfo[]);
      mockBudgets.set([
        { id: 'b-cat-transport', name: 'Transport', amount: 100, type: 'category', categoryId: 'cat-transport' },
        { id: 'b-cat-alimentacao', name: 'Groceries', amount: 200, type: 'category', categoryId: 'cat-alimentacao' }
      ] as unknown as Budget[]);
      mockTransactions.set([
        { id: 't1', date: '2026-07-05', description: 'Overspent transport', amount: -150, category: 'cat-transport' },
        { id: 't2', date: '2026-07-06', description: 'Groceries', amount: -50, category: 'cat-alimentacao' }
      ] as unknown as Transaction[]);
      mockStore.startDate.set('2026-07-01');
      mockStore.endDate.set('2026-07-31');

      expect(selectors.categoryOverspendTotal()).toBe(50);
    });

    it('should report zero overspend when every category is still within budget', () => {
      mockBudgets.set([
        { id: 'b-cat-1', name: 'Transport', amount: 100, type: 'category', categoryId: 'cat-transport' }
      ] as unknown as Budget[]);
      mockTransactions.set([
        { id: 't1', date: '2026-07-05', description: 'Bus ticket', amount: -20, category: 'cat-transport' }
      ] as unknown as Transaction[]);
      mockStore.startDate.set('2026-07-01');
      mockStore.endDate.set('2026-07-31');

      expect(selectors.categoryOverspendTotal()).toBe(0);
    });

    it('should leave the free balance untouched by an overspend, since the extra spend leaves the wallet and frees the same amount of budget', () => {
      const budgets = [
        { id: 'b-cat-transport', name: 'Transport', amount: 100, type: 'category', categoryId: 'cat-transport' },
        { id: 'b-cat-alimentacao', name: 'Groceries', amount: 200, type: 'category', categoryId: 'cat-alimentacao' }
      ];
      mockStore.categories.set([
        { id: 'cat-transport', name: 'Transporte', icon: 'category-transport', color: '#6366f1' },
        { id: 'cat-alimentacao', name: 'Groceries', icon: 'category-groceries', color: '#10b981' }
      ] as unknown as CategoryInfo[]);
      mockStore.accounts.set([
        { id: 'acc-1', kind: 'financial', name: 'Account', type: 'bank_account', updatedAt: 0, openingBalance: 1200 }
      ] as unknown as Account[]);
      mockStore.startDate.set('2026-07-01');
      mockStore.endDate.set('2026-07-31');
      mockBudgets.set(budgets as unknown as Budget[]);

      const freeBalance = () => selectors.walletBalance() - selectors.activeProjectReserve() - selectors.categoryRemainingReserve();

      mockTransactions.set([
        { id: 't1', date: '2026-07-05', description: 'Transport', amount: -100, accountId: 'acc-1', category: 'cat-transport' },
        { id: 't2', date: '2026-07-06', description: 'Groceries', amount: -50, accountId: 'acc-1', category: 'cat-alimentacao' }
      ] as unknown as Transaction[]);
      const withoutOverspend = freeBalance();

      mockTransactions.set([
        { id: 't1', date: '2026-07-05', description: 'Transport', amount: -150, accountId: 'acc-1', category: 'cat-transport' },
        { id: 't2', date: '2026-07-06', description: 'Groceries', amount: -50, accountId: 'acc-1', category: 'cat-alimentacao' }
      ] as unknown as Transaction[]);

      expect(freeBalance()).toBe(withoutOverspend);
      expect(selectors.categoryOverspendTotal()).toBe(50);
    });

    it('should keep the free balance stable while spending stays inside the category budget, and drop it by the excess once the budget is exceeded', () => {
      mockStore.categories.set([FREE_BALANCE_CATEGORY]);
      mockStore.accounts.set([FREE_BALANCE_ACCOUNT]);
      mockStore.startDate.set('2026-07-01');
      mockStore.endDate.set('2026-07-31');
      mockBudgets.set([FREE_BALANCE_CATEGORY_BUDGET]);

      mockTransactions.set([]);
      const untouched = selectors.freeBalance();
      expect(untouched).toBe(800);

      mockTransactions.set([createCategorySpendTransaction(150)]);
      expect(selectors.freeBalance()).toBe(untouched);

      mockTransactions.set([createCategorySpendTransaction(250)]);
      expect(selectors.freeBalance()).toBe(untouched - 50);
      expect(selectors.categoryOverspendTotal()).toBe(50);
    });

    it('should calculate activeProjectReserve correctly based on monthlyAllocation and spent', () => {
      mockBudgets.set([
        { id: 'b-proj-1', name: 'Obras Casa', amount: 1000, type: 'project', tags: ['obras'], monthlyAllocation: 100, startDate: '2026-07-01', kind: 'works' }
      ] as unknown as Budget[]);
      mockTransactions.set([
        { id: 't1', date: '2026-07-05', description: 'Paint', amount: -40, category: 'outros', tags: ['obras'] }
      ] as unknown as Transaction[]);
      mockStore.startDate.set('2026-07-01');
      mockStore.endDate.set('2026-07-31');

      expect(selectors.activeProjectReserve()).toBe(60);
    });

    it('should exclude a category budget whose category is investment-only (accountTypes includes investment) from every progress list', () => {
      mockStore.categories.set([
        { id: 'Investments', name: 'Investments & Savings', icon: 'category-investments', color: '#4f46e5', accountTypes: ['investment'] }
      ] as unknown as CategoryInfo[]);
      mockBudgets.set([
        { id: 'b-invest', name: 'Investments', amount: 1000, type: 'category', categoryId: 'Investments' }
      ] as unknown as Budget[]);
      mockTransactions.set([]);
      mockStore.startDate.set('2026-07-01');
      mockStore.endDate.set('2026-07-31');

      expect(selectors.categoryBudgetsProgress().some(p => p.budget.id === 'b-invest')).toBe(false);
      expect(selectors.categoryBudgetProgress('Investments')).toBeNull();
      expect(selectors.categoryRemainingReserve()).toBe(0);
    });

    it('should exclude a Transfers category budget even when no matching category entity exists', () => {
      mockStore.categories.set([]);
      mockBudgets.set([
        { id: 'b-transfers', name: 'Transfers', amount: 1000, type: 'category', categoryId: 'Transfers' }
      ] as unknown as Budget[]);
      mockTransactions.set([]);
      mockStore.startDate.set('2026-07-01');
      mockStore.endDate.set('2026-07-31');

      expect(selectors.categoryBudgetsProgress().some(p => p.budget.id === 'b-transfers')).toBe(false);
    });

    it('should exclude a category budget on the legacy AssetPurchase id, even though it no longer exists in the taxonomy', () => {
      mockStore.categories.set([]);
      mockBudgets.set([
        { id: 'b-orphan', name: 'Compra de Ativos', amount: 1401, type: 'category', categoryId: 'AssetPurchase' }
      ] as unknown as Budget[]);
      mockTransactions.set([]);
      mockStore.startDate.set('2026-07-01');
      mockStore.endDate.set('2026-07-31');

      expect(selectors.categoryBudgetsProgress().some(p => p.budget.id === 'b-orphan')).toBe(false);
    });

    it('should keep a category budget whose category is genuinely unresolved but not on the legacy/investment list (avoids hiding real budgets)', () => {
      mockStore.categories.set([]);
      mockBudgets.set([
        { id: 'b-custom', name: 'Assinaturas', amount: 50, type: 'category', categoryId: 'cat-subscriptions' }
      ] as unknown as Budget[]);
      mockTransactions.set([]);
      mockStore.startDate.set('2026-07-01');
      mockStore.endDate.set('2026-07-31');

      expect(selectors.categoryBudgetsProgress().some(p => p.budget.id === 'b-custom')).toBe(true);
    });
  });

  describe('Project spent calculation with manual association', () => {
    it('should include manually associated transactions even if their date is outside the project date limits for non-vacation projects', () => {
      mockBudgets.set([
        {
          id: 'b-proj-manual',
          name: 'Non-vacation project',
          amount: 500,
          type: 'project',
          startDate: '2026-07-10',
          endDate: '2026-07-20',
          kind: 'other'
        }
      ] as unknown as Budget[]);
      mockTransactions.set([
        {
          id: 't-manual-out',
          date: '2026-07-05',
          description: 'Associated manually',
          amount: -120,
          category: 'outros',
          budgetId: 'b-proj-manual'
        }
      ] as unknown as Transaction[]);
      mockStore.startDate.set('2026-07-01');
      mockStore.endDate.set('2026-07-31');

      const progressList = selectors.budgetsProgress();
      const projectProgress = progressList.find(p => p.budget.id === 'b-proj-manual');
      expect(projectProgress).toBeDefined();
      expect(projectProgress?.spent).toBe(120);
    });
  });
});
