import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { PortfolioSelectors } from './portfolio.selectors';
import { BudgetSelectors } from './budget.selectors';
import { APP_STORE_TOKEN } from '@application/app-store';
import { createMockStore, MockAppStore } from '@/mocks/store.mock';
import { Budget } from '@domain/models/budget';
import { MOCK_SCENARIO_TRADE_REPUBLIC_POSITIONS } from '@/mocks/transactions.mock';

const house: Budget = {
  id: 'w-house', name: 'Casa', type: 'investment', amount: 100000,
  kind: 'house', outstandingDebt: 64907.06, appreciationPercent: 25,
  paidInstalments: 84, contractedInstalments: 480, isClosed: false
};

const car: Budget = {
  id: 'w-car', name: 'Carro', type: 'investment', amount: 18000,
  kind: 'car', outstandingDebt: 9000, isClosed: false
};

const ppr: Budget = {
  id: 'w-ppr', name: 'PPR Ageas', type: 'investment', amount: 2000,
  kind: 'retirement', currentValue: 2086.71, isClosed: false
};

const certificates: Budget = {
  id: 'w-cert', name: 'Certificados', type: 'investment', amount: 4000,
  kind: 'savings_certificate', isClosed: false
};

describe('PortfolioSelectors — what counts as investment and what counts as property', () => {
  let selectors: PortfolioSelectors;
  let store: MockAppStore;

  beforeEach(() => {
    store = createMockStore();
    store.transactions.set([]);
    store.budgets.set([house, car, ppr, certificates]);

    TestBed.configureTestingModule({
      providers: [
        { provide: APP_STORE_TOKEN, useValue: store },
        { provide: BudgetSelectors, useValue: { walletBalance: signal(1000), freeBalance: signal(1000), investmentBalance: signal(0) } },
        PortfolioSelectors
      ]
    });
    selectors = TestBed.inject(PortfolioSelectors);
  });

  it('keeps houses and cars out of the invested value', () => {
    expect(selectors.investedValue()).toBe(6086.71);
  });

  it('counts a pension plan at its declared valuation', () => {
    expect(selectors.financialWallets().map(w => w.id).sort()).toEqual(['w-cert', 'w-ppr']);
  });

  it('counts a house and a car by what is already paid off the credit', () => {
    expect(selectors.propertyWallets().map(w => w.id).sort()).toEqual(['w-car', 'w-house']);
    expect(selectors.assetsValue()).toBe(44092.94);
  });

  it('never lets an appreciation estimate reach the assets total', () => {
    store.budgets.set([{ ...house, appreciationPercent: 200 }]);
    expect(selectors.assetsValue()).toBe(35092.94);
  });

  it('adds accounts, investments and assets into the net worth', () => {
    expect(selectors.totalPatrimony()).toBe(51179.65);
  });

  it('adds broker positions to the invested value, never to the assets', () => {
    store.transactions.set([...MOCK_SCENARIO_TRADE_REPUBLIC_POSITIONS]);

    expect(selectors.investedValue()).toBe(6332.71);
    expect(selectors.assetsValue()).toBe(44092.94);
  });

  it('counts cash sitting in the broker account, which is money the owner holds like any other', () => {
    TestBed.resetTestingModule();
    const localStore = createMockStore();
    localStore.transactions.set([]);
    localStore.budgets.set([ppr]);
    TestBed.configureTestingModule({
      providers: [
        { provide: APP_STORE_TOKEN, useValue: localStore },
        { provide: BudgetSelectors, useValue: { walletBalance: signal(1000), freeBalance: signal(1000), investmentBalance: signal(250) } },
        PortfolioSelectors
      ]
    });
    const withCash = TestBed.inject(PortfolioSelectors);

    expect(withCash.brokerCash()).toBe(250);
    expect(withCash.totalPatrimony()).toBe(3336.71);
  });

  it('separates what can be spent today from what is locked into positions and property', () => {
    expect(selectors.accessibleValue()).toBe(1000);
    expect(selectors.lockedValue()).toBe(50179.65);
  });

  it('reports what is still owed to the bank, with the patrimony already net of it', () => {
    expect(selectors.outstandingDebt()).toBe(73907.06);
    expect(selectors.assetsValue()).toBe(44092.94);
  });

  it('sums the dividends and interest the positions have already paid out', () => {
    store.transactions.set([...MOCK_SCENARIO_TRADE_REPUBLIC_POSITIONS]);

    expect(selectors.receivedIncome()).toBeGreaterThanOrEqual(0);
  });

  it('drops an archived wallet from both totals', () => {
    store.budgets.set([{ ...ppr, isClosed: true }, { ...house, isClosed: true }]);

    expect(selectors.investedValue()).toBe(0);
    expect(selectors.assetsValue()).toBe(0);
  });
});
