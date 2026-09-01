import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardInsightsComponent } from './dashboard-insights';
import { APP_STORE_TOKEN } from '@application/app-store';
import { createMockStore } from '@/mocks/store.mock';
import { I18nService } from '@application/i18n.service';
import { Router } from '@angular/router';
import { SuggestionDismissalService } from '@application/services/suggestion-dismissal.service';
import { MOCK_INSIGHT_SAFE_TO_SPEND } from './dashboard-insights.mock';

describe('DashboardInsightsComponent', () => {
  let component: DashboardInsightsComponent;
  let fixture: ComponentFixture<DashboardInsightsComponent>;
  let mockStore: ReturnType<typeof createMockStore>;
  let router: Router;
  let dismissal: SuggestionDismissalService;

  beforeEach(async () => {
    mockStore = createMockStore();
    await TestBed.configureTestingModule({
      imports: [DashboardInsightsComponent],
      providers: [
        I18nService,
        SuggestionDismissalService,
        { provide: APP_STORE_TOKEN, useValue: mockStore },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    dismissal = TestBed.inject(SuggestionDismissalService);
    fixture = TestBed.createComponent(DashboardInsightsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component successfully', () => {
    expect(component).toBeTruthy();
  });

  it('navigates when onAction is invoked with route', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const mockInsight = {
      id: 'test_insight',
      kind: 'safe_to_spend' as const,
      visualArchetype: 'highlight_metric' as const,
      icon: 'wallet',
      title: 'Safe to spend',
      subtext: '50 EUR per day',
      filter: { categoryId: 'groceries' },
      route: '/movements',
      action: null,
      payload: { value: 50 },
    };

    component.onAction(mockInsight);
    expect(navigateSpy).toHaveBeenCalledWith(['/movements'], {
      queryParams: { category: 'groceries', insightId: 'test_insight' }
    });
  });

  it('renders insights when available', () => {
    mockStore.transactions.set([
      { id: '1', date: '2026-08-01', description: 'Salary', amount: 2500, category: 'income' },
      { id: '2', date: '2026-08-05', description: 'Groceries', amount: -200, category: 'groceries' },
    ]);
    mockStore.budgets.set([
      { id: 'b1', name: 'Alimentação', type: 'category', amount: 100, categoryId: 'groceries' },
    ]);
    fixture.detectChanges();

    expect(component.hasInsights()).toBe(true);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.o-dashboard-insights')).toBeTruthy();
  });

  it('cycles through insights with next, prev, and dot navigation', () => {
    mockStore.transactions.set([
      { id: '1', date: '2026-08-01', description: 'Salary', amount: 2500, category: 'income' },
      { id: '2', date: '2026-08-05', description: 'Groceries', amount: -200, category: 'groceries' },
      { id: '3', date: '2026-08-06', description: 'Netflix', amount: -15, category: 'entertainment' },
    ]);
    mockStore.budgets.set([
      { id: 'b1', name: 'Alimentação', type: 'category', amount: 100, categoryId: 'groceries' },
      { id: 'b2', name: 'Lazer', type: 'category', amount: 50, categoryId: 'entertainment' },
    ]);
    fixture.detectChanges();

    const count = component.insights().length;
    if (count > 1) {
      expect(component.frontIndex()).toBe(0);
      component.onNext();
      expect(component.frontIndex()).toBe(1);
      component.onPrev();
      expect(component.frontIndex()).toBe(0);
      component.onDotClicked(count - 1);
      expect(component.frontIndex()).toBe(count - 1);
    }
  });

  it('snoozes an insight once the user acts on it, so it stops competing for the deck', () => {
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const markActioned = vi.spyOn(dismissal, 'markActioned');

    component.onAction(MOCK_INSIGHT_SAFE_TO_SPEND);

    expect(markActioned).toHaveBeenCalledWith(MOCK_INSIGHT_SAFE_TO_SPEND.kind, MOCK_INSIGHT_SAFE_TO_SPEND.id);
  });

  it('hides an insight whose kind/id is snoozed', () => {
    const visibleBefore = component.insights().length;
    expect(visibleBefore).toBeGreaterThan(0);

    dismissal.dismiss(component.insights()[0].kind, component.insights()[0].id);
    fixture.detectChanges();

    expect(component.insights().length).toBe(visibleBefore - 1);
  });

  it('dismisses an insight when the user clicks the dismiss button', () => {
    const dismissSpy = vi.spyOn(dismissal, 'dismiss');
    const firstInsight = component.insights()[0];
    component.onDismissCard(firstInsight, new Event('click'));
    expect(dismissSpy).toHaveBeenCalledWith(firstInsight.kind, firstInsight.id);
  });

  it('archives the card once the recurring payments on it are confirmed', async () => {
    const subscriptions = {
      ...MOCK_INSIGHT_SAFE_TO_SPEND,
      id: 'active_subscriptions',
      kind: 'active_subscriptions' as const,
      visualArchetype: 'trend_table' as const,
      payload: { items: [{ description: 'PAPER.D', amount: 17.68, transactionId: 'tx-1' }] },
    };
    mockStore.transactions.set([
      { id: 'tx-1', date: '2026-08-05', description: 'PAPER.D', amount: -17.68, category: 'Others', accountId: 'acc-1' }
    ] as never);

    await component.onConfirmRecurrence(subscriptions);

    expect(dismissal.isDismissed('active_subscriptions', 'active_subscriptions')).toBe(true);
    expect(dismissal.isPermanentlyDismissed('active_subscriptions', 'active_subscriptions')).toBe(false);
  });

  it('sends an archived card back to the active deck', () => {
    const firstInsight = component.insights()[0];
    component.onDismissCard(firstInsight, new Event('click'));
    fixture.detectChanges();
    expect(dismissal.isDismissed(firstInsight.kind, firstInsight.id)).toBe(true);

    component.onRestore(firstInsight, new Event('click'));
    fixture.detectChanges();

    expect(dismissal.isDismissed(firstInsight.kind, firstInsight.id)).toBe(false);
    expect(component.insights().some(i => i.id === firstInsight.id)).toBe(true);
  });

  it('pulls the front card back into range when the deck shrinks under it', () => {
    const count = component.insights().length;
    expect(count).toBeGreaterThan(1);

    component.onDotClicked(count - 1);
    expect(component.frontIndex()).toBe(count - 1);

    dismissal.dismiss(component.insights()[0].kind, component.insights()[0].id);
    fixture.detectChanges();

    expect(component.frontIndex()).toBeLessThan(component.insights().length);
  });

  it('keeps the section in place with an empty state once every insight is resolved', () => {
    for (const insight of component.insights()) {
      dismissal.dismiss(insight.kind, insight.id);
    }
    fixture.detectChanges();

    expect(component.hasInsights()).toBe(false);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.o-dashboard-insights')).toBeTruthy();
    expect(compiled.querySelector('.o-dashboard-insights__empty')).toBeTruthy();
  });

  it('brings the requested insight to the front and emits focusApplied once it is found', () => {
    const target = component.insights()[component.insights().length - 1];
    const focusAppliedSpy = vi.fn();
    component.focusApplied.subscribe(focusAppliedSpy);

    fixture.componentRef.setInput('focusInsightId', target.id);
    fixture.detectChanges();

    const targetIndex = component.insights().findIndex(insight => insight.id === target.id);
    expect(component.frontIndex()).toBe(targetIndex);
    expect(focusAppliedSpy).toHaveBeenCalledTimes(1);
  });

  it('does not re-apply the same focus id after the user manually navigates away from it', () => {
    const target = component.insights()[component.insights().length - 1];
    fixture.componentRef.setInput('focusInsightId', target.id);
    fixture.detectChanges();

    component.onDotClicked(0);
    fixture.detectChanges();

    expect(component.frontIndex()).toBe(0);
  });

  it('still surfaces the requested insight when it has just been snoozed, so the back-navigation is not a no-op', () => {
    const target = component.insights()[0];
    dismissal.markActioned(target.kind, target.id);
    fixture.detectChanges();
    expect(component.insights().some(insight => insight.id === target.id)).toBe(false);

    fixture.componentRef.setInput('focusInsightId', target.id);
    fixture.detectChanges();

    expect(component.insights()[component.frontIndex()].id).toBe(target.id);
  });

  describe('archive', () => {
    it('offers no archive toggle while nothing has been dismissed', () => {
      expect(component.hasArchive()).toBe(false);
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('[data-testid="insights-archive-toggle"]')).toBeNull();
    });

    it('moves a dismissed insight into the archive instead of losing it', () => {
      const target = component.insights()[0];
      component.onDismissCard(target, new Event('click'));
      fixture.detectChanges();

      expect(component.insights().some(insight => insight.id === target.id)).toBe(false);
      expect(component.archivedInsights().some(insight => insight.id === target.id)).toBe(true);
      expect(component.hasArchive()).toBe(true);
    });

    it('swaps the deck over to the archived insights when the toggle is used', () => {
      const target = component.insights()[0];
      component.onDismissCard(target, new Event('click'));
      fixture.detectChanges();

      component.onToggleArchive();
      fixture.detectChanges();

      expect(component.showArchived()).toBe(true);
      expect(component.insights().map(insight => insight.id)).toEqual([target.id]);
    });

    it('shows the delete-forever control only while browsing the archive', () => {
      const target = component.insights()[0];
      component.onDismissCard(target, new Event('click'));
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('[data-testid="insight-delete-forever-btn"]')).toBeNull();

      component.onToggleArchive();
      fixture.detectChanges();

      expect(compiled.querySelector('[data-testid="insight-delete-forever-btn"]')).toBeTruthy();
      expect(compiled.querySelector('[data-testid="insight-dismiss-btn"]')).toBeNull();
    });

    it('drops an insight out of the archive for good once deleted permanently', () => {
      const target = component.insights()[0];
      component.onDismissCard(target, new Event('click'));
      fixture.detectChanges();
      component.onToggleArchive();
      fixture.detectChanges();

      component.onDeleteForever(target, new Event('click'));
      fixture.detectChanges();

      expect(component.archivedInsights().some(insight => insight.id === target.id)).toBe(false);
      expect(dismissal.isPermanentlyDismissed(target.kind, target.id)).toBe(true);
    });

    it('leaves the other archived insights alone when one is deleted permanently', () => {
      const [first, second] = component.insights();
      component.onDismissCard(first, new Event('click'));
      fixture.detectChanges();
      component.onDismissCard(component.insights().find(i => i.id === second.id)!, new Event('click'));
      fixture.detectChanges();
      component.onToggleArchive();
      fixture.detectChanges();

      component.onDeleteForever(first, new Event('click'));
      fixture.detectChanges();

      expect(component.archivedInsights().map(insight => insight.id)).toEqual([second.id]);
    });

    it('shows the archive empty state after the last archived insight is deleted', () => {
      const target = component.insights()[0];
      component.onDismissCard(target, new Event('click'));
      fixture.detectChanges();
      component.onToggleArchive();
      fixture.detectChanges();

      component.onDeleteForever(target, new Event('click'));
      fixture.detectChanges();

      expect(component.hasInsights()).toBe(false);
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.o-dashboard-insights__empty')).toBeTruthy();
    });

    it('returns to the live deck when a focus request arrives while the archive is open', () => {
      const target = component.insights()[0];
      component.onDismissCard(target, new Event('click'));
      fixture.detectChanges();
      component.onToggleArchive();
      fixture.detectChanges();
      expect(component.showArchived()).toBe(true);

      fixture.componentRef.setInput('focusInsightId', target.id);
      fixture.detectChanges();

      expect(component.showArchived()).toBe(false);
      expect(component.insights()[component.frontIndex()].id).toBe(target.id);
    });
  });

  it('ignores a focus id that does not match any currently visible insight', () => {
    fixture.componentRef.setInput('focusInsightId', 'not_a_real_insight_id');
    fixture.detectChanges();

    expect(component.frontIndex()).toBe(0);
  });

  it('checks recurring item confirmation states and count', () => {
    const insight = {
      id: 'active_subscriptions',
      kind: 'active_subscriptions' as const,
      visualArchetype: 'trend_table' as const,
      icon: 'repeat',
      title: 'Active Subscriptions',
      subtext: 'Subtext',
      filter: null,
      route: '/movements',
      action: null,
      payload: {
        items: [
          { description: 'Spotify', amount: 10, transactionId: 'tx-1', isRecurring: true },
          { description: 'Netflix', amount: 15, transactionId: 'tx-2', isRecurring: false },
        ]
      }
    };

    expect(component.isItemRecurringConfirmed(insight.payload.items[0])).toBe(true);
    expect(component.isItemRecurringConfirmed(insight.payload.items[1])).toBe(false);
    expect(component.unconfirmedSubscriptionCount(insight)).toBe(1);
    expect(component.canConfirmRecurrence(insight)).toBe(true);
    expect(component.isRecurrenceAllConfirmed(insight)).toBe(false);
  });
});
