import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SumMovementsPanelComponent } from './sum-movements-panel';
import { Transaction } from '@domain/models/transaction';
import { I18nService } from '@ui/shared/i18n-shared';

describe('SumMovementsPanelComponent', () => {
  let component: SumMovementsPanelComponent;
  let fixture: ComponentFixture<SumMovementsPanelComponent>;

  const mockI18nService = {
    t: () => ({
      sumMovementsTitle: 'Add Up Movements',
      sumMovementsBalance: 'Balance',
      sumMovementsIncome: 'Income',
      sumMovementsExpenses: 'Expenses',
      sumMovementsEmpty: 'Select movements to add up'
    }),
    currentLang: () => 'pt',
    getCategoryName: (id: string) => id
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SumMovementsPanelComponent],
      providers: [{ provide: I18nService, useValue: mockI18nService }]
    }).compileComponents();

    fixture = TestBed.createComponent(SumMovementsPanelComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('emits enabledChange with the toggled value when the toggle is clicked', () => {
    component.enabled = false;
    fixture.detectChanges();
    const emitted = vi.fn();
    component.enabledChange.subscribe(emitted);

    component['onToggle']();

    expect(emitted).toHaveBeenCalledWith(true);
  });

  describe('totals', () => {
    const txs: Transaction[] = [
      { id: 't1', date: '2026-08-01', description: 'Salary', amount: 1000, category: 'Income' },
      { id: 't2', date: '2026-08-02', description: 'Groceries', amount: -50, category: 'Groceries' },
      { id: 't3', date: '2026-08-03', description: 'Rent', amount: -300, category: 'Housing' }
    ];

    it('sums positive selected amounts as income', () => {
      component.transactions = txs;
      expect(component['totalIncome']).toBe(1000);
    });

    it('sums negative selected amounts as expenses', () => {
      component.transactions = txs;
      expect(component['totalExpenses']).toBe(-350);
    });

    it('computes balance as income + expenses', () => {
      component.transactions = txs;
      expect(component['totalBalance']).toBe(650);
    });

    it('reports zero totals for an empty selection', () => {
      component.transactions = [];
      expect(component['totalIncome']).toBe(0);
      expect(component['totalExpenses']).toBe(0);
      expect(component['totalBalance']).toBe(0);
    });
  });
});
