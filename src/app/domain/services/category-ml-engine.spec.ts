import { describe, it, expect } from 'vitest';
import {
  calculateLearnKey,
  createEmptyCategoryRecord,
  predictCategory,
  extractUserRules,
  extractGenericRules,
} from './category-ml-engine';

describe('CategoryMlEngine', () => {
  describe('calculateLearnKey', () => {
    it('should return empty string for empty input', () => {
      expect(calculateLearnKey('')).toBe('');
      expect(calculateLearnKey('   ')).toBe('');
    });

    it('should return full normalized string for 1 or 2 words', () => {
      expect(calculateLearnKey('Lidl')).toBe('lidl');
      expect(calculateLearnKey('PINGO DOCE')).toBe('pingo doce');
    });

    it('should return last 2 words for descriptions with more than 2 words', () => {
      expect(calculateLearnKey('COMPRA DE CONTINENTE MATOSINHOS')).toBe('continente matosinhos');
      expect(calculateLearnKey('PAGAMENTO DE SERVICOS BENFICA LISBOA')).toBe('benfica lisboa');
    });

    it('should handle accents and diacritics', () => {
      expect(calculateLearnKey('Zürich Café Ström')).toBe('cafe strom');
    });
  });

  describe('createEmptyCategoryRecord', () => {
    it('should initialize all categories to 0', () => {
      const record = createEmptyCategoryRecord();
      expect(record['Groceries']).toBe(0);
      expect(record['Housing']).toBe(0);
      expect(record['Others']).toBe(0);
    });
  });

  describe('predictCategory', () => {
    it('should return Others when no rules match', () => {
      const best = predictCategory('UNKNOWN_MERCHANT_12345', {}, new Set());
      expect(best).toBe('Others');
    });

    it('should use Factory ML weights when matching known Portuguese merchants', () => {
      const best = predictCategory('COMPRA DEB LIDL MATOSINHOS', {}, new Set());
      expect(best).toBe('Groceries');
    });

    it('should prioritize User ML weights over Factory weights when user weights exist', () => {
      const userWeights = {
        'continente matosinhos': {
          ...createEmptyCategoryRecord(),
          Housing: 100,
        },
      };
      const best = predictCategory('COMPRA CONTINENTE MATOSINHOS', userWeights, new Set());
      expect(best).toBe('Housing');
    });

    it('should respect disabled rules', () => {
      const userWeights = {
        'continente matosinhos': {
          ...createEmptyCategoryRecord(),
          Housing: 100,
        },
      };
      const disabled = new Set(['continente matosinhos', 'continente']);
      const best = predictCategory('COMPRA CONTINENTE MATOSINHOS', userWeights, disabled);
      expect(best).not.toBe('Housing');
    });

    it('should exclude Income category when isRefund is true', () => {
      const userWeights = {
        refund: {
          ...createEmptyCategoryRecord(),
          Income: 100,
          Groceries: 10,
        },
      };
      const best = predictCategory('refund transaction', userWeights, new Set(), true);
      expect(best).toBe('Groceries');
    });
  });

  describe('extractUserRules and extractGenericRules', () => {
    it('should extract active user rules correctly', () => {
      const userWeights = {
        'pingo doce': {
          ...createEmptyCategoryRecord(),
          Groceries: 5,
        },
      };
      const rules = extractUserRules(userWeights, new Set());
      expect(rules).toHaveLength(1);
      expect(rules[0]).toEqual({ token: 'pingo doce', category: 'Groceries', enabled: true });
    });

    it('should mark rules as disabled when token is in disabled set', () => {
      const userWeights = {
        'pingo doce': {
          ...createEmptyCategoryRecord(),
          Groceries: 5,
        },
      };
      const rules = extractUserRules(userWeights, new Set(['pingo doce']));
      expect(rules[0].enabled).toBe(false);
    });

    it('should extract generic factory rules', () => {
      const genericRules = extractGenericRules(new Set());
      expect(genericRules.length).toBeGreaterThan(0);
      const lidlRule = genericRules.find(r => r.token === 'deb lidl');
      expect(lidlRule).toBeDefined();
      expect(lidlRule?.category).toBe('Groceries');
    });
  });
});
