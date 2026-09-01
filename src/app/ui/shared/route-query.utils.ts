import { Signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

export interface RouteFilterParams {
  readonly insightId: string | null;
  readonly search: string | null;
  readonly category: string | null;
  readonly filter: string | null;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly budgetId: string | null;
  readonly accountId: string | null;
  readonly focusInsight: string | null;
}

export function parseRouteQueryParams(params: Params): RouteFilterParams {
  const insight = (params['insightId'] ?? params['origininsightid'] ?? null) as string | null;
  return {
    insightId: insight,
    search: (params['search'] ?? null) as string | null,
    category: (params['category'] ?? params['categoryId'] ?? null) as string | null,
    filter: (params['filter'] ?? null) as string | null,
    startDate: (params['startDate'] ?? null) as string | null,
    endDate: (params['endDate'] ?? null) as string | null,
    budgetId: (params['budgetId'] ?? params['project'] ?? null) as string | null,
    accountId: (params['accountId'] ?? params['account'] ?? null) as string | null,
    focusInsight: (params['focusInsight'] ?? null) as string | null,
  };
}

export function injectRouteQueryParams(route?: ActivatedRoute): Signal<Params> {
  const activeRoute = route ?? inject(ActivatedRoute);
  return toSignal(activeRoute.queryParams, { initialValue: {} as Params });
}

export function injectParsedRouteFilters(route?: ActivatedRoute): Signal<RouteFilterParams> {
  const queryParams = injectRouteQueryParams(route);
  return computed(() => parseRouteQueryParams(queryParams()));
}

export function injectInsightId(route?: ActivatedRoute): Signal<string | null> {
  const filters = injectParsedRouteFilters(route);
  return computed(() => { return filters().insightId });
}

export function injectHasHeaderActionRow(route?: ActivatedRoute): Signal<boolean> {
  const filters = injectParsedRouteFilters(route);
  return computed(() => {
    const f = filters();
    return !!f.insightId || f.filter === 'recurring' || f.insightId === 'active_subscriptions' || !!f.search;
  });
}

export function injectRouteQueryParam(paramName: string, route?: ActivatedRoute): Signal<string | null> {
  const queryParams = injectRouteQueryParams(route);
  return computed(() => (queryParams()[paramName] ?? null) as string | null);
}

