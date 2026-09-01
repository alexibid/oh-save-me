import {
  Budget,
  walletAppreciatedEstimate,
  walletPaidAmount,
  walletValuationGain,
  walletValue
} from './budget';

const house: Budget = {
  id: 'w-house', name: 'Casa', type: 'investment', amount: 100000,
  kind: 'house', outstandingDebt: 64907.06,
  paidInstalments: 84, contractedInstalments: 480, isClosed: false
};

const ppr: Budget = {
  id: 'w-ppr', name: 'PPR Ageas', type: 'investment', amount: 2000,
  kind: 'retirement', currentValue: 2086.71, isClosed: false
};

describe('walletPaidAmount', () => {
  it('is what was already paid off the credit', () => {
    expect(walletPaidAmount(house)).toBe(35092.94);
  });

  it('treats a credit with no debt recorded as fully paid', () => {
    expect(walletPaidAmount({ ...house, outstandingDebt: undefined })).toBe(100000);
  });

  it('never goes negative when the debt exceeds the contracted amount', () => {
    expect(walletPaidAmount({ ...house, outstandingDebt: 120000 })).toBe(0);
  });
});

describe('walletValue', () => {
  it('counts only what is already paid towards the net worth', () => {
    expect(walletValue(house)).toBe(35092.94);
  });

  it('leaves the net worth untouched by an appreciation estimate', () => {
    expect(walletValue({ ...house, appreciationPercent: 25 })).toBe(35092.94);
  });

  it('leaves the net worth untouched by a depreciation estimate either', () => {
    const car: Budget = { ...house, kind: 'car', amount: 18000, outstandingDebt: 9000, appreciationPercent: -40 };
    expect(walletValue(car)).toBe(9000);
  });

  it('uses the declared valuation for an asset with no credit behind it', () => {
    expect(walletValue(ppr)).toBe(2086.71);
  });
});

describe('walletValuationGain', () => {
  it('reports the gain of a revalued financial asset', () => {
    expect(walletValuationGain(ppr)).toBe(86.71);
  });

  it('never turns an appreciation estimate into a gain', () => {
    expect(walletValuationGain({ ...house, appreciationPercent: 25 })).toBe(0);
  });
});

describe('walletAppreciatedEstimate', () => {
  it('is absent while no percentage was given', () => {
    expect(walletAppreciatedEstimate(house)).toBeUndefined();
  });

  it('applies the percentage to the paid share, for information only', () => {
    expect(walletAppreciatedEstimate({ ...house, appreciationPercent: 25 })).toBe(43866.18);
  });

  it('handles a depreciating car', () => {
    const car: Budget = { ...house, kind: 'car', amount: 18000, outstandingDebt: 9000, appreciationPercent: -40 };
    expect(walletAppreciatedEstimate(car)).toBe(5400);
  });

  it('is absent for an asset with no credit behind it', () => {
    expect(walletAppreciatedEstimate({ ...ppr, appreciationPercent: 10 })).toBeUndefined();
  });
});
