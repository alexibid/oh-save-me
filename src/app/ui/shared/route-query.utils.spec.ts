import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { parseRouteQueryParams, injectInsightId } from './route-query.utils';

describe('RouteQueryUtils', () => {
  it('parses empty params correctly', () => {
    const parsed = parseRouteQueryParams({});
    expect(parsed.insightId).toBeNull();
    expect(parsed.search).toBeNull();
    expect(parsed.category).toBeNull();
  });

  it('parses insightId and origininsightid aliases', () => {
    expect(parseRouteQueryParams({ insightId: 'safe_to_spend' }).insightId).toBe('safe_to_spend');
    expect(parseRouteQueryParams({ origininsightid: 'grocery_forecast' }).insightId).toBe('grocery_forecast');
  });

  it('parses category and legacy categoryId', () => {
    expect(parseRouteQueryParams({ category: 'groceries' }).category).toBe('groceries');
    expect(parseRouteQueryParams({ categoryId: 'utilities' }).category).toBe('utilities');
  });

  it('injects reactive insightId signal from ActivatedRoute', () => {
    const queryParams$ = new BehaviorSubject<{ [key: string]: string }>({ insightId: 'category_overspend' });
    const mockRoute = { queryParams: queryParams$.asObservable() } as unknown as ActivatedRoute;

    TestBed.configureTestingModule({
      providers: [{ provide: ActivatedRoute, useValue: mockRoute }],
    });

    TestBed.runInInjectionContext(() => {
      const insightId = injectInsightId();
      expect(insightId()).toBe('category_overspend');

      queryParams$.next({ origininsightid: 'bill_increase' });
      expect(insightId()).toBe('bill_increase');

      queryParams$.next({});
      expect(insightId()).toBeNull();
    });
  });
});
