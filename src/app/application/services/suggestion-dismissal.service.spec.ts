import { TestBed } from '@angular/core/testing';
import { SuggestionDismissalService } from './suggestion-dismissal.service';
import { CUSTOMIZATION_REPOSITORY_TOKEN } from '@application/tokens';
import { CustomizationRepository } from '@domain/repositories/customization.repository';
import { Customization } from '@domain/models/customization';

class FakeCustomizationRepository implements CustomizationRepository {
  private rows = new Map<string, string>();

  async getAll(): Promise<readonly Customization[]> {
    return [...this.rows.entries()].map(([key, value]) => ({ key, value }));
  }
  async save(customization: Customization): Promise<void> {
    this.rows.set(customization.key, customization.value);
  }
  async delete(key: string): Promise<void> {
    this.rows.delete(key);
  }
  async clear(): Promise<void> {
    this.rows.clear();
  }
}

describe('SuggestionDismissalService', () => {
  describe('without a repository (pure in-memory cooldown logic)', () => {
    let service: SuggestionDismissalService;

    beforeEach(() => {
      service = new SuggestionDismissalService();
    });

    it('is not dismissed for a kind that was never touched', () => {
      expect(service.isDismissed('uncategorized')).toBe(false);
    });

    it('hides a kind after dismiss(), within its cooldown window', () => {
      service.dismiss('uncategorized');
      expect(service.isDismissed('uncategorized')).toBe(true);
    });

    it('treats a 0ms cooldown (no_accounts) as permanent', () => {
      service.dismiss('no_accounts');
      expect(service.isDismissed('no_accounts')).toBe(true);
    });

    it('markActioned applies a longer cooldown than a plain dismiss', () => {
      service.markActioned('positive_savings');
      expect(service.isDismissed('positive_savings')).toBe(true);
    });

    it('reset() clears a dismissal', () => {
      service.dismiss('outlier_transactions');
      service.reset('outlier_transactions');
      expect(service.isDismissed('outlier_transactions')).toBe(false);
    });

    it('a plain dismiss is temporary, so the card stays retrievable from the archive', () => {
      service.dismiss('category_overspend', 'category_overspend_Groceries');

      expect(service.isDismissed('category_overspend', 'category_overspend_Groceries')).toBe(true);
      expect(service.isPermanentlyDismissed('category_overspend', 'category_overspend_Groceries')).toBe(false);
    });

    it('dismissPermanently() keeps the card hidden and marks it as gone for good', () => {
      service.dismissPermanently('category_overspend', 'category_overspend_Groceries');

      expect(service.isDismissed('category_overspend', 'category_overspend_Groceries')).toBe(true);
      expect(service.isPermanentlyDismissed('category_overspend', 'category_overspend_Groceries')).toBe(true);
    });

    it('deleting one instance for good leaves other instances of the same kind untouched', () => {
      service.dismissPermanently('category_overspend', 'category_overspend_Groceries');

      expect(service.isDismissed('category_overspend', 'category_overspend_Transport')).toBe(false);
      expect(service.isPermanentlyDismissed('category_overspend', 'category_overspend_Transport')).toBe(false);
    });

    it('reset() brings a permanently deleted instance back', () => {
      service.dismissPermanently('recurring_expense', 'recurring_expense_EDP');
      service.reset('recurring_expense', 'recurring_expense_EDP');

      expect(service.isDismissed('recurring_expense', 'recurring_expense_EDP')).toBe(false);
      expect(service.isPermanentlyDismissed('recurring_expense', 'recurring_expense_EDP')).toBe(false);
    });
  });

  describe('with a repository (RxDB persistence)', () => {
    let repository: FakeCustomizationRepository;

    beforeEach(() => {
      repository = new FakeCustomizationRepository();
      TestBed.configureTestingModule({
        providers: [
          SuggestionDismissalService,
          { provide: CUSTOMIZATION_REPOSITORY_TOKEN, useValue: repository },
        ],
      });
    });

    it('persists a dismissal as a single customizations row', async () => {
      const service = TestBed.inject(SuggestionDismissalService);
      service.dismiss('category_overspend');

      await Promise.resolve();
      await Promise.resolve();

      const rows = await repository.getAll();
      expect(rows).toHaveLength(1);
      expect(rows[0].key).toBe('suggestion_dismissals');
      expect(JSON.parse(rows[0].value)).toHaveProperty('category_overspend');
    });

    it('hydrates from a previously persisted row on construction', async () => {
      await repository.save({
        key: 'suggestion_dismissals',
        value: JSON.stringify({ uncategorized: { dismissedAt: Date.now(), cooldownMs: 0 } }),
      });

      const service = TestBed.inject(SuggestionDismissalService);
      await Promise.resolve();
      await Promise.resolve();

      expect(service.isDismissed('uncategorized')).toBe(true);
    });
  });
});
