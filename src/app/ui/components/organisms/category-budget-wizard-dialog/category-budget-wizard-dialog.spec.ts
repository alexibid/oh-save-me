import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { DIALOG_DATA, DialogModule, DialogRef } from '@angular/cdk/dialog';
import { CategoryBudgetWizardDialogComponent } from './category-budget-wizard-dialog';
import { APP_STORE_TOKEN } from '@application/app-store';

const createMockStore = () => ({
      categoryBudgetSuggestions: signal({}),
      transactions: signal([]),
      startDate: signal(''),
      endDate: signal(''),
      budgets: signal([]),
      categories: signal([]),
      deleteBudget: vi.fn()
    });

describe('CategoryBudgetWizardDialogComponent', () => {
  let fixture: ComponentFixture<CategoryBudgetWizardDialogComponent>;
  let component: CategoryBudgetWizardDialogComponent;
  let dialogRefSpy: { close: ReturnType<typeof vi.fn> };
  let mockStore: ReturnType<typeof createMockStore>;

  beforeEach(async () => {
    dialogRefSpy = { close: vi.fn() };
    mockStore = createMockStore();

    await TestBed.configureTestingModule({
      imports: [CategoryBudgetWizardDialogComponent, DialogModule],
      providers: [
        {
          provide: DIALOG_DATA,
          useValue: { categoryId: 'cat-1', categoryName: 'Food', existingBudget: null }
        },
        { provide: DialogRef, useValue: dialogRefSpy },
        { provide: APP_STORE_TOKEN, useValue: mockStore }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryBudgetWizardDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
