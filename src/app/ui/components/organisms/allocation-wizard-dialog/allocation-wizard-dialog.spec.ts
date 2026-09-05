import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllocationWizardDialogComponent } from './allocation-wizard-dialog';

import { APP_STORE_TOKEN } from '@application/app-store';
import { DialogRef } from '@angular/cdk/dialog';

describe('AllocationWizardDialogComponent', () => {
  let component: AllocationWizardDialogComponent;
  let fixture: ComponentFixture<AllocationWizardDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllocationWizardDialogComponent],
      providers: [
        { provide: APP_STORE_TOKEN, useValue: { dispatch: () => {} } },
        { provide: DialogRef, useValue: { close: () => {} } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AllocationWizardDialogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('detects reversed budget periods', () => {
    component.startDate = '2026-08-15';
    component.endDate = '2026-08-01';
    expect(component['budgetPeriodReversed']()).toBe(true);

    component.endDate = '2026-08-30';
    expect(component['budgetPeriodReversed']()).toBe(false);
  });

  it('detects reversed vacation windows', () => {
    component.projectKind = 'vacation';
    component.projectStartDate = '2026-08-20';
    component.projectEndDate = '2026-08-10';
    expect(component['vacationWindowReversed']()).toBe(true);

    component.projectEndDate = '2026-08-25';
    expect(component['vacationWindowReversed']()).toBe(false);
  });
});
