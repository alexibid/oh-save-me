import { extractColumnFeatures, COLUMN_FEATURE_NAMES } from './column-classifier-features';

function featureValue(features: readonly number[], name: string): number {
  const index = COLUMN_FEATURE_NAMES.indexOf(name);
  expect(index).toBeGreaterThanOrEqual(0);
  return features[index];
}

describe('extractColumnFeatures', () => {
  it('produces one value per declared feature name', () => {
    const features = extractColumnFeatures('Data Mov.', 0, 5, ['23-07-2026', '22-07-2026']);
    expect(features.length).toBe(COLUMN_FEATURE_NAMES.length);
  });

  it('sets the bias feature to a constant 1', () => {
    const features = extractColumnFeatures('anything', 0, 1, []);
    expect(featureValue(features, 'bias')).toBe(1);
  });

  it('flags kw_date for a header matching the date keyword dictionary, and no other kw_ feature', () => {
    const features = extractColumnFeatures('Data', 0, 3, ['23-07-2026']);

    expect(featureValue(features, 'kw_date')).toBe(1);
    COLUMN_FEATURE_NAMES.filter(name => name.startsWith('kw_') && name !== 'kw_date').forEach(name => {
      expect(featureValue(features, name)).toBe(0);
    });
  });

  it('computes a dateParseRate strictly between 0 and 1 for a mixed valid/garbage date column', () => {
    const features = extractColumnFeatures('Data', 0, 2, ['23-07-2026', 'not a date', '22-07-2026', 'garbage']);
    const rate = featureValue(features, 'dateParseRate');

    expect(rate).toBeGreaterThan(0);
    expect(rate).toBeLessThan(1);
  });

  it('gives a low uniqueValueRatio for an enum-like column (few distinct repeated values)', () => {
    const features = extractColumnFeatures('Type', 0, 2, ['BUY', 'SELL', 'BUY', 'BUY', 'SELL', 'BUY']);
    expect(featureValue(features, 'uniqueValueRatio')).toBeLessThan(0.5);
  });

  it('gives a high uniqueValueRatio for a near-unique column (e.g. an account/reference number)', () => {
    const features = extractColumnFeatures('Ref', 0, 2, ['A1', 'A2', 'A3', 'A4']);
    expect(featureValue(features, 'uniqueValueRatio')).toBe(1);
  });

  it('does not divide by zero when there is only a single column', () => {
    const features = extractColumnFeatures('Data', 0, 1, ['23-07-2026']);
    expect(featureValue(features, 'columnPositionRatio')).toBe(0);
    expect(Number.isFinite(featureValue(features, 'columnPositionRatio'))).toBe(true);
  });

  it('places columnPositionRatio at 0 for the first column and 1 for the last', () => {
    const first = extractColumnFeatures('Data', 0, 4, ['x']);
    const last = extractColumnFeatures('Name', 3, 4, ['x']);
    expect(featureValue(first, 'columnPositionRatio')).toBe(0);
    expect(featureValue(last, 'columnPositionRatio')).toBe(1);
  });

  it('reports full emptyValueRatio for an entirely empty sampled column', () => {
    const features = extractColumnFeatures('Descricao', 0, 2, ['', '', '']);
    expect(featureValue(features, 'emptyValueRatio')).toBe(1);
    expect(featureValue(features, 'dateParseRate')).toBe(0);
    expect(featureValue(features, 'numericParseRate')).toBe(0);
  });

  it('flags codeRate for an ISIN-like alphanumeric column', () => {
    const features = extractColumnFeatures('Symbol', 0, 3, ['IE00B4L5Y983', 'US0378331005']);
    expect(featureValue(features, 'codeRate')).toBe(1);
  });

  it('distinguishes integer share counts (high integerRate) from decimal prices (low integerRate)', () => {
    const shares = extractColumnFeatures('Shares', 0, 3, ['1', '2', '10']);
    const prices = extractColumnFeatures('Price', 0, 3, ['100.03', '99.5', '12.75']);

    expect(featureValue(shares, 'integerRate')).toBe(1);
    expect(featureValue(prices, 'integerRate')).toBe(0);
  });
});
