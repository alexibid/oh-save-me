import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BudgetComponent } from './budget';
import { APP_STORE_TOKEN } from '@application/app-store';
import { createMockStore } from '@/mocks/store.mock';
import { BudgetSelectors } from '@application/selectors/budget.selectors';
import { I18nService } from '@application/i18n.service';
import { I18nService as UiI18nService } from '@ui/shared/i18n-shared';
import { computed, signal } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { MOCK_BUDGETS, MOCK_METRICS } from '@/mocks/index';
import { createMockBudgetProgress, createMockCategoryBudgetProgress } from '@/mocks/budget-progress.mock';

describe('BudgetComponent', () => {
  let component: BudgetComponent;
  let fixture: ComponentFixture<BudgetComponent>;
  const walletBalanceSignal = signal(MOCK_METRICS.totalConsolidatedBalance);
  const activeProjectReserveSignal = signal(1000);
  const categoryRemainingReserveSignal = signal(500);

  beforeEach(async () => {
    walletBalanceSignal.set(MOCK_METRICS.totalConsolidatedBalance);
    activeProjectReserveSignal.set(1000);
    categoryRemainingReserveSignal.set(500);

    const mockStore = createMockStore();

    await TestBed.configureTestingModule({
      imports: [BudgetComponent],
      providers: [
        { provide: APP_STORE_TOKEN, useValue: mockStore },
        {
          provide: BudgetSelectors,
          useValue: {
            budgetsProgressForPeriod: signal(MOCK_BUDGETS.map(b => createMockBudgetProgress(b))),
            budgetsProgress: signal([]),
            walletBalance: walletBalanceSignal,
            accountBalances: signal([]),
            investmentBalance: signal(0),
            categoryBudgetProgress: () => signal(null),
            categoryProgress: (id: string, amount: number) => createMockCategoryBudgetProgress(id, amount),
            suggestedBudgetAmount: () => signal(null),
            categoryRemainingReserve: categoryRemainingReserveSignal,
            categoryBudgetedTotal: () => 750,
            freeBalance: computed(() =>
              walletBalanceSignal() - activeProjectReserveSignal() - categoryRemainingReserveSignal()
            ),
            categoryOverspendTotal: signal(0),
            categorySpentWithinBudget: signal(0),
            categoryCommittedRemaining: categoryRemainingReserveSignal,
            activeProjectReserve: activeProjectReserveSignal,
            allCategoryExecutionsForPeriod: signal([])
          }
        },
        { provide: I18nService, useValue: { currentLang: signal('en'), onLangChange: signal('en'), translate: (k: string) => k, getCategoryName: (k: string) => k, formatCurrency: (v: number) => v.toString() } },
        { provide: UiI18nService, useValue: { currentLang: signal('en'), onLangChange: signal('en'), translate: (k: string) => k, getCategoryName: (k: string) => k, formatCurrency: (v: number) => v.toString() } },
        { provide: Dialog, useValue: { open: () => {} } },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: Router, useValue: { navigate: vi.fn() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BudgetComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the free balance the selector computes, without re-deriving it', () => {
    walletBalanceSignal.set(1500);
    activeProjectReserveSignal.set(0);
    categoryRemainingReserveSignal.set(0);
    fixture.detectChanges();
    expect(component['freeBalance']()).toBe(1500);

    walletBalanceSignal.set(1500);
    activeProjectReserveSignal.set(400);
    categoryRemainingReserveSignal.set(200);
    fixture.detectChanges();
    expect(component['freeBalance']()).toBe(900);

    walletBalanceSignal.set(300);
    activeProjectReserveSignal.set(400);
    categoryRemainingReserveSignal.set(100);
    fixture.detectChanges();
    expect(component['freeBalance']()).toBe(-200);
  });
});
