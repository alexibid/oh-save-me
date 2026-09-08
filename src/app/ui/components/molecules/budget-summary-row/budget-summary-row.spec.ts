import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BudgetSummaryRowComponent } from './budget-summary-row';
import { I18nService } from '@ui/shared/i18n-shared';
import { I18nService as IbidI18nService } from '@ibid/services';

describe('BudgetSummaryRowComponent', () => {
  let fixture: ComponentFixture<BudgetSummaryRowComponent>;

  const mockI18nService = { formatCurrency: (v: number) => `${v.toFixed(2)} €` };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BudgetSummaryRowComponent],
      providers: [
        { provide: I18nService, useValue: mockI18nService },
        { provide: IbidI18nService, useValue: mockI18nService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BudgetSummaryRowComponent);
    fixture.componentRef.setInput('label', 'general budget');
    fixture.componentRef.setInput('value', 220);
  });

  it('renders the label', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('general budget');
  });

  it('renders the formatted value', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('220.00 €');
  });

  it('emits rowClick when the row is clicked', () => {
    fixture.detectChanges();
    const spy = vi.fn();
    fixture.componentInstance.rowClick.subscribe(spy);

    fixture.nativeElement.querySelector('.m-budget-summary-row').click();

    expect(spy).toHaveBeenCalled();
  });
});
