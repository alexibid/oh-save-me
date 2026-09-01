import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BalanceSummaryCard } from './balance-summary-card';
import { I18nService } from '@application/i18n.service';
import { I18nService as UiI18nService } from '@ui/shared/i18n-shared';
import { signal } from '@angular/core';
import { provideAppI18n } from '@application/i18n.service';

describe('BalanceSummaryCard', () => {
  let fixture: ComponentFixture<BalanceSummaryCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BalanceSummaryCard],
      providers: [
        ...provideAppI18n(),
        { provide: I18nService, useValue: { currentLang: signal('en'), onLangChange: signal('en'), translate: (k: string) => k, formatCurrency: (v: number) => v.toString() } },
        { provide: UiI18nService, useValue: { currentLang: signal('en'), onLangChange: signal('en'), translate: (k: string) => k, formatCurrency: (v: number) => v.toString() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BalanceSummaryCard);
    fixture.componentRef.setInput('freeBalance', 0);
    fixture.componentRef.setInput('totalWalletBalance', 0);
    fixture.componentRef.setInput('activeProjectReserve', 0);
    fixture.componentRef.setInput('categoryRemainingReserve', 0);
    fixture.componentRef.setInput('categoryOverspendTotal', 0);
    fixture.detectChanges();
  });

  it('leads with the net worth and drops the budget rows in portfolio mode', () => {
    fixture.componentRef.setInput('mode', 'portfolio');
    fixture.componentRef.setInput('totalPatrimony', 52206.78);
    fixture.componentRef.setInput('investedValue', 3446.96);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(fixture.nativeElement.querySelector('.m-balance-summary-card__value').textContent).toContain('52206.78');
    expect(text).toContain('metricsInvestedValue');
    expect(text).not.toContain('budgetLabelReservedProjects');
    expect(text).not.toContain('budgetLabelReservedCategories');
  });

  it('shows the realised result only once a position was closed', () => {
    fixture.componentRef.setInput('mode', 'portfolio');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('walletLabelRealizedResult');

    fixture.componentRef.setInput('realizedResult', 4.06);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('walletLabelRealizedResult');
  });

  it('keeps the budget rows in budget mode', () => {
    expect(fixture.nativeElement.textContent).toContain('budgetLabelReservedProjects');
    expect(fixture.nativeElement.textContent).toContain('budgetLabelReservedCategories');
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('omits the overspend annotation when no category went over budget', () => {
    expect(fixture.nativeElement.querySelector('.m-balance-summary-card__overspend')).toBeNull();
  });

  it('annotates the categories row with the overspend total when a category went over budget', () => {
    fixture.componentRef.setInput('categoryOverspendTotal', 17.33);
    fixture.detectChanges();

    const annotation = fixture.nativeElement.querySelector('.m-balance-summary-card__overspend');
    expect(annotation).not.toBeNull();
    expect(annotation.textContent).toContain('17.33');
  });

  it('keeps the overspend annotation out of the free balance, which stays driven solely by its own input', () => {
    fixture.componentRef.setInput('freeBalance', 900);
    fixture.componentRef.setInput('categoryRemainingReserve', -100);
    fixture.componentRef.setInput('categoryOverspendTotal', 100);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.m-balance-summary-card__value').textContent).toContain('900');
  });
});
