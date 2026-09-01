import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CategoriesEditComponent } from './categories-edit';
import { CATEGORY_REPOSITORY_TOKEN, TRANSACTION_REPOSITORY_TOKEN } from '@application/tokens';
import { CategoryMlService } from '@application/services/category-ml.service';
import { TEMPLATE_CATEGORIES, CategoryInfo } from '@domain/models/category';
import { APP_STORE_TOKEN } from '@application/app-store';
import { signal } from '@angular/core';

describe('CategoriesEditComponent - Unit Tests', () => {
  let component: CategoriesEditComponent;
  let fixture: ComponentFixture<CategoriesEditComponent>;

  const initialCategories: CategoryInfo[] = [
    ...TEMPLATE_CATEGORIES,
    { id: 'cartao-de-credito', name: 'Cartão de Crédito', icon: 'pi-wallet', color: '#8b5cf6' }
  ];

  const categoryRepositoryMock = {
    getAll: vi.fn(() => Promise.resolve(initialCategories)),
    save: vi.fn(() => Promise.resolve()),
    delete: vi.fn(() => Promise.resolve()),
    clear: vi.fn(() => Promise.resolve())
  };

  const transactionRepositoryMock = {
    getAll: vi.fn(() => Promise.resolve([
      { id: 'tx_1', date: '2026-06-25', description: 'Mesada do Joao', amount: -400.00, category: 'Housing' }
    ])),
    saveAll: vi.fn(() => Promise.resolve()),
  };

  const mockUserRules = [
    { token: 'mesada', category: 'Crianças' },
    { token: 'uber', category: 'Transportation' }
  ];

  const mlServiceMock = {
    getUserRules: vi.fn(() => mockUserRules),
    getGenericRules: vi.fn(() => []),
    deleteRule: vi.fn(),
    toggleRule: vi.fn(),
    resetUserMemory: vi.fn()
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [CategoriesEditComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: CATEGORY_REPOSITORY_TOKEN, useValue: categoryRepositoryMock },
        { provide: TRANSACTION_REPOSITORY_TOKEN, useValue: transactionRepositoryMock },
        { provide: CategoryMlService, useValue: mlServiceMock },
        { provide: APP_STORE_TOKEN, useValue: { cycleStartDay: signal(28) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CategoriesEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create categories component', () => {
    expect(component).toBeTruthy();
  });

  it('should load categories and rules on initialization', async () => {
    await fixture.whenStable();
    expect(categoryRepositoryMock.getAll).toHaveBeenCalled();
    expect(mlServiceMock.getUserRules).toHaveBeenCalled();
    expect(component.categories().length).toBe(initialCategories.length);
    expect(component.rules().length).toBe(2);
  });

  it('should identify predefined categories correctly', () => {
    expect(component['isPredefined']('Housing')).toBe(true);
    expect(component['isPredefined']('cartao-de-credito')).toBe(false);
  });

  it('should support creating a custom category', async () => {

    component['formName'] = 'Mesada';
    component['selectedColor'].set('#ec4899');
    component['selectedIcon'].set('pi-star');

    await component['saveCategory']();

    expect(categoryRepositoryMock.save).toHaveBeenCalledWith({
      id: 'mesada',
      name: 'Mesada',
      color: '#ec4899',
      icon: 'pi-star',
      enabled: true
    });
    expect(categoryRepositoryMock.getAll).toHaveBeenCalled();
  });

  it('should support editing an existing custom category', async () => {
    const targetCustomCat = initialCategories.find(c => c.id === 'cartao-de-credito')!;

    component['startEdit'](targetCustomCat);
    expect(component['isEditing']()).toBe(targetCustomCat);
    expect(component['formName']).toBe('Cartão de Crédito');

    component['formName'] = 'Cartão de Crédito Atualizado';
    await component['saveCategory']();

    expect(categoryRepositoryMock.save).toHaveBeenCalledWith({
      id: 'cartao-de-credito',
      name: 'Cartão de Crédito Atualizado',
      color: '#8b5cf6',
      icon: 'pi-wallet'
    });
    expect(component['isEditing']()).toBeNull();
  });

  it('should support deleting custom categories', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    await component['deleteCategory']('cartao-de-credito');
    expect(categoryRepositoryMock.delete).toHaveBeenCalledWith('cartao-de-credito');
  });

  it('should support toggling ML rules and trigger reclassification if disabled', async () => {
    const targetRule = { token: 'mesada', category: 'Crianças', enabled: true };
    await component['toggleRule'](targetRule);

    expect(mlServiceMock.toggleRule).toHaveBeenCalledWith('mesada');

    expect(transactionRepositoryMock.getAll).toHaveBeenCalled();
    expect(component['showMlDialog']()).toBe(true);
  });

  it('should support toggling category enabled state and trigger reclassification if disabled', async () => {
    const target = initialCategories.find(c => c.id === 'Housing')!;
    await component['toggleCategory'](target);

    expect(categoryRepositoryMock.save).toHaveBeenCalledWith({
      ...target,
      enabled: false
    });

    expect(transactionRepositoryMock.getAll).toHaveBeenCalled();
    expect(component['showMlDialog']()).toBe(true);
  });

  it('should support deleting auto-association ML rules', () => {
    component['deleteRule']('mesada');
    expect(mlServiceMock.deleteRule).toHaveBeenCalledWith('mesada');
  });

  it('should support resetting ML rules memory', () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    component['resetMlRules']();
    expect(mlServiceMock.resetUserMemory).toHaveBeenCalled();
  });
});
