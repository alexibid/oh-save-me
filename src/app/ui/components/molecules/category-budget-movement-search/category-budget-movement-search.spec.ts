import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { CategoryBudgetMovementSearchComponent } from './category-budget-movement-search';
import { APP_STORE_TOKEN } from '@application/app-store';
import { TransactionsTableComponent } from '@ui/components/organisms/transactions-table/transactions-table';

describe('CategoryBudgetMovementSearchComponent', () => {
  let fixture: ComponentFixture<CategoryBudgetMovementSearchComponent>;
  let component: CategoryBudgetMovementSearchComponent;
  let mockStore: {
    transactions: ReturnType<typeof signal>;
    categories: ReturnType<typeof signal>;
    applyTransactionCategories: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockStore = {
      transactions: signal([
        { id: 't1', date: '2026-01-10', description: 'Continente Almada', amount: -20, category: 'Others' },
        { id: 't2', date: '2026-02-10', description: 'Continente Amadora', amount: -30, category: 'Others' },
        { id: 't3', date: '2026-02-15', description: 'Farmacia Central', amount: -10, category: 'Health' },
        { id: 't4', date: '2026-03-10', description: 'Continente Cascais', amount: -15, category: 'Groceries' }
      ]),
      categories: signal([
        { id: 'Others', name: 'Others', icon: 'label', color: '#000', enabled: true },
        { id: 'Health', name: 'Health', icon: 'label', color: '#000', enabled: true },
        { id: 'Groceries', name: 'Groceries', icon: 'label', color: '#000', enabled: true }
      ]),
      applyTransactionCategories: vi.fn().mockResolvedValue(undefined)
    };

    await TestBed.configureTestingModule({
      imports: [CategoryBudgetMovementSearchComponent],
      providers: [{ provide: APP_STORE_TOKEN, useValue: mockStore }]
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryBudgetMovementSearchComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('categoryId', 'Groceries');
    fixture.detectChanges();
  });

  it('shows no results while the search box is empty', () => {
    expect(component['searchResults']()).toEqual([]);
  });

  it('matches transactions across the whole store by description, case-insensitively', () => {
    component['searchQuery'].set('continente');
    fixture.detectChanges();

    const ids = component['searchResults']().map(t => t.id);
    expect(ids).toContain('t1');
    expect(ids).toContain('t2');
    expect(ids).not.toContain('t3');
  });

  it('excludes transactions already in the target category — they already show in the breakdown above', () => {
    component['searchQuery'].set('continente');
    fixture.detectChanges();

    const ids = component['searchResults']().map(t => t.id);
    expect(ids).not.toContain('t4');
  });

  it('renders a transactions table with the matches once there is a query', () => {
    component['searchQuery'].set('continente');
    fixture.detectChanges();

    const table = fixture.debugElement.query(By.directive(TransactionsTableComponent));
    expect(table).toBeTruthy();
    expect(table.componentInstance.transactions.length).toBe(2);
  });

  it('shows the empty-results copy when nothing matches', () => {
    component['searchQuery'].set('nonexistent-merchant');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nenhum movimento encontrado');
  });

  it('persists the whole recategorized batch through the store in one call', async () => {
    component['searchQuery'].set('continente');
    fixture.detectChanges();

    const updated = { id: 't1', date: '2026-01-10', description: 'Continente Almada', amount: -20, category: 'Groceries' };
    await component['onCategoryApplied']({ updatedTransactions: [updated], keyword: 'continente' } as any);

    expect(mockStore.applyTransactionCategories).toHaveBeenCalledWith([updated]);
  });
});
