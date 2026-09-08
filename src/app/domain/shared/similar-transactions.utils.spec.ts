import { defaultSimilarityKeyword, matchesSimilarityKeyword } from './similar-transactions.utils';

describe('defaultSimilarityKeyword', () => {
  it('uses the whole description when it has 2 or fewer words', () => {
    expect(defaultSimilarityKeyword('Lidl')).toBe('Lidl');
    expect(defaultSimilarityKeyword('Pingo Doce')).toBe('Pingo Doce');
  });

  it('uses only the last 2 words for longer descriptions', () => {
    expect(defaultSimilarityKeyword('COMPRAS C.DEB LIDL PORTO')).toBe('LIDL PORTO');
  });

  it('drops a trailing month/year so recurring monthly descriptions cluster together', () => {
    expect(defaultSimilarityKeyword('Monthly Salary 08/2026')).toBe('Monthly Salary');
    expect(defaultSimilarityKeyword('Monthly Salary 07/2026')).toBe('Monthly Salary');
  });

  it('drops a trailing full date (DD/MM/YYYY) before picking the keyword', () => {
    expect(defaultSimilarityKeyword('Renda Casa 15/08/2026')).toBe('Renda Casa');
  });
});

describe('matchesSimilarityKeyword', () => {
  it('matches case-insensitively', () => {
    expect(matchesSimilarityKeyword('COMPRAS LIDL', 'lidl')).toBe(true);
  });

  it('matches accent-insensitively', () => {
    expect(matchesSimilarityKeyword('Café Central', 'cafe')).toBe(true);
  });

  it('does not match an unrelated description', () => {
    expect(matchesSimilarityKeyword('RESTAURANTE XPTO', 'lidl')).toBe(false);
  });

  it('never matches on a keyword shorter than 2 characters, even if technically a substring', () => {
    expect(matchesSimilarityKeyword('a very common a letter', 'a')).toBe(false);
  });

  it('does not match on an empty/whitespace-only keyword', () => {
    expect(matchesSimilarityKeyword('anything', '   ')).toBe(false);
  });
});
