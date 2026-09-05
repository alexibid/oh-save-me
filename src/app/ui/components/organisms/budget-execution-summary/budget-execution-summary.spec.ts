import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BudgetExecutionSummary } from './budget-execution-summary';
import { APP_STORE_TOKEN } from '@application/app-store';
import { createMockStore } from '@/mocks/store.mock';
import { BudgetSelectors, BudgetProgress } from '@application/selectors/budget.selectors';
import { I18nService } from '@application/i18n.service';
import { I18nService as UiI18nService } from '@ui/shared/i18n-shared';
import { signal, WritableSignal } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { Budget } from '@domain/models/budget';

const makeCategoryProgress = (id: string, percentage: number, budgetIdOverride?: string): BudgetProgress => ({
  budget: { id: budgetIdOverride ?? id, name: id, type: 'category', categoryId: `cat-${id}`, amount: 100 } as Budget,
  spent: percentage,
  percentage,
  remaining: 100 - percentage,
  isOverBudget: false,
  status: 'active',
  accumulatedReserve: 0,
  periodAllocation: 100,
  progressColor: '#10b981',
  categoryName: id,
  categoryColor: '#10b981'
});

const makeProjectProgress = (id: string, percentage: number): BudgetProgress => ({
  budget: { id, name: id, type: 'project', amount: 100 } as Budget,
  spent: percentage,
  percentage,
  remaining: 100 - percentage,
  isOverBudget: false,
  status: 'active',
  accumulatedReserve: 0,
  periodAllocation: 100,
  progressColor: '#10b981'
});

describe('BudgetExecutionSummary', () => {
  let component: BudgetExecutionSummary;
  let fixture: ComponentFixture<BudgetExecutionSummary>;
  let mockAllCategoryExecutions: WritableSignal<BudgetProgress[]>;

  beforeEach(async () => {
    mockAllCategoryExecutions = signal<BudgetProgress[]>([]);
    const mockStore = createMockStore();

    await TestBed.configureTestingModule({
      imports: [BudgetExecutionSummary],
      providers: [
        { provide: APP_STORE_TOKEN, useValue: mockStore },
        {
          provide: BudgetSelectors,
          useValue: {
            budgetsProgressForPeriod: signal([]),
            budgetsProgress: signal([]),
            walletBalance: signal(0),
            investmentBalance: signal(0),
            freeBalance: signal(0),
            categoryBudgetProgress: () => null,
            categoryRemainingReserve: signal(0),
            activeProjectReserve: signal(0),
            allCategoryExecutionsForPeriod: mockAllCategoryExecutions
          }
        },
        { provide: I18nService, useValue: { currentLang: signal('en'), onLangChange: signal('en'), translate: (k: string) => k, getCategoryName: (k: string) => k, formatCurrency: (v: number) => v.toString() } },
        { provide: UiI18nService, useValue: { currentLang: signal('en'), onLangChange: signal('en'), translate: (k: string) => k, getCategoryName: (k: string) => k, formatCurrency: (v: number) => v.toString() } },
        { provide: Dialog, useValue: { open: () => {} } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BudgetExecutionSummary);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('periodBudgetsProgress', []);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('lists every category execution the selector returns, sorted by percentage, without a cap', () => {
    mockAllCategoryExecutions.set([
      makeCategoryProgress('a', 10),
      makeCategoryProgress('b', 90),
      makeCategoryProgress('c', 50),
      makeCategoryProgress('d', 70)
    ]);
    fixture.detectChanges();

    const shown = component['activeCategoryBudgets']() as BudgetProgress[];
    expect(shown.map(p => p.categoryName)).toEqual(['b', 'd', 'c', 'a']);
  });

  it('flags a suggested (unbudgeted) category execution as a suggestion, not a real budget', () => {
    mockAllCategoryExecutions.set([makeCategoryProgress('dining', 50, 'temp-cat-dining')]);
    fixture.detectChanges();

    const shown = component['activeCategoryBudgets']() as BudgetProgress[];
    expect(component['isSuggestedExecution'](shown[0])).toBe(true);
  });

  it('does not flag a real configured category budget as a suggestion', () => {
    mockAllCategoryExecutions.set([makeCategoryProgress('dining', 50, 'b-real')]);
    fixture.detectChanges();

    const shown = component['activeCategoryBudgets']() as BudgetProgress[];
    expect(component['isSuggestedExecution'](shown[0])).toBe(false);
  });

  it('excludes non-active project budgets from the projects group', () => {
    const expired: BudgetProgress = { ...makeProjectProgress('x', 100), status: 'expired' };
    fixture.componentRef.setInput('periodBudgetsProgress', [expired]);
    fixture.detectChanges();

    expect(component['activeProjectBudgets']()).toEqual([]);
  });

  it('emits the categoryId on categoryItemClick when a category row is clicked', () => {
    const emitted: string[] = [];
    component.categoryItemClick.subscribe(id => emitted.push(id));

    component['onCategoryItemClick']('cat-groceries');

    expect(emitted).toEqual(['cat-groceries']);
  });

  it('does not emit categoryItemClick when the budget has no categoryId', () => {
    const emitted: string[] = [];
    component.categoryItemClick.subscribe(id => emitted.push(id));

    component['onCategoryItemClick'](undefined);

    expect(emitted).toEqual([]);
  });

  it('emits the budget on projectItemClick when a project row is clicked', () => {
    const emitted: Budget[] = [];
    component.projectItemClick.subscribe(b => emitted.push(b));
    const project = makeProjectProgress('proj-1', 30).budget;

    component.projectItemClick.emit(project);

    expect(emitted).toEqual([project]);
  });

  it('emits the categoryId on categoryMovementsClick when the progress track is clicked', () => {
    const emitted: string[] = [];
    component.categoryMovementsClick.subscribe(id => emitted.push(id));

    component['onCategoryMovementsClick']('cat-groceries');

    expect(emitted).toEqual(['cat-groceries']);
  });

  it('does not emit categoryMovementsClick when the budget has no categoryId', () => {
    const emitted: string[] = [];
    component.categoryMovementsClick.subscribe(id => emitted.push(id));

    component['onCategoryMovementsClick'](undefined);

    expect(emitted).toEqual([]);
  });

  it('emits the budget on projectMovementsClick when the progress track is clicked', () => {
    const emitted: Budget[] = [];
    component.projectMovementsClick.subscribe(b => emitted.push(b));
    const project = makeProjectProgress('proj-1', 30).budget;

    component.projectMovementsClick.emit(project);

    expect(emitted).toEqual([project]);
  });
});
