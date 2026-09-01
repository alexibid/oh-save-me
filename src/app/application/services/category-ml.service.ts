import { Injectable, signal, inject } from '@angular/core';
import { CategoryType } from '@domain/models/category';
import { MlRule } from '@domain/models/ml-rule';
import { ML_RULE_REPOSITORY_TOKEN } from '@application/tokens';
import { migrateLegacyMlRules } from '@domain/services/migrate-legacy-ml-rules';
import { MlRuleRepository } from '@domain/repositories/ml-rule.repository';
import {
  predictCategory,
  calculateLearnKey,
  createEmptyCategoryRecord,
  extractUserRules,
  extractGenericRules,
} from '../../domain/services/category-ml-engine';

@Injectable({
  providedIn: 'root',
})
export class CategoryMlService {
  private readonly mlRuleRepository?: MlRuleRepository;
  private readonly userWeights = signal<Record<string, Record<CategoryType, number>>>({});
  private readonly disabledRules = signal<Set<string>>(new Set());

  private rulesLoaded = false;
  private loadPromise?: Promise<void>;

  constructor() {
    try {
      this.mlRuleRepository = inject(ML_RULE_REPOSITORY_TOKEN, { optional: true }) ?? undefined;
    } catch {
      this.mlRuleRepository = undefined;
    }
    void this.loadRules();
  }

  public async loadRules(): Promise<void> {
    if (this.rulesLoaded) return;
    if (this.loadPromise) return this.loadPromise;

    if (!this.mlRuleRepository) {
      this.rulesLoaded = true;
      return;
    }

    const repository = this.mlRuleRepository;
    this.loadPromise = (async () => {
      try {
        await migrateLegacyMlRules(repository);
        this.applyRules(await repository.getAll());
      } catch (err) {
        console.error('Failed to load ML rules:', err);
      } finally {
        this.rulesLoaded = true;
      }
    })();

    return this.loadPromise;
  }

  private applyRules(rules: readonly MlRule[]): void {
    const weights: Record<string, Record<CategoryType, number>> = {};
    const disabled = new Set<string>();

    rules.forEach(rule => {
      if (rule.categoryWeights) {
        weights[rule.key] = { ...createEmptyCategoryRecord(), ...rule.categoryWeights };
      }
      if (!rule.enabled) {
        disabled.add(rule.key);
      }
    });

    this.userWeights.set(weights);
    this.disabledRules.set(disabled);
  }

  public predict(description: string, isRefund = false): CategoryType {
    return predictCategory(description, this.userWeights(), this.disabledRules(), isRefund);
  }

  public learn(description: string, category: CategoryType): void {
    const key = calculateLearnKey(description);
    if (!key) return;

    const currentUserWeights = { ...this.userWeights() };

    if (!currentUserWeights[key]) {
      currentUserWeights[key] = createEmptyCategoryRecord();
    }
    currentUserWeights[key][category] += 5;

    this.userWeights.set(currentUserWeights);

    void this.persistRule(key, currentUserWeights[key], !this.disabledRules().has(key));
  }

  public resetUserMemory(): void {
    this.userWeights.set({});
    this.disabledRules.set(new Set());

    if (this.mlRuleRepository) {
      void this.mlRuleRepository.clear().catch((err: unknown) => console.error('Failed to clear ML rules:', err));
    }
  }

  public getUserRules(): { token: string; category: CategoryType; enabled: boolean }[] {
    return extractUserRules(this.userWeights(), this.disabledRules());
  }

  public toggleRule(token: string): void {
    const disabled = new Set(this.disabledRules());
    if (disabled.has(token)) {
      disabled.delete(token);
    } else {
      disabled.add(token);
    }
    this.disabledRules.set(disabled);

    void this.persistRule(token, this.userWeights()[token], !disabled.has(token));
  }

  public getGenericRules(): { token: string; category: CategoryType; enabled: boolean }[] {
    return extractGenericRules(this.disabledRules());
  }

  public deleteRule(token: string): void {
    const currentUserWeights = { ...this.userWeights() };
    delete currentUserWeights[token];
    this.userWeights.set(currentUserWeights);

    const disabled = new Set(this.disabledRules());
    disabled.delete(token);
    this.disabledRules.set(disabled);

    if (this.mlRuleRepository) {
      void this.mlRuleRepository.delete(token).catch((err: unknown) => console.error('Failed to delete ML rule:', err));
    }
  }

  private async persistRule(
    key: string,
    categoryWeights: Record<CategoryType, number> | undefined,
    enabled: boolean
  ): Promise<void> {
    if (!this.mlRuleRepository) return;
    try {
      await this.mlRuleRepository.upsert({ key, categoryWeights, enabled, updatedAt: Date.now() });
    } catch (err) {
      console.error('Failed to persist ML rule:', err);
    }
  }
}
