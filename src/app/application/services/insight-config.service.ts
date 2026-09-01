import { Injectable, computed, inject, signal } from '@angular/core';
import { CUSTOMIZATION_REPOSITORY_TOKEN } from '@application/tokens';
import {
  DEFAULT_INSIGHT_CONFIG,
  InsightConfig,
  InsightConfigOverrides,
  mergeInsightConfig
} from '@domain/services/insight-config';

const STORAGE_KEY = 'insight_config';

@Injectable({ providedIn: 'root' })
export class InsightConfigService {
  private readonly repository = inject(CUSTOMIZATION_REPOSITORY_TOKEN, { optional: true });
  private readonly overrides = signal<InsightConfigOverrides>({});

  readonly config = computed<InsightConfig>(() =>
    mergeInsightConfig(DEFAULT_INSIGHT_CONFIG, this.overrides())
  );

  constructor() {
    void this.load();
  }

  async tune(overrides: InsightConfigOverrides): Promise<void> {
    const merged = { ...this.overrides(), ...overrides };
    this.overrides.set(merged);
    await this.persist(merged);
  }

  async reset(): Promise<void> {
    this.overrides.set({});
    await this.repository?.delete(STORAGE_KEY);
  }

  private async load(): Promise<void> {
    if (!this.repository) return;

    try {
      const stored = (await this.repository.getAll()).find(item => item.key === STORAGE_KEY);
      if (stored?.value) this.overrides.set(JSON.parse(stored.value));
    } catch {
      this.overrides.set({});
    }
  }

  private async persist(overrides: InsightConfigOverrides): Promise<void> {
    await this.repository?.save({ key: STORAGE_KEY, value: JSON.stringify(overrides) });
  }
}
