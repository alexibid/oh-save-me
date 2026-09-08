import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { MovementsComponent } from './movements';
import { MovementsChartComponent } from '@ui/components/organisms/movements-chart/movements-chart';
import { APP_STORE_TOKEN, AppStore } from '@application/app-store';
import { provideAppStore } from '@application/app-store.service';
import { Transaction } from '@domain/models/transaction';
import { Account } from '@domain/models/account';
import { MOCK_ACCOUNTS, MOCK_BUDGET_CATEGORY_GROCERIES, MOCK_CATEGORIES, MOCK_TRANSACTIONS } from '@/mocks/index';
import { Budget } from '@domain/models/budget';
import { I18nService } from '@application/i18n.service';
import { classifyRecurringTransactions } from '@domain/shared/recurring-transaction-classifier';

@Component({ selector: 'ohsaveme-movements-chart', standalone: true, template: '' })
class StubMovementsChartComponent {
  @Input() transactions: readonly Transaction[] = [];
  @Input() accounts: readonly Account[] = [];
  @Input() windowStart = '';
  @Input() asOfDate = '';
  @Input() fullBleedMobile = false;
}

describe('MovementsComponent', () => {
  let component: MovementsComponent;
  let fixture: ComponentFixture<MovementsComponent>;
  let store: AppStore;
  let router: Router;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [MovementsComponent],
      providers: [provideRouter([]), provideAppStore()]
    });
    TestBed.overrideComponent(MovementsComponent, {
      remove: { imports: [MovementsChartComponent] },
      add: { imports: [StubMovementsChartComponent] }
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(MovementsComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(APP_STORE_TOKEN);
    router = TestBed.inject(Router);

    store.setAccounts(MOCK_ACCOUNTS);
    store.setTransactions(MOCK_TRANSACTIONS);
    store.startDate.set('2026-07-28');
    store.endDate.set('2026-08-28');
  });

  it('should create', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component).toBeTruthy();
  });

  describe('overspend banner', () => {
    const exceededGroceriesBudget: Budget = { ...MOCK_BUDGET_CATEGORY_GROCERIES, amount: 100 };

    beforeEach(async () => {
      await TestBed.inject(I18nService).setLanguage('pt');
      store.setCategories(MOCK_CATEGORIES);
      store.setBudgets([exceededGroceriesBudget]);
      fixture.componentRef.setInput('category', 'Groceries');
    });

    it('announces the overspent category when the overspend param is set', async () => {
      fixture.componentRef.setInput('overspend', 'true');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const banner = fixture.nativeElement.querySelector('.p-movements__overspend-banner');
      expect(banner).toBeTruthy();
      expect(banner.textContent).toContain('Supermercado e Compras');
      expect(banner.textContent).toContain('202,65 €');
    });

    it('stays hidden when the overspend param is absent', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.p-movements__overspend-banner')).toBeNull();
    });
  });

  describe('sum movements', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('is off and empty by default', () => {
      expect(component['sumSelection'].enabled()).toBe(false);
      expect(component['sumSelection'].selectedIds().size).toBe(0);
    });

    it('clears the selection when sum mode is turned off', () => {
      component['sumSelection'].select('tx_1', true);
      component['sumSelection'].setEnabled(false);

      expect(component['sumSelection'].selectedIds().size).toBe(0);
    });

    it('toggles an individual transaction in and out of the selection', () => {
      component['sumSelection'].select('tx_1', true);
      expect(component['sumSelection'].isSelected('tx_1')).toBe(true);

      component['sumSelection'].select('tx_1', false);
      expect(component['sumSelection'].isSelected('tx_1')).toBe(false);
    });

    it('toggleSumSelectAll selects/deselects every currently visible transaction', () => {
      component['toggleSumSelectAll'](true);
      expect(component['isAllSumSelected']()).toBe(true);
      expect(component['sumSelection'].selectedIds().size).toBe(component['filteredTransactions']().length);

      component['toggleSumSelectAll'](false);
      expect(component['isAllSumSelected']()).toBe(false);
      expect(component['sumSelection'].selectedIds().size).toBe(0);
    });

    it('is off by default and toggles the transfer exclusion', () => {
      expect(component['sumSelection'].excludeTransfers()).toBe(false);

      component['sumSelection'].setExcludeTransfers(true);
      expect(component['sumSelection'].excludeTransfers()).toBe(true);

      component['sumSelection'].setExcludeTransfers(false);
      expect(component['sumSelection'].excludeTransfers()).toBe(false);
    });
  });

  describe('recurring expenses filter', () => {
    it('is off by default', () => {
      fixture.detectChanges();
      expect(component['activeSpecialFilter']()).toBeNull();
    });

    it('activates and deactivates the recurring filter', () => {
      fixture.detectChanges();

      component['onSpecialFilterChange']('recurring');
      expect(component['activeSpecialFilter']()).toBe('recurring');

      component['onSpecialFilterChange']('all');
      expect(component['activeSpecialFilter']()).toBeNull();
    });

    it('filters down to exactly the recurring expenses the domain classifier flags', () => {
      fixture.detectChanges();

      const expectedIds = new Set<string>();
      const classifications = classifyRecurringTransactions(MOCK_TRANSACTIONS);
      for (const t of MOCK_TRANSACTIONS) {
        if (t.amount < 0 && classifications.get(t.id)?.isRecurring) expectedIds.add(t.id);
      }
      expect(expectedIds.size).toBeGreaterThan(0);

      component['onSpecialFilterChange']('recurring');
      fixture.detectChanges();

      const result = component['accountAndSearchFiltered']();
      expect(result.length).toBe(expectedIds.size);
      expect(result.every(t => expectedIds.has(t.id))).toBe(true);
      expect(result.every(t => t.amount < 0)).toBe(true);
    });
  });

  it('should filter transactions by accountId, not by the legacy account name', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component['selectedAccount'].set('acc-invest-main');
    fixture.detectChanges();

    const result = component['filteredTransactions']();
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(t => t.accountId === 'acc-invest-main')).toBe(true);
  });

  it('should seed the account filter from the accountId query param on init', async () => {
    component.accountId = 'acc-bank-main';
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component['selectedAccount']()).toBe('acc-bank-main');
    expect(component['filteredTransactions']().every(t => t.accountId === 'acc-bank-main')).toBe(true);
  });

  it('should reflect the selected account filter back into the URL query params', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    await fixture.whenStable();
    navigateSpy.mockClear();

    component['selectedAccount'].set('acc-invest-main');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({ accountId: 'acc-invest-main' })
      })
    );
  });

  it('should clear the accountId query param when the filter is reset to all accounts', async () => {
    component.accountId = 'acc-bank-main';
    fixture.detectChanges();
    await fixture.whenStable();

    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component['selectedAccount'].set('all');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({ accountId: null })
      })
    );
  });

  it('clears the category filter from the URL when it is reset to all categories', async () => {
    component.category = 'Groceries';
    fixture.detectChanges();
    await fixture.whenStable();

    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component['onCategoryFilterChange']('all');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({ category: null, categoryId: null })
      })
    );
  });

  it('clears the special filter from the URL when it is set to all', async () => {
    component.filter = 'pending_review';
    fixture.detectChanges();
    await fixture.whenStable();

    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component['onSpecialFilterChange']('all');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({ filter: null })
      })
    );
  });

  it('should seed the category filter from the category query param on init', async () => {
    component.category = 'Groceries';
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component['selectedCategoryFilter']()).toBe('Groceries');
    expect(component['filteredTransactions']().every(t => t.category === 'Groceries')).toBe(true);
  });

  it('should seed the category filter from the categoryId query param on init', async () => {
    component.categoryId = 'Groceries';
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component['selectedCategoryFilter']()).toBe('Groceries');
    expect(component['filteredTransactions']().every(t => t.category === 'Groceries')).toBe(true);
  });

  it('should seed the project filter from the projectId query param on init, matching only explicitly assigned movements', async () => {
    store.setBudgets([{ id: 'proj-1', name: 'Obras Casa', type: 'project', amount: 1000 }]);
    store.setTransactions([
      { ...MOCK_TRANSACTIONS[0], id: 'tx-proj-assigned', budgetId: 'proj-1', date: '2026-08-01' },
      { ...MOCK_TRANSACTIONS[0], id: 'tx-proj-unassigned', budgetId: undefined, date: '2026-08-02' }
    ]);

    component.projectId = 'proj-1';
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component['selectedProjectFilter']()).toBe('proj-1');
    const result = component['filteredTransactions']();
    expect(result.map(t => t.id)).toEqual(['tx-proj-assigned']);
  });

  describe('active filter chips', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('has no chips when no account/category filter is active', () => {
      expect(component['activeFilterChips']()).toEqual([]);
    });

    it('adds a chip for an active account filter', () => {
      component['onAccountFilterChange']('acc-invest-main');
      const chips = component['activeFilterChips']();
      expect(chips).toEqual([{ id: 'account', label: 'Investment Account' }]);
    });

    it('adds a chip for an active project filter', () => {
      store.setBudgets([{ id: 'proj-1', name: 'Obras Casa', type: 'project', amount: 1000 }]);
      component['onProjectFilterChange']('proj-1');
      const chips = component['activeFilterChips']();
      expect(chips).toEqual([{ id: 'project', label: 'Obras Casa' }]);
    });

    it('removes the project filter when its chip is removed', () => {
      store.setBudgets([{ id: 'proj-1', name: 'Obras Casa', type: 'project', amount: 1000 }]);
      component['onProjectFilterChange']('proj-1');
      component['onRemoveFilterChip']('project');
      expect(component['selectedProjectFilter']()).toBe('all');
      expect(component['activeFilterChips']()).toEqual([]);
    });

    it('removes the account filter when its chip is removed', () => {
      component['onAccountFilterChange']('acc-invest-main');
      component['onRemoveFilterChip']('account');
      expect(component['selectedAccountFilter']()).toBe('all');
      expect(component['activeFilterChips']()).toEqual([]);
    });

    it('removes special filter when special chip is removed', () => {
      TestBed.inject(I18nService).setLanguage('en');
      component['activeSpecialFilter'].set('pending_review');
      expect(component['activeFilterChips']()).toEqual([{ id: 'special', label: 'Showing only movements to review' }]);
      component['onRemoveFilterChip']('special');
      expect(component['activeSpecialFilter']()).toBeNull();
      expect(component['activeFilterChips']()).toEqual([]);
    });

    it('removes search filter when search chip is removed', () => {
      component['searchQuery'].set('Continente');
      expect(component['activeFilterChips']()).toEqual([{ id: 'search', label: '"Continente"' }]);
      component['onRemoveFilterChip']('search');
      expect(component['searchQuery']()).toBe('');
      expect(component['activeFilterChips']()).toEqual([]);
    });

    it('removes overspend filter when overspend chip is removed', () => {
      TestBed.inject(I18nService).setLanguage('en');
      component['showOverspendBanner'].set(true);
      expect(component['activeFilterChips']()).toEqual([{ id: 'overspend', label: 'Over budget' }]);
      component['onRemoveFilterChip']('overspend');
      expect(component['showOverspendBanner']()).toBe(false);
      expect(component['activeFilterChips']()).toEqual([]);
    });

    it('clears all filters including search and overspend on clearAll', () => {
      component['onAccountFilterChange']('acc-invest-main');
      component['onCategoryFilterChange']('Groceries');
      component['searchQuery'].set('Continente');
      component['showOverspendBanner'].set(true);
      component['activeSpecialFilter'].set('pending_review');
      component['onClearAllFilterChips']();

      expect(component['selectedAccountFilter']()).toBe('all');
      expect(component['selectedCategoryFilter']()).toBe('all');
      expect(component['searchQuery']()).toBe('');
      expect(component['showOverspendBanner']()).toBe(false);
      expect(component['activeSpecialFilter']()).toBeNull();
      expect(component['activeFilterChips']()).toEqual([]);
    });
  });

  describe('column manager', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('locks every primary column visible by default', () => {
      const items = component['columns'].items();
      const primaryItems = items.filter(i => i.locked);
      expect(primaryItems.length).toBeGreaterThan(0);
      expect(primaryItems.every(i => i.visible)).toBe(true);
    });

    it('hides a secondary column from the schema passed to the table when toggled off', () => {
      component['columns'].setVisibility('balance', false);
      const columns = component['columns'].schema().columns;
      expect(columns.some(c => c.key === 'balance')).toBe(false);
    });

    it('keeps locked (primary) columns in the schema even if somehow marked not visible', () => {
      const columns = component['columns'].schema().columns;
      expect(columns.some(c => c.key === 'description')).toBe(true);
    });

    it('reorders columns on drop', () => {
      const before = component['columns'].items().map(i => i.key);
      component['columns'].reorder({ previousIndex: before.length - 1, currentIndex: 0 });
      const after = component['columns'].items().map(i => i.key);

      expect(after[0]).toBe(before[before.length - 1]);
    });
  });

  it('flips the current selection state for that transaction', () => {
    fixture.detectChanges();
    const firstId = MOCK_TRANSACTIONS[0].id;
    expect(component['sumSelection'].isSelected(firstId)).toBe(false);

    component['sumSelection'].toggle(firstId);
    expect(component['sumSelection'].isSelected(firstId)).toBe(true);

    component['sumSelection'].toggle(firstId);
    expect(component['sumSelection'].isSelected(firstId)).toBe(false);
  });

  describe('chart date window', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 7, 1));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('starts the chart exactly at the header period start, even when the current cycle just began', () => {
      store.startDate.set('2026-07-28');
      store.endDate.set('2026-08-28');
      store.maxAvailableDate.set('2026-08-01');
      fixture.detectChanges();

      expect(component['chartWindowStart']()).toBe('2026-07-28');
      expect(component['filteredTransactions']().length).toBeGreaterThan(0);
    });

    it('does not widen the chart window for a fully historical, already-closed period', () => {
      store.startDate.set('2026-06-01');
      store.endDate.set('2026-06-30');
      fixture.detectChanges();

      expect(component['chartWindowStart']()).toBe('2026-06-01');
    });

    it('passes every account/search-filtered transaction to the chart regardless of date, so dormant accounts can still be summed', () => {
      store.setTransactions([
        ...MOCK_TRANSACTIONS,
        { id: 'tx_3', date: '2026-01-01', description: 'Very old', amount: -10, category: 'Other', accountId: 'acc-invest-main' }
      ]);
      component['selectedAccount'].set('acc-bank-main');
      fixture.detectChanges();

      const chartInput = component['accountAndSearchFiltered']().map(t => t.id);
      expect(chartInput).toContain(MOCK_TRANSACTIONS[0].id);
      expect(chartInput).not.toContain('tx_3');
    });

    it('ends the chart at the header period end, ignoring transactions dated beyond it', () => {
      vi.setSystemTime(new Date(2026, 6, 28));

      store.maxAvailableDate.set('2026-07-31');
      store.startDate.set('2026-07-28');
      store.endDate.set('2026-08-28');
      fixture.detectChanges();

      expect(component['chartAsOfDate']()).toBe('2026-08-28');
    });
  });

});
