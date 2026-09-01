import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PortfolioComponent } from './portfolio';
import { APP_STORE_TOKEN } from '@application/app-store';
import { createMockStore } from '@/mocks/store.mock';
import { BudgetSelectors } from '@application/selectors/budget.selectors';
import { PortfolioSelectors } from '@application/selectors/portfolio.selectors';
import { I18nService } from '@application/i18n.service';
import { I18nService as UiI18nService } from '@ui/shared/i18n-shared';
import { signal } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { MOCK_BUDGETS, MOCK_METRICS } from '@/mocks/index';
import { provideAppI18n } from '@application/i18n.service';

describe('PortfolioComponent', () => {
  let component: PortfolioComponent;
  let fixture: ComponentFixture<PortfolioComponent>;
  const walletBalanceSignal = signal(MOCK_METRICS.totalConsolidatedBalance);
  const activeProjectReserveSignal = signal(1000);
  const categoryRemainingReserveSignal = signal(500);
  const investedValueSignal = signal(3446.96);
  const totalPatrimonySignal = signal(52206.78);
  const realizedResultSignal = signal(4.06);

  beforeEach(async () => {
    walletBalanceSignal.set(MOCK_METRICS.totalConsolidatedBalance);
    activeProjectReserveSignal.set(1000);
    categoryRemainingReserveSignal.set(500);
    investedValueSignal.set(3446.96);
    totalPatrimonySignal.set(52206.78);
    realizedResultSignal.set(4.06);

    const mockStore = createMockStore();

    await TestBed.configureTestingModule({
      imports: [PortfolioComponent],
      providers: [
        ...provideAppI18n(),
        { provide: APP_STORE_TOKEN, useValue: mockStore },
        {
          provide: BudgetSelectors,
          useValue: {
            budgetsProgressForPeriod: signal(MOCK_BUDGETS.map(b => ({
              budget: b,
              spent: 150,
              percentage: 30,
              remaining: 350,
              isOverBudget: false,
              status: 'active' as const,
              accumulatedReserve: 500,
              periodAllocation: 500,
              progressColor: '#10b981'
            }))),
            budgetsProgress: signal([]),
            walletBalance: walletBalanceSignal,
            accountBalances: signal([]),
            investmentBalance: signal(0),
            freeBalance: signal(0),
            categoryBudgetProgress: () => signal(null),
            categoryProgress: (id: string, amount: number) => ({
              budget: { id, name: id, type: 'category', categoryId: id, amount } as any,
              spent: 100,
              percentage: 20,
              remaining: amount - 100,
              isOverBudget: false,
              status: 'active' as const,
              accumulatedReserve: 500,
              periodAllocation: amount,
              progressColor: '#10b981'
            }),
            suggestedBudgetAmount: () => signal(null),
            categoryRemainingReserve: categoryRemainingReserveSignal,
            categoryOverspendTotal: signal(0),
            activeProjectReserve: activeProjectReserveSignal,
            allCategoryExecutionsForPeriod: signal([])
          }
        },
        {
          provide: PortfolioSelectors,
          useValue: {
            investedValue: investedValueSignal,
            assetsValue: signal(0),
            totalPatrimony: totalPatrimonySignal,
            realizedResult: realizedResultSignal,
            wallets: signal([]),
            assetWallets: signal([]),
            assetBalanceHistory: signal([]),
            heldWallets: signal([]),
            executedWallets: signal([])
          }
        },
        { provide: I18nService, useValue: { currentLang: signal('en'), onLangChange: signal('en'), translate: (k: string) => k, getCategoryName: (k: string) => k, formatCurrency: (v: number) => v.toString() } },
        { provide: UiI18nService, useValue: { currentLang: signal('en'), onLangChange: signal('en'), translate: (k: string) => k, getCategoryName: (k: string) => k, formatCurrency: (v: number) => v.toString() } },
        { provide: Dialog, useValue: { open: () => {} } },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: Router, useValue: { navigate: vi.fn() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PortfolioComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('leads with the net worth instead of a budget balance', () => {
    expect(component['totalPatrimony']()).toBe(52206.78);
    expect(fixture.nativeElement.querySelector('.m-balance-summary-card__value').textContent).toContain('52206.78');
  });

  it('reports the invested value and the realised result', () => {
    expect(component['investedValue']()).toBe(3446.96);
    expect(component['realizedResult']()).toBe(4.06);
  });

  it('never shows budget reserve rows on the carteira page', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('budgetLabelReservedProjects');
    expect(text).not.toContain('budgetLabelReservedCategories');
  });
});
