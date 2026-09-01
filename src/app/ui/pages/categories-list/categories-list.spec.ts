import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CategoriesListComponent } from './categories-list';
import { CATEGORY_REPOSITORY_TOKEN, TRANSACTION_REPOSITORY_TOKEN } from '@application/tokens';
import { I18nService } from '@application/i18n.service';
import { APP_STORE_TOKEN } from '@application/app-store';
import { CategoriesSelectors } from '@application/selectors/categories.selectors';
import { CategoryBudgetCardComponent } from '@ui/components/organisms/category-budget-card/category-budget-card';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { signal } from '@angular/core';
import { createMockStore } from '@/mocks/store.mock';
import { createMockI18nService } from '@/mocks/services.mock';
import { createMockCategoryRepository, createMockTransactionRepository } from '@/mocks/repositories.mock';

describe('CategoriesListComponent - Salarios Mapping Test', () => {
    let component: CategoriesListComponent;
    let fixture: ComponentFixture<CategoriesListComponent>;

    const mockCategoryRepository = createMockCategoryRepository();
    const mockTransactionRepository = createMockTransactionRepository();
    const mockStore = createMockStore();

    const mockCategoriesSelectors = {
        chartData: signal({ ids: ['Income'], labels: ['Salary'], datasets: [{ data: [2500] }] })
    };

    const mockI18nService = createMockI18nService({
        t: vi.fn().mockReturnValue({ chartPieTitle: 'Categories', noExpenses: 'No expenses' }),
        setLanguage: vi.fn()
    });

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CategoriesListComponent],
            providers: [
                { provide: CATEGORY_REPOSITORY_TOKEN, useValue: mockCategoryRepository },
                { provide: TRANSACTION_REPOSITORY_TOKEN, useValue: mockTransactionRepository },
                { provide: APP_STORE_TOKEN, useValue: mockStore },
                { provide: CategoriesSelectors, useValue: mockCategoriesSelectors },
                { provide: I18nService, useValue: mockI18nService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(CategoriesListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should correctly map the "Income" category when the route id is "income"', () => {
        fixture.componentRef.setInput('id', 'income');
        fixture.detectChanges();

        const category = component['category']();
        expect(category).not.toBeNull();
        expect(category?.id).toBe('Income');

        const txs = component['filteredTransactions']();
        expect(txs.length).toBeGreaterThanOrEqual(1);
        expect(txs.every(t => t.category === 'Income')).toBe(true);
    });

    it('does not render the category budget card for the "all categories" pseudo-view', () => {
        fixture.detectChanges();

        const card = fixture.debugElement.query(By.directive(CategoryBudgetCardComponent));
        expect(card).toBeFalsy();
    });

    it('renders the category budget card with a null progress when no budget exists yet', () => {
        mockStore.budgets.set([]);
        fixture.componentRef.setInput('id', 'income');
        fixture.detectChanges();

        const card = fixture.debugElement.query(By.directive(CategoryBudgetCardComponent));
        expect(card).toBeTruthy();
        expect(card.componentInstance.budgetProgress).toBeNull();
    });

    it('renders the category budget card with a non-null progress when a matching budget exists', () => {
        mockStore.budgets.set([
            { id: 'b-income', name: 'Income Budget', type: 'category', categoryId: 'Income', amount: 500 }
        ] as any);
        fixture.componentRef.setInput('id', 'income');
        fixture.detectChanges();

        const card = fixture.debugElement.query(By.directive(CategoryBudgetCardComponent));
        expect(card).toBeTruthy();
        expect(card.componentInstance.budgetProgress).not.toBeNull();
        expect(card.componentInstance.budgetProgress.budget.id).toBe('b-income');
    });
});