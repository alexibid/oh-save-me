import { computeSuggestedCategoryBudget, classifyOutliers, computeAverageForSelection, computeSuggestedCategoryBudgetFromMovements } from './budget-suggestion.utils';

describe('computeSuggestedCategoryBudget', () => {
  it('returns zeroed suggestion for no history', () => {
    expect(computeSuggestedCategoryBudget([])).toEqual({
      average: 0,
      includedMonths: 0,
      excludedOutlierMonths: 0
    });
  });

  it('uses a plain average with no outlier removal when there is less than 4 months of history', () => {
    const result = computeSuggestedCategoryBudget([100, 200, 150]);

    expect(result).toEqual({ average: 150, includedMonths: 3, excludedOutlierMonths: 0 });
  });

  it('excludes an IQR outlier month and averages only the remaining ones (4+ months of history)', () => {

    const result = computeSuggestedCategoryBudget([100, 110, 105, 500]);

    expect(result).toEqual({ average: 105, includedMonths: 3, excludedOutlierMonths: 1 });
  });

  it('keeps every month when nothing falls outside the IQR bounds', () => {
    const result = computeSuggestedCategoryBudget([100, 105, 110, 115]);

    expect(result.excludedOutlierMonths).toBe(0);
    expect(result.includedMonths).toBe(4);
    expect(result.average).toBe(107.5);
  });

  it('rounds the average to 2 decimal places', () => {
    const result = computeSuggestedCategoryBudget([100, 100, 100.01]);

    expect(result.average).toBe(100);
  });
});

describe('computeAverageForSelection', () => {
  it('averages only the months explicitly marked as included', () => {
    const result = computeAverageForSelection([
      { value: 100, included: true },
      { value: 110, included: true },
      { value: 500, included: false }
    ]);

    expect(result).toEqual({ average: 105, includedMonths: 2, excludedOutlierMonths: 1 });
  });

  it('returns a zeroed suggestion when every month is excluded', () => {
    const result = computeAverageForSelection([
      { value: 100, included: false },
      { value: 500, included: false }
    ]);

    expect(result).toEqual({ average: 0, includedMonths: 0, excludedOutlierMonths: 2 });
  });

  it('returns a zeroed suggestion for an empty selection', () => {
    expect(computeAverageForSelection([])).toEqual({ average: 0, includedMonths: 0, excludedOutlierMonths: 0 });
  });

  it('rounds the average to 2 decimal places', () => {
    const result = computeAverageForSelection([
      { value: 100, included: true },
      { value: 100, included: true },
      { value: 100.01, included: true }
    ]);

    expect(result.average).toBe(100);
  });
});

describe('classifyOutliers', () => {
  it('flags the single IQR outlier and leaves the rest unflagged', () => {
    const result = classifyOutliers([100, 110, 105, 500]);

    expect(result).toEqual([
      { value: 100, isOutlier: false },
      { value: 110, isOutlier: false },
      { value: 105, isOutlier: false },
      { value: 500, isOutlier: true }
    ]);
  });

  it('flags nothing with fewer than 4 values (not enough data for a quartile split)', () => {
    const result = classifyOutliers([100, 105, 5000]);

    expect(result.every(r => !r.isOutlier)).toBe(true);
  });

  it('flags nothing when every value is within the IQR bounds', () => {
    const result = classifyOutliers([100, 105, 110, 115]);

    expect(result.every(r => !r.isOutlier)).toBe(true);
  });
});

describe('computeSuggestedCategoryBudgetFromMovements', () => {
  it('aggregates transactions of the same month and counts month units', () => {
    const movements = [
      { value: 50, monthKey: '2026-01' },
      { value: 50, monthKey: '2026-01' },
      { value: 120, monthKey: '2026-02' },
      { value: 80, monthKey: '2026-03' }
    ];
    const result = computeSuggestedCategoryBudgetFromMovements(movements);
    expect(result.includedMonths).toBe(3);
    expect(result.excludedOutlierMonths).toBe(0);
    expect(result.average).toBe(100);
  });
});
