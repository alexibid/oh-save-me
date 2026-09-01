import { Injectable, signal, inject } from '@angular/core';
import { ColumnClassifierWeights, ColumnClassifierClass, classIndexOf } from '@domain/models/column-classifier-model';
import { DetectableField, DetectedMapping } from '@domain/models/column-mapping';
import { BOOTSTRAP_COLUMN_CLASSIFIER_WEIGHTS } from '@domain/data/bootstrap-column-classifier-weights';
import { extractColumnFeatures } from '@domain/services/column-classifier-features';
import { trainStep } from '@domain/services/column-classifier-math';
import { COLUMN_CLASSIFIER_WEIGHTS_REPOSITORY_TOKEN } from '@application/tokens';
import { ColumnClassifierWeightsRepository } from '@domain/repositories/column-classifier-weights.repository';

@Injectable({
  providedIn: 'root',
})
export class ColumnClassifierService {
  private readonly weightsRepository?: ColumnClassifierWeightsRepository;
  private readonly weights = signal<ColumnClassifierWeights>(BOOTSTRAP_COLUMN_CLASSIFIER_WEIGHTS);

  private weightsLoaded = false;
  private loadPromise?: Promise<void>;

  constructor() {
    try {
      this.weightsRepository = inject(COLUMN_CLASSIFIER_WEIGHTS_REPOSITORY_TOKEN, { optional: true }) ?? undefined;
    } catch {
      this.weightsRepository = undefined;
    }
    void this.loadWeights();
  }

  public async loadWeights(): Promise<void> {
    if (this.weightsLoaded) return;
    if (this.loadPromise) return this.loadPromise;

    if (!this.weightsRepository) {
      this.weightsLoaded = true;
      return;
    }

    const repository = this.weightsRepository;
    this.loadPromise = (async () => {
      try {
        const stored = await repository.get();
        if (stored) {
          this.weights.set(stored);
        }
      } catch (err) {
        console.error('Failed to load column classifier weights:', err);
      } finally {
        this.weightsLoaded = true;
      }
    })();

    return this.loadPromise;
  }

  public getWeights(): ColumnClassifierWeights {
    return this.weights();
  }

  public learn(
    headers: readonly string[],
    sampleRows: readonly string[][],
    correctedMapping: DetectedMapping
  ): void {
    const columnToField = new Map<number, ColumnClassifierClass>();
    Object.entries(correctedMapping).forEach(([field, detection]) => {
      if (detection) {
        columnToField.set(detection.columnIndex, field as DetectableField);
      }
    });

    let next = this.weights();
    headers.forEach((header, columnIndex) => {
      const columnValues = sampleRows.map(row => row[columnIndex] ?? '');
      const features = extractColumnFeatures(header, columnIndex, headers.length, columnValues);
      const trueClass = columnToField.get(columnIndex) ?? 'none';
      next = trainStep(next, features, classIndexOf(trueClass));
    });

    this.weights.set(next);
    void this.persist(next);
  }

  public resetToBootstrap(): void {
    this.weights.set(BOOTSTRAP_COLUMN_CLASSIFIER_WEIGHTS);

    if (this.weightsRepository) {
      void this.weightsRepository.clear().catch((err: unknown) => console.error('Failed to clear column classifier weights:', err));
    }
  }

  private async persist(weights: ColumnClassifierWeights): Promise<void> {
    if (!this.weightsRepository) return;
    try {
      await this.weightsRepository.save({ ...weights, updatedAt: Date.now() });
    } catch (err) {
      console.error('Failed to persist column classifier weights:', err);
    }
  }
}
