import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Transaction } from '@domain/models/transaction';
import { Header } from './header';
import { APP_STORE_TOKEN } from '@application/app-store';
import { signal } from '@angular/core';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

describe('Header', () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;
  let queryParams$: BehaviorSubject<Record<string, string>>;
  let mockStore: {
    startDate: ReturnType<typeof signal<string>>;
    endDate: ReturnType<typeof signal<string>>;
    preset: ReturnType<typeof signal<string>>;
    minAvailableDate: ReturnType<typeof signal<string | undefined>>;
    maxAvailableDate: ReturnType<typeof signal<string | undefined>>;
    transactions: ReturnType<typeof signal<Transaction[]>>;
    applyPreset: ReturnType<typeof vi.fn>;
    triggerAddClick: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockStore = {
      startDate: signal('2026-08-01'),
      endDate: signal('2026-08-31'),
      preset: signal('current_month'),
      minAvailableDate: signal(undefined),
      maxAvailableDate: signal(undefined),
      transactions: signal([]),
      applyPreset: vi.fn(),
      triggerAddClick: vi.fn()
    };
    queryParams$ = new BehaviorSubject<Record<string, string>>({});

    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [
        { provide: APP_STORE_TOKEN, useValue: mockStore },
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParams: queryParams$.asObservable() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit toggleSidenav on nav toggle', () => {
    const spy = vi.spyOn(component.toggleSidenav, 'emit');
    component.onNavToggle();
    expect(spy).toHaveBeenCalled();
  });

  it('should apply preset on preset change', () => {
    component.onPresetChange('last_month');
    expect(mockStore.applyPreset).toHaveBeenCalledWith('last_month');
  });

  it('should update store dates on range change', () => {
    component.onRangeChange({ start: '2026-01-01', end: '2026-01-31' });
    expect(mockStore.startDate()).toBe('2026-01-01');
    expect(mockStore.endDate()).toBe('2026-01-31');
    expect(mockStore.preset()).toBe('custom');
  });

  it('shows no back-to affordance by default', () => {
    expect(component['insightId']()).toBeNull();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.o-header__back-to')).toBeNull();
  });

  it('shows the back-to button when the URL carries an insightId', () => {
    queryParams$.next({ insightId: 'category_overspend' });
    fixture.detectChanges();

    expect(component['insightId']()).toBe('category_overspend');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.o-header__back-to')).toBeTruthy();
  });

  it('navigates back to the dashboard with the originating insight focused', () => {
    queryParams$.next({ insightId: 'category_overspend' });
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.onBackToInsight();

    expect(navigateSpy).toHaveBeenCalledWith(['/'], {
      queryParams: { focusInsight: 'category_overspend' }
    });
  });

  it('shows confirm recurring button and alternates label when confirmed', () => {
    queryParams$.next({ insightId: 'active_subscriptions', search: 'Netflix' });
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('.o-header__confirm-recurring');
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('Desmarcar recorrentes');

    mockStore.transactions.set([
      { id: 't1', description: 'Netflix', amount: -10, isRecurring: true } as unknown as Transaction
    ]);
    fixture.detectChanges();

    expect(btn.textContent).toContain('Confirmar recorrentes');
  });
});
