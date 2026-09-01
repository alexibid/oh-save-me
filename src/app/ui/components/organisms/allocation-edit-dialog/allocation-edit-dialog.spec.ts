import { TestBed } from '@angular/core/testing';
import { AllocationEditDialogComponent } from './allocation-edit-dialog';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { signal } from '@angular/core';
import { APP_STORE_TOKEN } from '@application/app-store';

describe('AllocationEditDialogComponent', () => {
  let mockDialogRef: any;
  let mockStore: any;

  beforeEach(async () => {
    mockDialogRef = {
      close: vi.fn()
    };

    mockStore = {
      categories: signal([]),
      updateBudget: vi.fn().mockResolvedValue(undefined),
      syncVacationWindow: vi.fn().mockResolvedValue(undefined)
    };

    await TestBed.configureTestingModule({
      imports: [AllocationEditDialogComponent],
      providers: [
        { provide: DialogRef, useValue: mockDialogRef },
        { provide: DIALOG_DATA, useValue: { budget: { id: '1', categoryId: 'cat1', monthlyLimit: 100, rollOver: false } } },
        { provide: APP_STORE_TOKEN, useValue: mockStore }
      ]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(AllocationEditDialogComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('persists the edited fields to the store before closing, instead of only closing the dialog', async () => {
    const fixture = TestBed.createComponent(AllocationEditDialogComponent);
    const component = fixture.componentInstance;

    (component as any).budgetName = 'Renamed Budget';
    (component as any).budgetAmount = 500;
    (component as any).budgetStartDate = '2026-01-01';
    (component as any).budgetEndDate = '2026-12-31';

    await (component as any).onSave();

    expect(mockStore.updateBudget).toHaveBeenCalledWith(expect.objectContaining({
      id: '1',
      name: 'Renamed Budget',
      amount: 500,
      startDate: '2026-01-01',
      endDate: '2026-12-31'
    }));
    expect(mockDialogRef.close).toHaveBeenCalled();
  });
});

describe('AllocationEditDialogComponent — vacation project dates', () => {
  let mockDialogRef: any;
  let mockStore: any;

  beforeEach(async () => {
    mockDialogRef = { close: vi.fn() };
    mockStore = { categories: signal([]), updateBudget: vi.fn().mockResolvedValue(undefined), syncVacationWindow: vi.fn().mockResolvedValue(undefined) };

    await TestBed.configureTestingModule({
      imports: [AllocationEditDialogComponent],
      providers: [
        { provide: DialogRef, useValue: mockDialogRef },
        { provide: DIALOG_DATA, useValue: { budget: { id: 'v1', type: 'project', kind: 'vacation', name: 'Férias', amount: 1000 } } },
        { provide: APP_STORE_TOKEN, useValue: mockStore }
      ]
    }).compileComponents();
  });

  it('persists the vacation period (projectStartDate/projectEndDate) edited via the vacationStartDate/vacationEndDate fields', async () => {
    const fixture = TestBed.createComponent(AllocationEditDialogComponent);
    const component = fixture.componentInstance;

    (component as any).vacationStartDate = '2026-08-01';
    (component as any).vacationEndDate = '2026-08-15';

    await (component as any).onSave();

    expect(mockStore.updateBudget).toHaveBeenCalledWith(expect.objectContaining({
      projectStartDate: '2026-08-01',
      projectEndDate: '2026-08-15'
    }));
  });

  it('re-syncs the window when the vacation dates change, so the new days are picked up and the lost ones released', async () => {
    const fixture = TestBed.createComponent(AllocationEditDialogComponent);
    const component = fixture.componentInstance;

    (component as any).vacationStartDate = '2026-08-01';
    (component as any).vacationEndDate = '2026-08-15';

    await (component as any).onSave();

    expect(mockStore.syncVacationWindow).toHaveBeenCalledWith(expect.objectContaining({
      projectStartDate: '2026-08-01',
      projectEndDate: '2026-08-15'
    }));
  });

  it('leaves the existing assignments alone when the dates were not touched', async () => {
    const fixture = TestBed.createComponent(AllocationEditDialogComponent);
    const component = fixture.componentInstance;

    await (component as any).onSave();

    expect(mockStore.syncVacationWindow).not.toHaveBeenCalled();
  });

  it('refuses to save a vacation window whose end falls before its start', async () => {
    const fixture = TestBed.createComponent(AllocationEditDialogComponent);
    const component = fixture.componentInstance;

    (component as any).vacationStartDate = '2026-08-01';
    (component as any).vacationEndDate = '2026-07-31';

    expect((component as any).vacationWindowReversed()).toBe(true);

    await (component as any).onSave();

    expect(mockStore.updateBudget).not.toHaveBeenCalled();
    expect(mockStore.syncVacationWindow).not.toHaveBeenCalled();
  });

  it('refuses to save a budget period whose end falls before its start', async () => {
    const fixture = TestBed.createComponent(AllocationEditDialogComponent);
    const component = fixture.componentInstance;

    (component as any).budgetStartDate = '2026-08-01';
    (component as any).budgetEndDate = '2026-07-31';

    expect((component as any).budgetPeriodReversed()).toBe(true);

    await (component as any).onSave();

    expect(mockStore.updateBudget).not.toHaveBeenCalled();
  });

  it('does not complain while only one end of the window has been picked', () => {
    const fixture = TestBed.createComponent(AllocationEditDialogComponent);
    const component = fixture.componentInstance;

    (component as any).vacationStartDate = '2026-08-01';
    (component as any).vacationEndDate = '';

    expect((component as any).vacationWindowReversed()).toBe(false);
  });
});