import { TestBed } from '@angular/core/testing';
import { GetDashboardInsightsUseCase } from './get-dashboard-insights.use-case';
import { APP_STORE_TOKEN } from '@application/app-store';
import { createMockStore } from '@/mocks/store.mock';
import { I18nService } from '@application/i18n.service';

describe('GetDashboardInsightsUseCase', () => {
  let useCase: GetDashboardInsightsUseCase;
  let mockStore: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    mockStore = createMockStore();
    TestBed.configureTestingModule({
      providers: [
        GetDashboardInsightsUseCase,
        I18nService,
        { provide: APP_STORE_TOKEN, useValue: mockStore },
      ],
    });
    useCase = TestBed.inject(GetDashboardInsightsUseCase);
  });

  it('computes financial insights from store data', () => {
    const insights = useCase.insights();
    expect(Array.isArray(insights)).toBe(true);
  });

  it('populates rich payload on generated financial insights', () => {
    const insights = useCase.insights();
    for (const insight of insights) {
      expect(insight.payload).toBeDefined();
      expect(insight.visualArchetype).toBeDefined();
    }
  });
});
