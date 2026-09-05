import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { DashboardComponent } from './dashboard';
import { CsvParserService } from '@application/csv-parser.service';
import { CategoryMlService } from '@application/services/category-ml.service';
import { TRANSACTION_REPOSITORY_TOKEN, CATEGORY_REPOSITORY_TOKEN } from '@application/tokens';
import { TEMPLATE_CATEGORIES } from '@domain/models/category';
import { APP_STORE_TOKEN, AppStore } from '@application/app-store';
import { provideAppStore } from '@application/app-store.service';
import { MOCK_TRANSACTIONS, MOCK_METRICS } from '@/mocks/index';

describe('DashboardComponent - QA & TDD Spec Suite', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let store: AppStore;

  const csvMock = {
    parse: () => [],
    parseExcel: () => [],
    getRawCsvLines: () => ({ delimiter: ';', headerIdx: 0, rows: [] }),
    getRawExcelRows: () => ({ headerIdx: 0, rows: [] }),
    saveFileToUploads: () => true
  };

  const mlMock = {
    predict: () => 'Others',
    learn: () => { },
    loadRules: () => Promise.resolve()
  };

  const repositoryMock = {
    getAll: () => Promise.resolve([...MOCK_TRANSACTIONS]),
    saveAll: () => Promise.resolve(),
    update: () => Promise.resolve(),
    delete: () => Promise.resolve(),
    clear: () => Promise.resolve()
  };

  const categoryRepositoryMock = {
    getAll: () => Promise.resolve(TEMPLATE_CATEGORIES),
    save: () => Promise.resolve(),
    delete: () => Promise.resolve(),
    clear: () => Promise.resolve()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        provideAppStore(),
        { provide: CsvParserService, useValue: csvMock },
        { provide: CategoryMlService, useValue: mlMock },
        { provide: TRANSACTION_REPOSITORY_TOKEN, useValue: repositoryMock },
        { provide: CATEGORY_REPOSITORY_TOKEN, useValue: categoryRepositoryMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(APP_STORE_TOKEN);
    fixture.detectChanges();
  });

  describe('1. Timezone Shift Prevention', () => {
    it('should format preset date range strictly using local timezone without day shifting', () => {

      store.applyPreset('last_month');
      const start = store.startDate();
      const end = store.endDate();

      expect(start).toMatch(/-\d{2}-28$/);
      expect(end).toMatch(/-\d{2}-28$/);
    });
  });

  describe('2. Accounting & Summary Balance Metrics', () => {
    beforeEach(() => {
      store.startDate.set('2026-07-01');
      store.endDate.set('2026-07-31');
    });

    it('should calculate true opening balance before oldest transaction executed', () => {
      store.startDate.set('2024-01-01');
      store.endDate.set('2024-01-31');
      const starting = component['startingBalance']();
      expect(starting).toBe(2000.00);
    });

    it('should calculate ending balance as balance of newest transaction', () => {
      const ending = component['endingBalance']();
      expect(ending).toBeGreaterThan(0);
    });

    it('should compute net flow as totalIncome + totalExpenses matching MOCK_METRICS', () => {
      store.startDate.set('');
      store.endDate.set('');
      expect(component['totalIncome']()).toBeCloseTo(MOCK_METRICS.overall.totalIncome, 2);
      expect(component['totalExpenses']()).toBeCloseTo(MOCK_METRICS.overall.totalExpenses, 2);
      expect(component['balance']()).toBeCloseTo(MOCK_METRICS.overall.netCashflow, 2);
    });

    it('excludes Transfers-category transactions from totalIncome/totalExpenses', () => {
      store.startDate.set('');
      store.endDate.set('');
      expect(component['totalIncome']()).toBeCloseTo(MOCK_METRICS.overall.totalIncome, 2);
      expect(component['totalExpenses']()).toBeCloseTo(MOCK_METRICS.overall.totalExpenses, 2);
    });

    it('should return 0 for all balance metrics when store has empty transactions', () => {
      store.setTransactions([]);
      expect(component['totalIncome']()).toBe(0);
      expect(component['totalExpenses']()).toBe(0);
      expect(component['balance']()).toBe(0);
      expect(component['startingBalance']()).toBe(0);
      expect(component['endingBalance']()).toBe(0);
    });
  });

  describe('4. Returning from an insight', () => {
    it('does not throw where the platform has no smooth scrolling to offer', () => {
      expect(() => component['onInsightFocusApplied']()).not.toThrow();
    });
  });

  describe('5. Budgets summary section', () => {
    it('navigates to /budget when a budget row is clicked', () => {
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate');

      component.onBudgetRowClick();

      expect(navigateSpy).toHaveBeenCalledWith(['/budget']);
    });
  });

  describe('6. Financial insight assisted navigation', () => {
    it('clears the focusInsight query param once the insight has been brought to front', () => {
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      component.onInsightFocusApplied();

      expect(navigateSpy).toHaveBeenCalledWith([], {
        relativeTo: component['route'],
        queryParams: { focusInsight: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    });
  });

  describe('4. Bulk ML Categorization & Custom Categories', () => {
    it('should persist every transaction from a categoryApplied event, including bulk-applied similar ones', async () => {
      store.setTransactions([
        { id: 't1', date: '2026-07-23', description: 'Uber Trip A', amount: -12.5, category: 'Others' },
        { id: 't2', date: '2026-07-23', description: 'Uber Trip B', amount: -15.0, category: 'Others' }
      ]);

      await component.onCategoryApplied({
        updatedTransactions: [
          { id: 't1', date: '2026-07-23', description: 'Uber Trip A', amount: -12.5, category: 'Transportation' },
          { id: 't2', date: '2026-07-23', description: 'Uber Trip B', amount: -15.0, category: 'Transportation' }
        ],
        keyword: 'uber'
      });

      const txs = store.transactions();
      expect(txs.find(t => t.id === 't2')?.category).toBe('Transportation');
      expect(txs.find(t => t.id === 't1')?.category).toBe('Transportation');
    });
  });
});
