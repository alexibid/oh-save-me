import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Budget } from '@domain/models/budget';
import { MlConfirmationDialogComponent } from './ml-confirmation-dialog';
import { DialogModule } from '@angular/cdk/dialog';
import { Transaction } from '@domain/models/transaction';

describe('MlConfirmationDialogComponent', () => {
  let component: MlConfirmationDialogComponent;
  let fixture: ComponentFixture<MlConfirmationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MlConfirmationDialogComponent,
        DialogModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MlConfirmationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize selection and category maps correctly', () => {
    const txs: Transaction[] = [
      { id: 'tx-1', date: '2026-07-23', description: 'Uber Trip', amount: -10, category: 'Others' },
      { id: 'tx-2', date: '2026-07-24', description: 'Uber Trip 2', amount: -15, category: 'Others' }
    ];

    component.transactions = txs;
    component.allTransactions = txs;
    component.targetCategory = 'Transportation';
    component.triggerTransaction = { id: 'tx-0', date: '2026-07-22', description: 'Uber Trip', amount: -12, category: 'Transportation' };
    component.visible = true;

    component.ngOnChanges({
      visible: {
        currentValue: true,
        previousValue: false,
        firstChange: true,
        isFirstChange: () => true
      }
    });

    expect(component['isSelected']('tx-1')).toBe(true);
    expect(component['selectedCount']()).toBe(2);

    component['toggleSelectionId']('tx-1');
    expect(component['isSelected']('tx-1')).toBe(false);
    expect(component['selectedCount']()).toBe(1);

    component['toggleSelectionId']('tx-1');
    expect(component['isSelected']('tx-1')).toBe(true);
  });

  it('should toggle sort fields and directions', () => {
    component['toggleSort']('date');
    expect(component['sortField']()).toBe('date');
    expect(component['sortDirection']()).toBe('desc');

    component['toggleSort']('date');
    expect(component['sortDirection']()).toBe('asc');

    component['toggleSort']('description');
    expect(component['sortField']()).toBe('description');
    expect(component['sortDirection']()).toBe('asc');

    component['toggleSort']('category');
    expect(component['sortField']()).toBe('category');

    component['toggleSort']('amount');
    expect(component['sortField']()).toBe('amount');
  });

  it('should get project name for transaction', () => {
    component.activeProjects = [{ id: 'b-1', name: 'Summer Trip' } as unknown as Budget];
    expect(component['getProjectNameFor']({ id: 't1', budgetId: 'b-1' } as unknown as Transaction)).toBe('Summer Trip');
    expect(component['getProjectNameFor']({ id: 't2' } as unknown as Transaction)).toBeUndefined();
  });

  it('should handle keyword input and confirmation emit', () => {
    const confirmSpy = vi.spyOn(component.confirm, 'emit');
    const tx1: Transaction = { id: 'tx-1', date: '2026-07-23', description: 'Uber Trip', amount: -10, category: 'Others', budgetId: 'vacation' };

    component.allTransactions = [tx1];
    component.transactions = [tx1];
    component.targetCategory = 'Transportation';
    component.triggerTransaction = { id: 'tx-0', date: '2026-07-22', description: 'Uber', amount: -12, category: 'Transportation' };

    const event = { target: { value: 'Uber' } } as unknown as Event;
    component['onKeywordInput'](event);
    expect(component['keyword']()).toBe('Uber');

    component['onConfirm']();
    expect(confirmSpy).toHaveBeenCalledWith({
      updatedTransactions: [{
        ...tx1,
        category: 'Transportation',
        budgetId: 'vacation'
      }],
      keyword: 'Uber'
    });
  });

  it('should handle cancel emit', () => {
    const cancelSpy = vi.spyOn(component.cancelled, 'emit');
    component['onCancel']();
    expect(cancelSpy).toHaveBeenCalled();
  });

  it('should sort similar transactions', () => {
    const txs: Transaction[] = [
      { id: 'tx-1', date: '2026-07-23', description: 'B Supermarket', amount: -20, category: 'groceries' },
      { id: 'tx-2', date: '2026-07-24', description: 'A Bakery', amount: -5, category: 'food' }
    ];

    component.transactions = txs;
    component.targetCategory = 'groceries';
    expect(component['sortedSimilarTransactions']().length).toBe(2);

    component['toggleSort']('description');
    const sorted = component['sortedSimilarTransactions']();
    expect(sorted[0].description).toBe('A Bakery');

    component['toggleSort']('amount');
    const sortedAmount = component['sortedSimilarTransactions']();
    expect(sortedAmount.length).toBe(2);
  });
});
