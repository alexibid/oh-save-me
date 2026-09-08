import { TestBed, ComponentFixture } from '@angular/core/testing';
import { DialogModule } from '@angular/cdk/dialog';
import { ImportTriageDialog } from './import-triage-dialog';
import { Transaction } from '@domain/models/transaction';
import { CategoryInfo } from '@domain/models/category';
import { Budget } from '@domain/models/budget';
import { APP_STORE_TOKEN } from '@application/app-store';
import { TRANSACTION_REPOSITORY_TOKEN } from '@application/tokens';

describe('ImportTriageDialog', () => {
  let component: ImportTriageDialog;
  let fixture: ComponentFixture<ImportTriageDialog>;

  const categories: CategoryInfo[] = [
    { id: 'Groceries', name: 'Groceries', icon: 'shopping_bag', color: '#10b981' },
    { id: 'Others', name: 'Others', icon: 'help', color: '#cbd5e1' }
  ];

  const txs: Transaction[] = [
    { id: 'tx-1', date: '2026-07-23', description: 'Lidl', amount: -15, category: 'Groceries' },
    { id: 'tx-2', date: '2026-07-24', description: 'Unknown Shop', amount: -8, category: 'Others' }
  ];

  const budgets: Budget[] = [
    { id: 'bud-1', name: 'Holiday 2027', type: 'project', amount: 1000 },
    { id: 'bud-2', name: 'Cozinha Nova', type: 'project', amount: 5000, isClosed: true },
    { id: 'bud-3', name: 'Groceries', type: 'category', amount: 300, categoryId: 'Groceries' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportTriageDialog, DialogModule],

      providers: [
        { provide: APP_STORE_TOKEN, useValue: { transactions: () => [], setTransactions: () => {}, budgets: () => budgets } },
        { provide: TRANSACTION_REPOSITORY_TOKEN, useValue: { update: vi.fn().mockResolvedValue(undefined) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ImportTriageDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function triggerVisible(transactions: readonly Transaction[] = txs) {
    component.transactions = transactions;
    component.categories = categories;
    component.visible = true;
    component.ngOnChanges({
      visible: { currentValue: true, previousValue: false, firstChange: true, isFirstChange: () => true }
    });
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('computes total, auto-categorized and needs-review counts', () => {
    triggerVisible();

    expect(component['totalCount']()).toBe(2);
    expect(component['autoCategorizedCount']()).toBe(1);
    expect(component['needsReviewCount']()).toBe(1);
  });

  it('defaults a row\'s accepted state from whether the ML suggestion was "Others"', () => {
    triggerVisible();

    expect(component['isAccepted']('tx-1')).toBe(true);
    expect(component['isAccepted']('tx-2')).toBe(false);
  });

  it('reflects mixed acceptance as an indeterminate select-all state', () => {
    triggerVisible();

    expect(component['isAllSelected']()).toBe(false);
    expect(component['isSomeSelected']()).toBe(true);
  });

  it('toggleAll accepts or skips every row at once', () => {
    triggerVisible();

    component['toggleAll'](true);
    expect(component['isAllSelected']()).toBe(true);
    expect(component['isSomeSelected']()).toBe(false);

    component['toggleAll'](false);
    expect(component['isAllSelected']()).toBe(false);
    expect(component['isSomeSelected']()).toBe(false);
  });

  it('lets a row\'s category be edited independently of its accepted state', () => {
    triggerVisible();

    component['setTransactionCategory']('tx-2', 'Groceries');

    expect(component['getTransactionCategory']('tx-2')).toBe('Groceries');
  });

  it('emits resolved with the (possibly edited) category and pendingReview=false for accepted rows', () => {
    triggerVisible();
    component['setTransactionCategory']('tx-2', 'Groceries');
    component['toggleSelection']('tx-2', true);

    const resolvedSpy = vi.fn();
    component.resolved.subscribe(resolvedSpy);

    component['onConfirm']();

    const result = resolvedSpy.mock.calls[0][0] as Transaction[];
    expect(result.find(t => t.id === 'tx-1')).toMatchObject({ category: 'Groceries', pendingReview: false });
    expect(result.find(t => t.id === 'tx-2')).toMatchObject({ category: 'Groceries', pendingReview: false });
  });

  it('keeps a skipped row in the result but flagged pendingReview=true', () => {
    triggerVisible();

    const resolvedSpy = vi.fn();
    component.resolved.subscribe(resolvedSpy);

    component['onConfirm']();

    const result = resolvedSpy.mock.calls[0][0] as Transaction[];
    expect(result).toHaveLength(2);
    expect(result.find(t => t.id === 'tx-2')?.pendingReview).toBe(true);
    expect(result.find(t => t.id === 'tx-1')?.pendingReview).toBe(false);
  });

  describe('isAssistantSuggestedCategory', () => {
    it('marks a row whose category still matches the ML engine\'s confident suggestion', () => {
      triggerVisible();

      expect(component['isAssistantSuggestedCategory']('tx-1')).toBe(true);
    });

    it('does not mark a row the ML engine left as "Others" (no confident suggestion)', () => {
      triggerVisible();

      expect(component['isAssistantSuggestedCategory']('tx-2')).toBe(false);
    });

    it('unmarks a row once the user edits its category away from the ML suggestion', () => {
      triggerVisible();

      component['setTransactionCategory']('tx-1', 'Others');

      expect(component['isAssistantSuggestedCategory']('tx-1')).toBe(false);
    });
  });

  describe('project budget assignment', () => {
    it('defaults every row to no budget assigned', () => {
      triggerVisible();

      expect(component['getTransactionBudgetId']('tx-1')).toBe('');
      expect(component['getTransactionBudgetId']('tx-2')).toBe('');
    });

    it('seeds a row\'s budget from the transaction\'s own budgetId, if it already had one', () => {
      const preAssigned: Transaction = { ...txs[0], budgetId: 'bud-1' };
      triggerVisible([preAssigned, txs[1]]);

      expect(component['getTransactionBudgetId']('tx-1')).toBe('bud-1');
    });

    it('lets a row\'s budget be assigned independently of its category/accepted state, and includes it on confirm', () => {
      triggerVisible();
      component['setTransactionBudgetId']('tx-1', 'bud-1');

      const resolvedSpy = vi.fn();
      component.resolved.subscribe(resolvedSpy);
      component['onConfirm']();

      const result = resolvedSpy.mock.calls[0][0] as Transaction[];
      expect(result.find(t => t.id === 'tx-1')?.budgetId).toBe('bud-1');
      expect(result.find(t => t.id === 'tx-2')?.budgetId).toBeUndefined();
    });

    it('assigning back to "no project" (empty string) clears budgetId rather than storing an empty string', () => {
      const preAssigned: Transaction = { ...txs[0], budgetId: 'bud-1' };
      triggerVisible([preAssigned, txs[1]]);

      component['setTransactionBudgetId']('tx-1', '');

      const resolvedSpy = vi.fn();
      component.resolved.subscribe(resolvedSpy);
      component['onConfirm']();

      const result = resolvedSpy.mock.calls[0][0] as Transaction[];
      expect(result.find(t => t.id === 'tx-1')?.budgetId).toBeUndefined();
    });
  });

  describe('onCategoryApplied — delegates to category-recategorize (which owns the "apply to similar" flow)', () => {
    it('updates the categoryMap for every transaction in the emitted event', () => {
      triggerVisible();

      component['onCategoryApplied']({
        updatedTransactions: [
          { ...txs[0], category: 'Groceries' },
          { ...txs[1], category: 'Groceries' }
        ],
        keyword: 'lidl'
      });

      expect(component['getTransactionCategory']('tx-1')).toBe('Groceries');
      expect(component['getTransactionCategory']('tx-2')).toBe('Groceries');
    });

    it('getRowTransaction reflects the locally-edited category, not the original one', () => {
      triggerVisible();
      component['setTransactionCategory']('tx-2', 'Groceries');

      expect(component['getRowTransaction'](txs[1])).toMatchObject({ id: 'tx-2', category: 'Groceries' });
    });

    it('rowTransactions maps the whole batch through each row\'s locally-edited category', () => {
      triggerVisible();
      component['setTransactionCategory']('tx-2', 'Groceries');

      const ids = component['rowTransactions']().map(t => `${t.id}:${t.category}`);
      expect(ids).toEqual(['tx-1:Groceries', 'tx-2:Groceries']);
    });
  });

  describe('visibleCategories — narrowed to investment presets only for investment accounts', () => {
    const mixedCategories: CategoryInfo[] = [
      { id: 'Groceries', name: 'Groceries', icon: 'shopping_bag', color: '#10b981' },
      { id: 'Investments', name: 'Investments', icon: 'trending_up', color: '#4338ca', accountTypes: ['investment'] },
      { id: 'Others', name: 'Others', icon: 'help', color: '#cbd5e1', accountTypes: ['investment'] }
    ];

    it('shows only accountTypes-tagged categories for an investment account', () => {
      component.transactions = txs;
      component.categories = mixedCategories;
      component.accountType = 'investment';

      const ids = component['visibleCategories']().map(c => c.id);
      expect(ids).toEqual(['Investments', 'Others']);
    });

    it('passes every category through unchanged for the other account types (regression: no behavior change)', () => {
      component.transactions = txs;
      component.categories = mixedCategories;

      (['bank_account', 'credit_card', 'meal_card', undefined] as const).forEach(accountType => {
        component.accountType = accountType;
        expect(component['visibleCategories']()).toEqual(mixedCategories);
      });
    });
  });
});
