import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TransactionsTableComponent } from './transactions-table';
import { I18nService } from '@application/i18n.service';
import { APP_STORE_TOKEN } from '@application/app-store';
import { TRANSACTION_REPOSITORY_TOKEN } from '@application/tokens';
import { Transaction } from '@domain/models/transaction';
import { MOCK_TRANSACTIONS } from '@/mocks/transactions.mock';
import { vi, describe, beforeEach, it, expect, afterEach } from 'vitest';

describe('TransactionsTableComponent', () => {
  let component: TransactionsTableComponent;
  let fixture: ComponentFixture<TransactionsTableComponent>;

  const mockI18nService = {
    t: vi.fn().mockReturnValue({
      all: 'All',
      debit: 'Debit',
      credit: 'Credit',
      pinned: 'Pinned'
    }),
    translate: vi.fn((_key: string, fallback?: string) => fallback ?? ''),
    currentLang: vi.fn().mockReturnValue('pt'),
    getCategoryName: vi.fn((id: string) => id),
    formatCurrency: vi.fn((val: number) => `${val.toFixed(2)} €`),
    formatDate: vi.fn((date: string) => date)
  };

  const tx = (overrides: Partial<Transaction>): Transaction => ({
    id: 'id',
    date: '2026-01-01',
    description: 'desc',
    amount: 0,
    category: 'Others',
    ...overrides
  });

  beforeEach(async () => {
    class MockIntersectionObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = vi.fn();
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

    await TestBed.configureTestingModule({
      imports: [TransactionsTableComponent],
      providers: [
        { provide: I18nService, useValue: mockI18nService },
        { provide: APP_STORE_TOKEN, useValue: { transactions: () => [], setTransactions: () => {} } },
        { provide: TRANSACTION_REPOSITORY_TOKEN, useValue: { update: vi.fn().mockResolvedValue(undefined) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionsTableComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('transactions', [...MOCK_TRANSACTIONS]);
    fixture.componentRef.setInput('categoryOptions', []);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders empty message when transactions array is empty', () => {
    fixture.componentRef.setInput('transactions', []);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.o-transactions-table__cell--empty')).toBeTruthy();
  });

  it('resolves the counterpart account name for a linked internal transfer', () => {
    fixture.componentRef.setInput('accounts', [{ id: 'acc-2', name: 'Investimentos' } as any]);
    expect(component['getLinkedAccountName']({ transferAccountId: 'acc-2' } as any)).toBe('Investimentos');
  });

  describe('isRecurringTransaction', () => {
    it('flags a transaction as recurring when the store history shows a monthly repeating pattern', async () => {
      const monthlyRent: Transaction[] = [
        tx({ id: 't1', date: '2026-01-05', description: 'RENDA CASA', amount: -750 }),
        tx({ id: 't2', date: '2026-02-05', description: 'RENDA CASA', amount: -750 }),
        tx({ id: 't3', date: '2026-03-05', description: 'RENDA CASA', amount: -750 }),
        tx({ id: 't4', date: '2026-04-05', description: 'RENDA CASA', amount: -750 })
      ];

      await TestBed.resetTestingModule().configureTestingModule({
        imports: [TransactionsTableComponent],
        providers: [
          { provide: I18nService, useValue: mockI18nService },
          { provide: APP_STORE_TOKEN, useValue: { transactions: () => monthlyRent, setTransactions: () => {} } },
          { provide: TRANSACTION_REPOSITORY_TOKEN, useValue: { update: vi.fn().mockResolvedValue(undefined) } }
        ]
      }).compileComponents();

      const recurringFixture = TestBed.createComponent(TransactionsTableComponent);
      recurringFixture.componentRef.setInput('transactions', monthlyRent);
      recurringFixture.componentRef.setInput('categoryOptions', []);
      recurringFixture.detectChanges();

      expect(recurringFixture.componentInstance['isRecurringTransaction'](monthlyRent[0])).toBe(true);
    });

    it('does not flag a one-off transaction as recurring', () => {
      const oneOff = tx({ id: 't1', date: '2026-08-10', description: 'COMPRAS C.DEB REPSOL', amount: -60 });
      expect(component['isRecurringTransaction'](oneOff)).toBe(false);
    });

    it('flags recurring income (e.g. a monthly salary) as recurring too, not just expenses', async () => {
      const monthlySalary: Transaction[] = [
        tx({ id: 't1', date: '2026-01-01', description: 'Salário Mensal', amount: 2500 }),
        tx({ id: 't2', date: '2026-02-01', description: 'Salário Mensal', amount: 2500 }),
        tx({ id: 't3', date: '2026-03-01', description: 'Salário Mensal', amount: 2500 }),
        tx({ id: 't4', date: '2026-04-01', description: 'Salário Mensal', amount: 2500 })
      ];

      await TestBed.resetTestingModule().configureTestingModule({
        imports: [TransactionsTableComponent],
        providers: [
          { provide: I18nService, useValue: mockI18nService },
          { provide: APP_STORE_TOKEN, useValue: { transactions: () => monthlySalary, setTransactions: () => {} } },
          { provide: TRANSACTION_REPOSITORY_TOKEN, useValue: { update: vi.fn().mockResolvedValue(undefined) } }
        ]
      }).compileComponents();

      const salaryFixture = TestBed.createComponent(TransactionsTableComponent);
      salaryFixture.componentRef.setInput('transactions', monthlySalary);
      salaryFixture.componentRef.setInput('categoryOptions', []);
      salaryFixture.detectChanges();

      expect(salaryFixture.componentInstance['isRecurringTransaction'](monthlySalary[0])).toBe(true);
    });
  });

  it('returns an empty string when the transaction has no linked transfer', () => {
    expect(component['getLinkedAccountName']({} as any)).toBe('');
  });

  it('resolves a category icon/color from categoryOptions by id', () => {
    fixture.componentRef.setInput('categoryOptions', [{ id: 'Groceries', name: 'Groceries', icon: 'shopping_bag', color: '#10b981' }]);
    fixture.detectChanges();

    expect(component['categoryIconFor']('Groceries')).toBe('shopping_bag');
    expect(component['categoryColorFor']('Groceries')).toBe('#10b981');
  });

  it('falls back to a generic icon for an unknown category id', () => {
    expect(component['categoryIconFor']('DoesNotExist')).toBe('help');
  });

  it('filters visible tabs based on input', () => {
    fixture.componentRef.setInput('visibleTabs', ['top20', 'credit']);
    fixture.detectChanges();

    expect(component['tabOptions'].map((t: { value: string }) => t.value)).toEqual(['top20', 'credit']);
  });

  it('does not show a load-more control on the top20 tab, which is always fully shown', () => {
    fixture.componentRef.setInput('transactions', Array.from({ length: 30 }, (_, i) => tx({ id: `t${i}` })));
    component['activeTab'].set('top20');
    fixture.detectChanges();

    expect(component.displayTransactions).toHaveLength(20);
    expect(component.canLoadMore).toBe(false);
  });

  it('offers load-more on the "all" tab once there are more records than the current page size', () => {
    fixture.componentRef.setInput('transactions', Array.from({ length: 30 }, (_, i) => tx({ id: `t${i}` })));
    component['activeTab'].set('all');
    fixture.detectChanges();

    expect(component.displayTransactions).toHaveLength(20);
    expect(component.canLoadMore).toBe(true);

    component.onLoadMore();
    fixture.detectChanges();

    expect(component.displayTransactions).toHaveLength(30);
    expect(component.canLoadMore).toBe(false);
  });

  it('reports sum-mode selection state via isSelectedForSum', () => {
    fixture.componentRef.setInput('selectedForSum', new Set(['t1']));
    fixture.detectChanges();

    expect(component.isSelectedForSum('t1')).toBe(true);
    expect(component.isSelectedForSum('t2')).toBe(false);
  });

  describe('sum-mode split', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('transactions', [
        tx({ id: 't1', amount: 10 }),
        tx({ id: 't2', amount: -5 }),
        tx({ id: 't3', amount: 20 })
      ]);
      component['activeTab'].set('all');
    });

    it('splits the displayed transactions into selected/unselected groups', () => {
      fixture.componentRef.setInput('selectedForSum', new Set(['t1', 't3']));
      fixture.detectChanges();

      expect(component['selectedGroup'].map(t => t.id)).toEqual(['t1', 't3']);
      expect(component['unselectedGroup'].map(t => t.id)).toEqual(['t2']);
    });

    it('sums only the selected group amounts', () => {
      fixture.componentRef.setInput('selectedForSum', new Set(['t1', 't3']));
      fixture.detectChanges();

      expect(component['selectedTotal']).toBe(30);
    });

    it('has an empty selected group and a zero total when nothing is selected', () => {
      fixture.detectChanges();

      expect(component['selectedGroup']).toEqual([]);
      expect(component['selectedTotal']).toBe(0);
    });

    it('keeps a selected linked transfer visible in the group but out of the total when excludeTransfers is set', () => {
      fixture.componentRef.setInput('transactions', [
        tx({ id: 't1', amount: 10 }),
        tx({ id: 't4', amount: 100, linkedTransactionId: 't5' })
      ]);
      fixture.componentRef.setInput('selectedForSum', new Set(['t1', 't4']));
      fixture.componentRef.setInput('excludeTransfers', true);
      fixture.detectChanges();

      expect(component['selectedGroup'].map(t => t.id)).toEqual(['t1', 't4']);
      expect(component['selectedTotal']).toBe(10);
    });
  });

  it('emits searchQueryChange when the header search input changes', () => {
    fixture.componentRef.setInput('showSearch', true);
    fixture.detectChanges();

    const emitted: string[] = [];
    component.searchQueryChange.subscribe((v: string) => emitted.push(v));

    const field: HTMLInputElement = fixture.nativeElement.querySelector('.a-search-input__field');
    field.value = 'continente';
    field.dispatchEvent(new Event('input'));

    expect(emitted).toEqual(['continente']);
  });

  it('does not render the search input when showSearch is false', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.a-search-input__field')).toBeFalsy();
  });

  describe('sum toggle in the sort header', () => {
    it('is hidden by default', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.o-transactions-table__sum-toggle-btn')).toBeFalsy();
    });

    it('emits sumModeChange with the flipped value when clicked', () => {
      fixture.componentRef.setInput('showSumToggle', true);
      fixture.componentRef.setInput('sumModeEnabled', false);
      fixture.detectChanges();

      const emitted: boolean[] = [];
      component.sumModeChange.subscribe((v: boolean) => emitted.push(v));

      const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.o-transactions-table__sum-toggle-btn');
      btn.click();

      expect(emitted).toEqual([true]);
    });

    it('applies the active class when sumModeEnabled is true', () => {
      fixture.componentRef.setInput('showSumToggle', true);
      fixture.componentRef.setInput('sumModeEnabled', true);
      fixture.detectChanges();

      const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.o-transactions-table__sum-toggle-btn');
      expect(btn.classList.contains('o-transactions-table__sum-toggle-btn--active')).toBe(true);
    });
  });
});
