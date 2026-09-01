import {
  computeQualityStats,
  detectContentInconsistencies,
  detectSignatureDrift
} from './column-classifier-discrepancy';
import { DetectedMapping } from '@domain/models/column-mapping';

describe('computeQualityStats', () => {
  it('reports high parse rates for a clean date + amount mapping', () => {
    const mapping: DetectedMapping = {
      date: { columnIndex: 0, confidence: 1 },
      amount: { columnIndex: 1, confidence: 1 }
    };
    const sampleRows = [
      ['23-07-2026', '15,50'],
      ['22-07-2026', '1200,00']
    ];

    const stats = computeQualityStats(mapping, sampleRows);

    expect(stats.dateParseRate).toBe(1);
    expect(stats.numericParseRate).toBe(1);
    expect(stats.sampleSize).toBe(2);
  });

  it('leaves rates undefined when the corresponding field is not mapped', () => {
    const mapping: DetectedMapping = { desc: { columnIndex: 0, confidence: 1 } };
    const stats = computeQualityStats(mapping, [['some text']]);

    expect(stats.dateParseRate).toBeUndefined();
    expect(stats.numericParseRate).toBeUndefined();
  });
});

describe('detectContentInconsistencies', () => {
  it('stays silent when an assigned column is consistently clean', () => {
    const mapping: DetectedMapping = { date: { columnIndex: 0, confidence: 1 } };
    const sampleRows = [['23-07-2026'], ['22-07-2026'], ['21-07-2026']];

    expect(detectContentInconsistencies(mapping, sampleRows)).toEqual([]);
  });

  it('flags a date column whose content mostly fails to parse as a date', () => {
    const mapping: DetectedMapping = { date: { columnIndex: 0, confidence: 0.7 } };
    const sampleRows = [['not a date'], ['also not'], ['nor this'], ['23-07-2026']];

    const warnings = detectContentInconsistencies(mapping, sampleRows);

    expect(warnings).toHaveLength(1);
    expect(warnings[0].kind).toBe('inconsistent-content');
    expect(warnings[0].field).toBe('date');
    expect(warnings[0].columnIndex).toBe(0);
    expect(warnings[0].detail['parseRate']).toBeLessThan(0.9);
  });

  it('flags an amount column whose content mostly fails to look numeric', () => {
    const mapping: DetectedMapping = { amount: { columnIndex: 1, confidence: 0.7 } };
    const sampleRows = [['x', 'n/a'], ['x', 'garbage'], ['x', '15,50']];

    const warnings = detectContentInconsistencies(mapping, sampleRows);

    expect(warnings).toHaveLength(1);
    expect(warnings[0].field).toBe('amount');
  });
});

describe('detectSignatureDrift', () => {
  const mapping: DetectedMapping = { date: { columnIndex: 0, confidence: 1 } };
  const cleanDateRows = [['23-07-2026'], ['22-07-2026'], ['21-07-2026'], ['20-07-2026']];

  it('stays silent when there is no stored baseline yet', () => {
    expect(detectSignatureDrift(mapping, cleanDateRows, undefined)).toEqual([]);
  });

  it('stays silent when current stats are close to the baseline', () => {
    const baseline = { dateParseRate: 1, sampleSize: 4, capturedAt: 0 };
    expect(detectSignatureDrift(mapping, cleanDateRows, baseline)).toEqual([]);
  });

  it('flags a significant drop from a previously clean baseline (possible silent format change)', () => {
    const baseline = { dateParseRate: 1, sampleSize: 4, capturedAt: 0 };
    const nowMostlyBroken = [['not a date'], ['also not'], ['nor this'], ['23-07-2026']];

    const warnings = detectSignatureDrift(mapping, nowMostlyBroken, baseline);

    expect(warnings).toHaveLength(1);
    expect(warnings[0].kind).toBe('signature-drift');
    expect(warnings[0].field).toBe('date');
    expect(warnings[0].detail['previousRate']).toBe(1);
  });
});
