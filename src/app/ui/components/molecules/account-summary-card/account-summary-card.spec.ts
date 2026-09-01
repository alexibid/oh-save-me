import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AccountSummaryCardComponent } from './account-summary-card';
import { ViewMoreLinkComponent } from 'ibid-ui';

describe('AccountSummaryCardComponent', () => {
  let component: AccountSummaryCardComponent;
  let fixture: ComponentFixture<AccountSummaryCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountSummaryCardComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(AccountSummaryCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render the account name, type and formatted balance', () => {
    component.accountName = 'Conta à Ordem CGD';
    component.accountTypeLabel = 'Conta à Ordem';
    component.walletBalance = 5943.62;
    component.periodCashflow = 250.15;
    component.totalIncome = 1200;
    component.totalExpenses = -949.85;
    component.lastUpdateDate = '2026-07-31';
    component.periodStartDate = '2026-07-01';
    component.periodEndDate = '2026-07-31';
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Conta à Ordem CGD');
    expect(text).toContain('Conta à Ordem');
  });

  it('should render a "view more" link scoped to this card\'s account id', () => {
    component.accountName = 'Conta à Ordem CGD';
    component.accountTypeLabel = 'Conta à Ordem';
    component.accountId = 'acc-123';
    component.walletBalance = 100;
    component.periodCashflow = 0;
    component.totalIncome = 0;
    component.totalExpenses = 0;
    fixture.detectChanges();

    const viewMoreLink = fixture.debugElement.query(By.directive(ViewMoreLinkComponent))
      .componentInstance as ViewMoreLinkComponent;

    expect(viewMoreLink.accountId).toBe('acc-123');
  });

  it('shows the credit-installment caveat only for credit_card accounts', () => {
    component.accountName = 'Cartão Universo';
    component.accountTypeLabel = 'Cartão de Crédito';
    component.accountType = 'credit_card';
    component.walletBalance = -100;
    component.periodCashflow = 0;
    component.totalIncome = 0;
    component.totalExpenses = 0;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.o-metrics-summary-card__caveat')).toBeTruthy();
  });

  it('hides the credit-installment caveat for non-credit_card accounts', () => {
    component.accountName = 'Conta à Ordem CGD';
    component.accountTypeLabel = 'Conta à Ordem';
    component.accountType = 'bank_account';
    component.walletBalance = 100;
    component.periodCashflow = 0;
    component.totalIncome = 0;
    component.totalExpenses = 0;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.o-metrics-summary-card__caveat')).toBeNull();
  });

  it('should mark a negative wallet balance with the danger class', () => {
    component.accountName = 'Cartão Universo';
    component.accountTypeLabel = 'Cartão de Crédito';
    component.walletBalance = -1125.66;
    component.periodCashflow = -300;
    component.totalIncome = 0;
    component.totalExpenses = -300;
    fixture.detectChanges();

    const value = fixture.nativeElement.querySelector('.o-metrics-summary-card__value');
    expect(value.classList).toContain('o-metrics-summary-card__value--danger');
  });
});
