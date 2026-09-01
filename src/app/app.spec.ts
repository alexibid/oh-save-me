import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { App } from './app';
import { I18nService } from './application/i18n.service';
import { APP_STORE_TOKEN } from './application/app-store';
import { createMockStore } from '@/mocks/store.mock';
import { ACCOUNT_REPOSITORY_TOKEN, IMPORT_BATCH_REPOSITORY_TOKEN, TRANSACTION_REPOSITORY_TOKEN } from './application/tokens';
import { CategoryMlService } from './application/services/category-ml.service';
import { Transaction } from './domain/models/transaction';

describe('App', () => {
  const mockStore = createMockStore();

  const mockTransactionRepository = {
    saveAll: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined)
  };

  const mockCategoryMlService = {
    predict: () => 'Others',
    learn: vi.fn(),
    loadRules: vi.fn().mockResolvedValue(undefined)
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [App, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        I18nService,
        { provide: APP_STORE_TOKEN, useValue: mockStore },
        { provide: ACCOUNT_REPOSITORY_TOKEN, useValue: { getAll: () => Promise.resolve([]), save: () => Promise.resolve() } },
        { provide: IMPORT_BATCH_REPOSITORY_TOKEN, useValue: { getAll: () => Promise.resolve([]), save: () => Promise.resolve() } },
        { provide: TRANSACTION_REPOSITORY_TOKEN, useValue: mockTransactionRepository },
        { provide: CategoryMlService, useValue: mockCategoryMlService }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  describe('"+" entry-point chooser', () => {
    it('opens the chooser (not the account-create dialog directly) when the store emits addClicked$', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      fixture.detectChanges();

      expect(app['showAddEntryChooser']()).toBe(false);
      mockStore.addClicked$.next();
      expect(app['showAddEntryChooser']()).toBe(true);
      expect(app['showAccountCreate']()).toBe(false);
      expect(app['showImportAssistant']()).toBe(false);
    });

    it('routes to the account-create dialog when "create account" is chosen', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      fixture.detectChanges();
      mockStore.addClicked$.next();

      app.onChooseCreateAccount();

      expect(app['showAddEntryChooser']()).toBe(false);
      expect(app['showAccountCreate']()).toBe(true);
    });

    it('routes to the import assistant when "import" is chosen', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      fixture.detectChanges();
      mockStore.addClicked$.next();

      app.onChooseImport();

      expect(app['showAddEntryChooser']()).toBe(false);
      expect(app['showImportAssistant']()).toBe(true);
    });
  });

  describe('onTriageResolved', () => {
    it('persists every resolved transaction and learns from the accepted ones', async () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      const accepted: Transaction = {
        id: 'tx-1', date: '2026-07-23', description: 'Lidl', amount: -15,
        category: 'Groceries', pendingReview: false
      };
      const skipped: Transaction = {
        id: 'tx-2', date: '2026-07-24', description: 'Unknown Shop', amount: -8,
        category: 'Others', pendingReview: true
      };

      await app.onTriageResolved([accepted, skipped]);

      expect(mockTransactionRepository.update).toHaveBeenCalledTimes(2);
      expect(mockCategoryMlService.learn).toHaveBeenCalledTimes(1);
      expect(mockCategoryMlService.learn).toHaveBeenCalledWith('Lidl', 'Groceries');
    });

    it('does not learn from a category that is a known fact from investmentType, not a guess', async () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      const buy: Transaction = {
        id: 'tx-3', date: '2026-07-23', description: 'Buy trade IE00B4L5Y983 iShares Core MSCI World',
        amount: -100.03, category: 'Investments', investmentType: 'buy', pendingReview: false
      };

      await app.onTriageResolved([buy]);

      expect(mockTransactionRepository.update).toHaveBeenCalledTimes(1);
      expect(mockCategoryMlService.learn).not.toHaveBeenCalled();
    });

    it('still learns when the user overrides the deterministic investment suggestion with something else', async () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      const overridden: Transaction = {
        id: 'tx-4', date: '2026-07-23', description: 'Buy trade IE00B4L5Y983 iShares Core MSCI World',
        amount: -100.03, category: 'Fees', investmentType: 'buy', pendingReview: false
      };

      await app.onTriageResolved([overridden]);

      expect(mockCategoryMlService.learn).toHaveBeenCalledTimes(1);
      expect(mockCategoryMlService.learn).toHaveBeenCalledWith('Buy trade IE00B4L5Y983 iShares Core MSCI World', 'Fees');
    });
  });
});

