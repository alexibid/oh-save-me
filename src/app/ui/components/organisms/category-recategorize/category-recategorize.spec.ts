import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { DialogModule } from '@angular/cdk/dialog';
import { CategoryRecategorizeComponent } from './category-recategorize';

import { Transaction } from '@domain/models/transaction';
import { CategoryInfo } from '@domain/models/category';
import { APP_STORE_TOKEN } from '@application/app-store';
import { TRANSACTION_REPOSITORY_TOKEN } from '@application/tokens';

describe('CategoryRecategorizeComponent', () => {
  let component: CategoryRecategorizeComponent;
  let fixture: ComponentFixture<CategoryRecategorizeComponent>;
  let mockTransactionsSignal: ReturnType<typeof signal<Transaction[]>>;
  let mockRepository: { update: ReturnType<typeof vi.fn> };

  const categories: CategoryInfo[] = [
    { id: 'Groceries', name: 'Groceries', icon: 'shopping_bag', color: '#10b981' },
    { id: 'Others', name: 'Others', icon: 'help', color: '#cbd5e1' }
  ];

  const similarTxs: Transaction[] = [
    { id: 'tx-3', date: '2026-07-20', description: 'COMPRAS C.DEB LIDL', amount: -15, category: 'Others' },
    { id: 'tx-4', date: '2026-07-21', description: 'COMPRAS C.DEB LIDL PORTO', amount: -20, category: 'Others' }
  ];

  beforeEach(async () => {
    mockTransactionsSignal = signal<Transaction[]>([]);
    mockRepository = { update: vi.fn().mockResolvedValue(undefined) };

    await TestBed.configureTestingModule({
      imports: [CategoryRecategorizeComponent, DialogModule],

      providers: [
        {
          provide: APP_STORE_TOKEN,
          useValue: {
            transactions: mockTransactionsSignal,
            setTransactions: (txs: Transaction[]) => mockTransactionsSignal.set(txs),
            endDate: () => '2026-12-31'
          }
        },
        { provide: TRANSACTION_REPOSITORY_TOKEN, useValue: mockRepository }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryRecategorizeComponent);
    component = fixture.componentInstance;
    component.categories = categories;
  });

  function setUp(transaction: Transaction, allTransactions: readonly Transaction[]) {
    component.transaction = transaction;
    component.allTransactions = allTransactions;
    fixture.detectChanges();
  }

  it('should create', () => {
    setUp(similarTxs[0], similarTxs);
    expect(component).toBeTruthy();
  });

  it('opens the ml-confirmation-dialog, pre-populated with the trigger and target category, when a similar transaction exists', () => {
    setUp(similarTxs[0], similarTxs);

    component['onCategorySelectChange']('Groceries');

    expect(component['showMlDialog']()).toBe(true);
    expect(component['mlTriggerTransaction']).toMatchObject({ id: 'tx-3', category: 'Others' });
    expect(component['mlTargetCategory']).toBe('Groceries');
    expect(component['displayCategory']()).toBe('Groceries');
  });

  it('opens the ml-confirmation-dialog even when no similar transactions are initially found', () => {
    const lone: Transaction = { id: 'tx-5', date: '2026-07-22', description: 'FARMACIA CENTRAL', amount: -9, category: 'Others' };
    setUp(lone, [lone]);

    component['onCategorySelectChange']('Healthcare');

    expect(component['showMlDialog']()).toBe(true);
    expect(component['mlTriggerTransaction']).toMatchObject({ id: 'tx-5', category: 'Others' });
    expect(component['mlTargetCategory']).toBe('Healthcare');
  });

  it('does nothing when the selected category matches the current one', () => {
    setUp(similarTxs[0], similarTxs);
    const applied = vi.fn();
    component.categoryApplied.subscribe(applied);

    component['onCategorySelectChange']('Others');

    expect(component['showMlDialog']()).toBe(false);
    expect(applied).not.toHaveBeenCalled();
  });

  it('onMlConfirm emits categoryApplied with the trigger plus every confirmed similar transaction and targetCategory', () => {
    setUp(similarTxs[0], similarTxs);
    const applied = vi.fn();
    component.categoryApplied.subscribe(applied);

    component['onCategorySelectChange']('Groceries');
    expect(applied).not.toHaveBeenCalled();

    component['onMlConfirm']({ updatedTransactions: [{ ...similarTxs[1], category: 'Groceries' }], keyword: 'lidl' });

    expect(component['showMlDialog']()).toBe(false);
    expect(applied).toHaveBeenCalledWith({
      updatedTransactions: [
        { ...similarTxs[0], category: 'Groceries' },
        { ...similarTxs[1], category: 'Groceries' }
      ],
      keyword: 'lidl',
      targetCategory: 'Groceries'
    });
  });

  it('onMlCancel emits categoryApplied for just the trigger transaction and targetCategory', () => {
    setUp(similarTxs[0], similarTxs);
    const applied = vi.fn();
    component.categoryApplied.subscribe(applied);

    component['onCategorySelectChange']('Groceries');
    expect(applied).not.toHaveBeenCalled();

    component['onMlCancel']();

    expect(component['showMlDialog']()).toBe(false);
    expect(applied).toHaveBeenCalledWith({
      updatedTransactions: [{ ...similarTxs[0], category: 'Groceries' }],
      keyword: '',
      targetCategory: 'Groceries'
    });
  });

  describe('recategorizing away from a false-positive transfer match', () => {
    const linkedTx: Transaction = {
      id: 'tx-linked', date: '2026-02-05', description: 'TFI Camila Duarte', amount: -50,
      category: 'Transfers', linkedTransactionId: 'tx-counterpart', transferAccountId: 'acc_2'
    };
    const counterpart: Transaction = {
      id: 'tx-counterpart', date: '2026-02-06', description: 'unrelated deposit', amount: 50,
      category: 'Transfers', linkedTransactionId: 'tx-linked', transferAccountId: 'acc_1'
    };

    it('strips the link fields from the emitted transaction when moving away from Transfers', () => {
      setUp(linkedTx, [linkedTx]);
      const applied = vi.fn();
      component.categoryApplied.subscribe(applied);

      component['onCategorySelectChange']('Groceries');
      component['onMlCancel']();

      expect(applied).toHaveBeenCalledWith({
        updatedTransactions: [{ ...linkedTx, category: 'Groceries', linkedTransactionId: undefined, transferAccountId: undefined }],
        keyword: '',
        targetCategory: 'Groceries'
      });
    });

    it('clears the counterpart\'s link fields too, via UnlinkTransferUseCase', async () => {
      mockTransactionsSignal.set([linkedTx, counterpart]);
      setUp(linkedTx, [linkedTx, counterpart]);

      component['onCategorySelectChange']('Groceries');
      component['onMlCancel']();
      await new Promise(resolve => setTimeout(resolve, 0));

      const counterpartAfter = mockTransactionsSignal().find(t => t.id === 'tx-counterpart');
      expect(counterpartAfter?.linkedTransactionId).toBeUndefined();
      expect(counterpartAfter?.transferAccountId).toBeUndefined();
    });

    it('keeps the link fields when moving into Transfers (not away from it)', () => {
      const alreadyLinkedButOtherCategory: Transaction = { ...linkedTx, category: 'Others' };
      setUp(alreadyLinkedButOtherCategory, [alreadyLinkedButOtherCategory]);
      const applied = vi.fn();
      component.categoryApplied.subscribe(applied);

      component['onCategorySelectChange']('Transfers');
      component['onMlCancel']();

      expect(applied).toHaveBeenCalledWith({
        updatedTransactions: [{ ...alreadyLinkedButOtherCategory, category: 'Transfers' }],
        keyword: '',
        targetCategory: 'Transfers'
      });
    });
  });

  it('forwards createCategoryClick from the underlying category-select', () => {
    setUp(similarTxs[0], similarTxs);
    const clicked = vi.fn();
    component.createCategoryClick.subscribe(clicked);

    component['onCreateCategoryClick']();

    expect(clicked).toHaveBeenCalled();
  });

  describe('project assignment and simultaneous category selection', () => {
    const activeProjects = [
      { id: 'proj-1', name: 'Algarve Holiday 2026', type: 'project', amount: 1000 } as never,
      { id: 'proj-2', name: 'Obras Casa', type: 'project', amount: 2000 } as never
    ];

    it('emits budgetApplied with the transaction id and chosen project id, without touching category', () => {
      setUp(similarTxs[0], similarTxs);
      component.activeProjects = activeProjects;
      const applied = vi.fn();
      component.budgetApplied.subscribe(applied);

      component['onProjectSelectChange']('proj-1');

      expect(applied).toHaveBeenCalledWith({ transactionId: similarTxs[0].id, budgetId: 'proj-1' });
    });

    it('preserves the project budgetId when recategorizing a project-owned movement', () => {
      const assigned = { ...similarTxs[0], budgetId: 'proj-1' };
      setUp(assigned, [assigned]);
      component.activeProjects = activeProjects;

      const trigger = component['buildUpdatedTrigger']('Healthcare' as never);

      expect(trigger.category).toBe('Healthcare');
      expect(trigger.budgetId).toBe('proj-1');
    });

    it('stays silent when the picked category is unchanged', () => {
      setUp(similarTxs[0], similarTxs);
      component.activeProjects = activeProjects;
      const applied = vi.fn();
      component.categoryApplied.subscribe(applied);

      component['onCategorySelectChange'](similarTxs[0].category as never);

      expect(applied).not.toHaveBeenCalled();
    });

    it('does not open the categorization-rule dialog when nothing about the category changed', () => {
      const assigned = { ...similarTxs[0], budgetId: 'proj-1' };
      setUp(assigned, [assigned]);
      component.activeProjects = activeProjects;

      component['onCategorySelectChange'](assigned.category as never);

      expect(component['showMlDialog']()).toBe(false);
    });

    it('preserves existing tags when a category is applied', () => {
      const tagged = { ...similarTxs[0], tags: ['ferias', 'viagem'] };
      setUp(tagged, [tagged]);
      component.activeProjects = [
        { id: 'proj-1', name: 'Algarve Holiday 2026', type: 'project', amount: 1000, tags: ['ferias', 'viagem'] } as never
      ];

      expect(component['buildUpdatedTrigger']('Healthcare' as never).tags).toEqual(['ferias', 'viagem']);
    });

    it('resolves selectedProjectName from the transaction budgetId against activeProjects', () => {
      const assigned = { ...similarTxs[0], budgetId: 'proj-2' };
      setUp(assigned, [assigned]);
      component.activeProjects = activeProjects;

      expect(component['selectedProjectName']()).toBe('Obras Casa');
    });

    it('selectedProjectName is undefined when the transaction has no budgetId', () => {
      setUp(similarTxs[0], similarTxs);
      component.activeProjects = activeProjects;

      expect(component['selectedProjectName']()).toBeUndefined();
    });

    it('does not auto-resolve a vacation project from its date window alone, without an explicit budgetId', () => {
      const duringVacation: Transaction = { ...similarTxs[0], date: '2026-08-10', budgetId: undefined };
      setUp(duringVacation, [duringVacation]);
      component.activeProjects = [
        {
          id: 'proj-vacation', name: 'Algarve Holiday 2026', type: 'project', amount: 1000,
          kind: 'vacation', projectStartDate: '2026-08-01', projectEndDate: '2026-08-15'
        } as never
      ];

      expect(component['selectedProjectName']()).toBeUndefined();
    });

    it('resolves a vacation project when the transaction has been explicitly assigned via budgetId', () => {
      const duringVacation: Transaction = { ...similarTxs[0], date: '2026-08-10', budgetId: 'proj-vacation' };
      setUp(duringVacation, [duringVacation]);
      component.activeProjects = [
        {
          id: 'proj-vacation', name: 'Algarve Holiday 2026', type: 'project', amount: 1000,
          kind: 'vacation', projectStartDate: '2026-08-01', projectEndDate: '2026-08-15'
        } as never
      ];

      expect(component['selectedProjectName']()).toBe('Algarve Holiday 2026');
    });

    it('preserves project assignment made in the same session when recategorizing', () => {
      setUp(similarTxs[0], similarTxs);
      component.activeProjects = activeProjects;
      const budgetSpy = vi.fn();
      const categorySpy = vi.fn();
      component.budgetApplied.subscribe(budgetSpy);
      component.categoryApplied.subscribe(categorySpy);

      component['onProjectSelectChange']('proj-1');
      expect(budgetSpy).toHaveBeenCalledWith({ transactionId: similarTxs[0].id, budgetId: 'proj-1' });

      component['onCategorySelectChange']('Healthcare');
      component['onMlCancel']();

      expect(categorySpy).toHaveBeenCalledWith({
        updatedTransactions: [{ ...similarTxs[0], category: 'Healthcare', budgetId: 'proj-1' }],
        keyword: '',
        targetCategory: 'Healthcare'
      });
    });
  });
});
