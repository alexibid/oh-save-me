import { Injectable, inject, signal } from '@angular/core';
import { SuggestionKind } from '@domain/models/assistant-suggestion.model';
import { AssistantTaskKind } from '@domain/models/assistant-task.model';
import { FinancialInsightKind } from '@domain/models/financial-insight.model';
import { CUSTOMIZATION_REPOSITORY_TOKEN } from '@application/tokens';
import { DEFAULT_INSIGHT_CONFIG, InsightCardKind } from '@domain/services/insight-config';
import { InsightConfigService } from './insight-config.service';
import { CustomizationRepository } from '@domain/repositories/customization.repository';

export type DismissibleKind = InsightCardKind;

interface DismissalRecord {
  readonly dismissedAt: number;
  readonly cooldownMs: number;
}

type DismissalStore = Partial<Record<DismissibleKind, DismissalRecord>>;

const STORAGE_KEY = 'suggestion_dismissals';

const ACTION_COOLDOWN_MULTIPLIER = 2;

@Injectable({ providedIn: 'root' })
export class SuggestionDismissalService {
  private readonly customizationRepository?: CustomizationRepository;
  private readonly records = signal<DismissalStore>({});
  private readonly config?: InsightConfigService;

  constructor() {
    try {
      this.customizationRepository = inject(CUSTOMIZATION_REPOSITORY_TOKEN, { optional: true }) ?? undefined;
      this.config = inject(InsightConfigService, { optional: true }) ?? undefined;
    } catch {
      this.customizationRepository = undefined;
      this.config = undefined;
    }
    this.loadFromDb();
  }

  isDismissed(kind: DismissibleKind, id?: string): boolean {
    const record = this.records()[kind];
    if (record) {
      if (record.cooldownMs === 0 || Date.now() - record.dismissedAt < record.cooldownMs) {
        return true;
      }
    }
    if (id) {
      const specificKey = `${kind}:${id}` as DismissibleKind;
      const specificRecord = this.records()[specificKey];
      if (specificRecord) {
        if (specificRecord.cooldownMs === 0 || Date.now() - specificRecord.dismissedAt < specificRecord.cooldownMs) {
          return true;
        }
      }
    }
    return false;
  }

  isPermanentlyDismissed(kind: DismissibleKind, id?: string): boolean {
    const records = this.records();
    if (records[kind]?.cooldownMs === 0) return true;
    if (id && records[`${kind}:${id}` as DismissibleKind]?.cooldownMs === 0) return true;
    return false;
  }

  dismiss(kind: DismissibleKind, id?: string): void {
    const key = id ? `${kind}:${id}` as DismissibleKind : kind;
    this.save(key, this.cooldownFor(kind));
  }

  dismissPermanently(kind: DismissibleKind, id?: string): void {
    const key = id ? `${kind}:${id}` as DismissibleKind : kind;
    this.save(key, 0);
  }

  markActioned(kind: DismissibleKind, id?: string): void {
    const key = id ? `${kind}:${id}` as DismissibleKind : kind;
    const cooldown = Math.max(
      this.cooldownFor(kind) * ACTION_COOLDOWN_MULTIPLIER,
      48 * 60 * 60 * 1000
    );
    this.save(key, cooldown);
  }

  private cooldownFor(kind: DismissibleKind): number {
    const cards = this.config?.config().cards ?? DEFAULT_INSIGHT_CONFIG.cards;
    return (cards[kind]?.cooldownHours ?? 12) * 60 * 60 * 1000;
  }

  reset(kind: DismissibleKind, id?: string): void {
    this.records.update(prev => {
      const next = { ...prev };
      delete next[kind];
      if (id) {
        delete next[`${kind}:${id}` as DismissibleKind];
        for (const k of Object.keys(next)) {
          if (k.startsWith(`${kind}:`) && k.includes(id)) {
            delete next[k as DismissibleKind];
          }
        }
      }
      return next;
    });
    this.persist();
  }

  clearAll(): void {
    this.records.set({});
    this.persist();
  }

  private save(kind: DismissibleKind, cooldownMs: number): void {
    this.records.update(prev => ({
      ...prev,
      [kind]: { dismissedAt: Date.now(), cooldownMs },
    }));
    this.persist();
  }

  private async loadFromDb(): Promise<void> {
    if (!this.customizationRepository) return;
    try {
      const all = await this.customizationRepository.getAll();
      const raw = all.find(c => c.key === STORAGE_KEY)?.value;
      if (raw) this.records.set(JSON.parse(raw) as DismissalStore);
    } catch {}
  }

  private persist(): void {
    if (!this.customizationRepository) return;
    this.customizationRepository
      .save({ key: STORAGE_KEY, value: JSON.stringify(this.records()) })
      .catch(() => {});
  }
}
