import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CategoryBudgetCardComponent } from './category-budget-card';
import { BudgetProgress } from '@application/selectors/budget.selectors';
import { Budget } from '@domain/models/budget';
import { I18nService, provideAppI18n } from '@application/i18n.service';

describe('CategoryBudgetCardComponent', () => {
  let fixture: ComponentFixture<CategoryBudgetCardComponent>;
  let component: CategoryBudgetCardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryBudgetCardComponent],
      providers: [...provideAppI18n()]
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryBudgetCardComponent);
    component = fixture.componentInstance;
    await TestBed.inject(I18nService).setLanguage('pt');
  });

  it('should create', () => {
    fixture.componentRef.setInput('categoryName', 'Groceries');
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renders progress info when budget progress is provided', () => {
    const budget: Budget = { id: 'b-1', name: 'Groceries', type: 'category', categoryId: 'Groceries', amount: 100 };
    const progress: BudgetProgress = {
      budget,
      spent: 60,
      percentage: 60,
      remaining: 40,
      isOverBudget: false,
      status: 'active',
      accumulatedReserve: 0,
      periodAllocation: 0,
      progressColor: '#10b981'
    };

    fixture.componentRef.setInput('categoryName', 'Groceries');
    fixture.componentRef.setInput('budgetProgress', progress);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Groceries');
    expect(text).toContain('40,00 €');
    expect(text).toContain('60,00 €');
    expect(text).toContain('100,00 €');
  });

  it('labels the amount as over budget and shows it positive when the budget is exceeded', () => {
    const budget: Budget = { id: 'b-2', name: 'Groceries', type: 'category', categoryId: 'Groceries', amount: 100 };
    const progress: BudgetProgress = {
      budget,
      spent: 125,
      percentage: 125,
      remaining: -25,
      isOverBudget: true,
      status: 'active',
      accumulatedReserve: 0,
      periodAllocation: 0,
      progressColor: '#ef4444'
    };

    fixture.componentRef.setInput('categoryName', 'Groceries');
    fixture.componentRef.setInput('budgetProgress', progress);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Acima do orçamento');
    expect(text).not.toContain('Restante');
    expect(text).toContain('25,00 €');
    expect(text).not.toContain('-25,00 €');
  });

  it('emits editBudgetClick when the card is clicked', () => {
    const emitted = vi.fn();
    component.editBudgetClick.subscribe(emitted);

    fixture.componentRef.setInput('categoryName', 'Groceries');
    fixture.detectChanges();

    const card = fixture.debugElement.query(By.css('ibid-card'));
    card.triggerEventHandler('click', null);

    expect(emitted).toHaveBeenCalled();
  });
});
