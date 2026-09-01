import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { vi } from 'vitest';
import { AllocationWizardDialogComponent } from './allocation-wizard-dialog';
import { APP_STORE_TOKEN } from '@application/app-store';
import { I18nService } from '@application/i18n.service';
import { I18nService as UiI18nService } from '@ui/shared/i18n-shared';
import { createMockStore, MockAppStore } from '@/mocks/store.mock';

describe('AllocationWizardDialogComponent — loan backed wallets', () => {
  let fixture: ComponentFixture<AllocationWizardDialogComponent>;
  let component: AllocationWizardDialogComponent;
  let store: MockAppStore;

  const i18nStub = {
    currentLang: signal('en'),
    onLangChange: signal('en'),
    translate: (key: string) => key,
    getCategoryName: (key: string) => key,
    formatCurrency: (value: number) => value.toString(),
    currencySymbol: () => '€',
    currency: () => 'EUR',
    locale: () => 'pt-PT'
  };

  beforeEach(async () => {
    store = createMockStore();

    await TestBed.configureTestingModule({
      imports: [AllocationWizardDialogComponent],
      providers: [
        provideHttpClient(),
        { provide: APP_STORE_TOKEN, useValue: store },
        { provide: DialogRef, useValue: { close: vi.fn() } },
        { provide: DIALOG_DATA, useValue: { mode: 'investment' } },
        { provide: I18nService, useValue: i18nStub },
        { provide: UiI18nService, useValue: i18nStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AllocationWizardDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('asks for instalments only on a house or a car', () => {
    expect(component['isLoanBacked']()).toBe(false);

    component['setWalletKind']('house');
    expect(component['isLoanBacked']()).toBe(true);

    component['setWalletKind']('car');
    expect(component['isLoanBacked']()).toBe(true);

    component['setWalletKind']('stocks');
    expect(component['isLoanBacked']()).toBe(false);
  });

  it('never asks a house for a record date, only for its instalments', () => {
    component['setWalletKind']('house');
    component['budgetName'] = 'Casa';
    component['budgetAmount'] = 250000;
    component['registerDate'] = '';
    component['paidInstalments'] = 84;
    component['contractedInstalments'] = 480;
    component['outstandingDebt'] = 64907.06;

    expect(component['canSubmitInvestment']()).toBe(true);
  });

  it('refuses to save a house without both instalment counts', () => {
    component['setWalletKind']('house');
    component['budgetName'] = 'Casa';
    component['budgetAmount'] = 250000;

    expect(component['canSubmitInvestment']()).toBe(false);

    component['paidInstalments'] = 84;
    expect(component['canSubmitInvestment']()).toBe(false);

    component['contractedInstalments'] = 480;
    expect(component['canSubmitInvestment']()).toBe(false);

    component['outstandingDebt'] = 64907.06;
    expect(component['canSubmitInvestment']()).toBe(true);
  });

  it('refuses a credit that owes more than was ever contracted', () => {
    component['setWalletKind']('house');
    component['budgetName'] = 'Casa';
    component['budgetAmount'] = 100000;
    component['paidInstalments'] = 84;
    component['contractedInstalments'] = 480;
    component['outstandingDebt'] = 120000;

    expect(component['canSubmitInvestment']()).toBe(false);
  });

  it('accepts a loan that has just started, with zero instalments paid', () => {
    component['setWalletKind']('car');
    component['budgetName'] = 'Carro';
    component['budgetAmount'] = 18000;
    component['paidInstalments'] = 0;
    component['contractedInstalments'] = 60;
    component['outstandingDebt'] = 18000;

    expect(component['canSubmitInvestment']()).toBe(true);
  });

  it('stores the loan start and both instalment counts', async () => {
    component['setWalletKind']('house');
    component['budgetName'] = 'Casa Lisboa';
    component['budgetAmount'] = 250000;
    component['paidInstalments'] = 84;
    component['contractedInstalments'] = 480;
    component['outstandingDebt'] = 64907.06;

    await component['onSubmitBudget']();

    const saved = store.addBudget.mock.calls[0][0];
    expect(saved.type).toBe('investment');
    expect(saved.kind).toBe('house');
    expect(saved.paidInstalments).toBe(84);
    expect(saved.contractedInstalments).toBe(480);
    expect(saved.outstandingDebt).toBe(64907.06);
  });

  it('dates the asset back by however many instalments were already paid', async () => {
    component['setWalletKind']('car');
    component['budgetName'] = 'Carro';
    component['budgetAmount'] = 18000;
    component['paidInstalments'] = 6;
    component['contractedInstalments'] = 60;
    component['outstandingDebt'] = 16000;

    await component['onSubmitBudget']();

    const expected = new Date();
    expected.setMonth(expected.getMonth() - 6);
    const saved = store.addBudget.mock.calls[0][0];

    expect(saved.startDate!.slice(0, 7)).toBe(expected.toISOString().slice(0, 7));
  });

  it('refuses a loan where more instalments were paid than were ever contracted', () => {
    component['setWalletKind']('house');
    component['budgetName'] = 'Casa';
    component['budgetAmount'] = 100000;
    component['paidInstalments'] = 500;
    component['contractedInstalments'] = 480;

    expect(component['canSubmitInvestment']()).toBe(false);
  });

  it('refuses a loan with no contracted instalments at all', () => {
    component['setWalletKind']('house');
    component['budgetName'] = 'Casa';
    component['budgetAmount'] = 100000;
    component['paidInstalments'] = 84;
    component['contractedInstalments'] = 0;

    expect(component['canSubmitInvestment']()).toBe(false);
  });

  it('never carries instalments over to a wallet with no credit behind it', async () => {
    component['setWalletKind']('house');
    component['paidInstalments'] = 84;
    component['contractedInstalments'] = 480;

    component['setWalletKind']('retirement');
    component['budgetName'] = 'PPR';
    component['budgetAmount'] = 3500;

    await component['onSubmitBudget']();

    const saved = store.addBudget.mock.calls[0][0];
    expect(saved.paidInstalments).toBeUndefined();
    expect(saved.contractedInstalments).toBeUndefined();
  });
});
