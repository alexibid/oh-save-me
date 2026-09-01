import { predictProbabilities, trainStep, LEARNING_RATE } from './column-classifier-math';
import { ColumnClassifierWeights } from '@domain/models/column-classifier-model';

function zeroWeights(classCount: number, featureCount: number): ColumnClassifierWeights {
  return {
    matrix: Array.from({ length: classCount }, () => Array.from({ length: featureCount }, () => 0)),
    featureVersion: 1,
    updatedAt: 0
  };
}

describe('predictProbabilities', () => {
  it('returns a probability distribution that sums to 1', () => {
    const weights = zeroWeights(3, 2);
    const probabilities = predictProbabilities(weights, [1, 0.5]);

    expect(probabilities.length).toBe(3);
    expect(probabilities.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it('produces no NaN/Infinity for extreme logits (numerical stability)', () => {
    const weights: ColumnClassifierWeights = {
      matrix: [[1000, 0], [-1000, 0], [0, 0]],
      featureVersion: 1,
      updatedAt: 0
    };
    const probabilities = predictProbabilities(weights, [1, 0]);

    probabilities.forEach(p => {
      expect(Number.isFinite(p)).toBe(true);
    });
    expect(probabilities.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it('assigns near-1 probability to a class whose weight row dominates', () => {
    const weights: ColumnClassifierWeights = {
      matrix: [[5, 5], [0, 0], [0, 0]],
      featureVersion: 1,
      updatedAt: 0
    };
    const probabilities = predictProbabilities(weights, [1, 1]);

    expect(probabilities[0]).toBeGreaterThan(0.99);
  });
});

describe('trainStep — synthetic convergence', () => {
  it('increases the true class probability over repeated updates on the same example', () => {
    let weights = zeroWeights(3, 2);
    const features = [1, 0.8];
    const trueClassIndex = 1;

    const before = predictProbabilities(weights, features)[trueClassIndex];

    for (let i = 0; i < 200; i++) {
      weights = trainStep(weights, features, trueClassIndex, LEARNING_RATE);
    }

    const after = predictProbabilities(weights, features)[trueClassIndex];

    expect(after).toBeGreaterThan(before);
    expect(after).toBeGreaterThan(0.9);
  });

  it('preserves featureVersion and does not mutate the input weights object', () => {
    const weights = zeroWeights(3, 2);
    const original = JSON.stringify(weights);

    const next = trainStep(weights, [1, 0], 0, LEARNING_RATE);

    expect(JSON.stringify(weights)).toBe(original);
    expect(next.featureVersion).toBe(weights.featureVersion);
    expect(next).not.toBe(weights);
  });

  it('shrinks weight norm toward zero from decay alone when learning rate is 0', () => {
    const weights: ColumnClassifierWeights = {
      matrix: [[1, 1], [1, 1], [1, 1]],
      featureVersion: 1,
      updatedAt: 0
    };

    const next = trainStep(weights, [1, 1], 0, 0);

    next.matrix.forEach(row => {
      row.forEach(value => {
        expect(Math.abs(value)).toBeLessThan(1);
      });
    });
  });

  it('leaves weights unchanged when both learning rate and weight decay are 0 (used by the offline bootstrap trainer to avoid decay compounding over thousands of steps)', () => {
    const weights: ColumnClassifierWeights = {
      matrix: [[1, 1], [1, 1], [1, 1]],
      featureVersion: 1,
      updatedAt: 0
    };

    const next = trainStep(weights, [1, 1], 0, 0, 0);

    expect(next.matrix).toEqual(weights.matrix);
  });

  it('bounds the weight update magnitude via gradient clipping on a pathological input', () => {
    const weights = zeroWeights(2, 3);
    const hugeFeatures = [1000, 1000, 1000];

    const next = trainStep(weights, hugeFeatures, 0, LEARNING_RATE);

    next.matrix.forEach(row => {
      row.forEach(value => {
        expect(Number.isFinite(value)).toBe(true);
        expect(Math.abs(value)).toBeLessThan(1);
      });
    });
  });
});
