import { ColumnClassifierWeights } from '@domain/models/column-classifier-model';

export const LEARNING_RATE = 0.15;
export const WEIGHT_DECAY = 1e-4;
const MAX_GRADIENT_NORM = 2.0;

export function predictProbabilities(
  weights: ColumnClassifierWeights,
  features: readonly number[]
): readonly number[] {
  const logits = weights.matrix.map(row => dot(row, features));
  const maxLogit = Math.max(...logits);
  const exponentials = logits.map(logit => Math.exp(logit - maxLogit));
  const sumExponentials = exponentials.reduce((sum, value) => sum + value, 0);
  return exponentials.map(value => value / sumExponentials);
}

export function trainStep(
  weights: ColumnClassifierWeights,
  features: readonly number[],
  trueClassIndex: number,
  learningRate: number = LEARNING_RATE,
  weightDecay: number = WEIGHT_DECAY
): ColumnClassifierWeights {
  const probabilities = predictProbabilities(weights, features);

  const nextMatrix = weights.matrix.map((row, classIndex) => {
    const target = classIndex === trueClassIndex ? 1 : 0;
    const errorTerm = probabilities[classIndex] - target;
    const gradient = clipGradient(features.map(feature => feature * errorTerm));
    return row.map((weight, featureIndex) =>
      weight - learningRate * gradient[featureIndex] - weightDecay * weight
    );
  });

  return { matrix: nextMatrix, featureVersion: weights.featureVersion, updatedAt: weights.updatedAt };
}

function dot(a: readonly number[], b: readonly number[]): number {
  return a.reduce((sum, value, i) => sum + value * b[i], 0);
}

function clipGradient(gradient: readonly number[]): readonly number[] {
  const norm = Math.sqrt(gradient.reduce((sum, value) => sum + value * value, 0));
  if (norm <= MAX_GRADIENT_NORM || norm === 0) return gradient;
  const scale = MAX_GRADIENT_NORM / norm;
  return gradient.map(value => value * scale);
}
