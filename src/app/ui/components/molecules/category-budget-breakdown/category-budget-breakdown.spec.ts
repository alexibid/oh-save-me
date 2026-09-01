import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CategoryBudgetBreakdownComponent } from './category-budget-breakdown';
import { BudgetSelectors } from '@application/selectors/budget.selectors';

import { provideAppStore } from '@application/app-store.service';

describe('CategoryBudgetBreakdownComponent', () => {
  let component: CategoryBudgetBreakdownComponent;
  let fixture: ComponentFixture<CategoryBudgetBreakdownComponent>;

  const mockBudgetSelectors = {
    categoryMonthlyBreakdown: vi.fn().mockReturnValue([
      { monthKey: '2026-01', total: 100, isOutlier: false, transactions: [{ id: 't1' }] },
      { monthKey: '2026-02', total: 500, isOutlier: true, transactions: [{ id: 't2' }] }
    ])
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryBudgetBreakdownComponent],
      providers: [
        provideAppStore(),
        { provide: BudgetSelectors, useValue: mockBudgetSelectors }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryBudgetBreakdownComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('categoryId', 'Groceries');
    fixture.componentRef.setInput('categoryName', 'Groceries');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exposes the monthly breakdown for the given category', () => {
    expect(component['breakdown']()).toEqual([
      { monthKey: '2026-01', total: 100, isOutlier: false, transactions: [{ id: 't1' }] },
      { monthKey: '2026-02', total: 500, isOutlier: true, transactions: [{ id: 't2' }] }
    ]);
  });

  it('defaults each month\'s inclusion to the automatic outlier classification', () => {
    expect(component['isIncluded']('2026-01')).toBe(true);
    expect(component['isIncluded']('2026-02')).toBe(false);
  });

  it('computes the live suggestion from the currently-included months only', () => {
    expect(component['liveSuggestion']()).toEqual({ average: 100, includedMonths: 1, excludedOutlierMonths: 1 });
  });

  it('lets the user override a month\'s inclusion, recomputing the live suggestion', () => {
    component['toggleInclusion']('2026-02', new Event('click'));

    expect(component['isIncluded']('2026-02')).toBe(true);
    expect(component['liveSuggestion']()).toEqual({ average: 300, includedMonths: 2, excludedOutlierMonths: 0 });
  });

  it('toggling twice returns a month to its automatic classification result', () => {
    component['toggleInclusion']('2026-01', new Event('click'));
    component['toggleInclusion']('2026-01', new Event('click'));

    expect(component['isIncluded']('2026-01')).toBe(true);
  });

  it('emits suggestionChange whenever the live suggestion changes', () => {
    const emitted: unknown[] = [];
    component.suggestionChange.subscribe(value => emitted.push(value));

    component['toggleInclusion']('2026-02', new Event('click'));
    fixture.detectChanges();

    expect(emitted.at(-1)).toEqual({ average: 300, includedMonths: 2, excludedOutlierMonths: 0 });
  });

  it('toggles a month expanded/collapsed', () => {
    expect(component['isExpanded']('2026-01')).toBe(false);

    component['toggleMonth']('2026-01');
    expect(component['isExpanded']('2026-01')).toBe(true);

    component['toggleMonth']('2026-01');
    expect(component['isExpanded']('2026-01')).toBe(false);
  });

  it('collapses one month when a different one is expanded (single-expand)', () => {
    component['toggleMonth']('2026-01');
    component['toggleMonth']('2026-02');

    expect(component['isExpanded']('2026-01')).toBe(false);
    expect(component['isExpanded']('2026-02')).toBe(true);
  });

  it('formats a YYYY-MM key into a human month label', () => {
    expect(component['formatMonthLabel']('2026-01')).toMatch(/janeiro/i);
  });
});
