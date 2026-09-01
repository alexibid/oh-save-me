import { describe, it, expect } from 'vitest';
import {
  normalizeHeader,
  headerScore,
  contentLooksLikeDate,
  contentLooksNumeric,
  contentLooksLikeInteger,
  contentLooksLikeCode,
} from './column-shape.utils';

describe('column-shape.utils', () => {
  describe('normalizeHeader', () => {
    it('should lower-case and remove accents', () => {
      expect(normalizeHeader('Data Valor')).toBe('data valor');
      expect(normalizeHeader('Descrição')).toBe('descricao');
    });
  });

  describe('headerScore', () => {
    it('should return 1 when header keywords match the detectable field', () => {
      expect(headerScore('Data Movimento', 'date')).toBe(1);
      expect(headerScore('Valor em Euro', 'amount')).toBe(1);
      expect(headerScore('Saldo Contabilistico', 'balance')).toBe(1);
    });

    it('should return 0 when header keywords do not match', () => {
      expect(headerScore('Observações', 'amount')).toBe(0);
    });
  });

  describe('contentLooksLikeDate', () => {
    it('should calculate ratio of valid date strings', () => {
      expect(contentLooksLikeDate(['2026-08-05', '05/08/2026', 'invalid'])).toBeCloseTo(0.666, 2);
      expect(contentLooksLikeDate([])).toBe(0);
    });
  });

  describe('contentLooksNumeric', () => {
    it('should calculate ratio of numeric amount strings', () => {
      expect(contentLooksNumeric(['12.50', '-100,20', 'abc'])).toBeCloseTo(0.666, 2);
      expect(contentLooksNumeric([])).toBe(0);
    });
  });

  describe('contentLooksLikeInteger', () => {
    it('should detect integer counts like shares', () => {
      expect(contentLooksLikeInteger(['100', '25', '12.50'])).toBeCloseTo(0.666, 2);
      expect(contentLooksLikeInteger([])).toBe(0);
    });
  });

  describe('contentLooksLikeCode', () => {
    it('should detect ISIN or ticker symbol codes', () => {
      expect(contentLooksLikeCode(['IE00B4L5Y983', 'AAPL', 'Not A Code'])).toBeCloseTo(0.666, 2);
      expect(contentLooksLikeCode([])).toBe(0);
    });
  });
});
