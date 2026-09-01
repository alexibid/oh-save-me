import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AllocationsDashboard } from './allocations-dashboard';
import { APP_STORE_TOKEN } from '@application/app-store';
import { createMockStore } from '@/mocks/store.mock';
import { BudgetSelectors } from '@application/selectors/budget.selectors';
import { I18nService } from '@application/i18n.service';
import { I18nService as UiI18nService } from '@ui/shared/i18n-shared';
import { signal } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';

describe('AllocationsDashboard', () => {
  let component: AllocationsDashboard;
  let fixture: ComponentFixture<AllocationsDashboard>;

  beforeEach(async () => {
    const mockStore = createMockStore();

    await TestBed.configureTestingModule({
      imports: [AllocationsDashboard],
      providers: [
        { provide: APP_STORE_TOKEN, useValue: mockStore },
        { provide: BudgetSelectors, useValue: { budgetsProgressForPeriod: signal([]), budgetsProgress: signal([]), walletBalance: signal(0),
            investmentBalance: signal(0),
            freeBalance: signal(0), categoryBudgetProgress: () => signal(null), suggestedBudgetAmount: () => signal(null), categoryRemainingReserve: signal(0), activeProjectReserve: signal(0) } },
        { provide: I18nService, useValue: { currentLang: signal('en'), onLangChange: signal('en'), translate: (k: string) => k, getCategoryName: (k: string) => k, formatCurrency: (v: number) => v.toString() } },
        { provide: UiI18nService, useValue: { currentLang: signal('en'), onLangChange: signal('en'), translate: (k: string) => k, getCategoryName: (k: string) => k, formatCurrency: (v: number) => v.toString() } },
        { provide: Dialog, useValue: { open: () => {} } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AllocationsDashboard);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
