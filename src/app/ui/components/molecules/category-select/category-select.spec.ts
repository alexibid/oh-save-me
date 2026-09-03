import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CategorySelectComponent } from './category-select';
import { CategoryType } from '@domain/models/category';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { I18nService } from '@ui/shared/i18n-shared';

describe('CategorySelectComponent', () => {
  let component: CategorySelectComponent;
  let fixture: ComponentFixture<CategorySelectComponent>;

  const mockI18nService = {
    t: () => ({}),
    currentLang: () => 'pt',
    getCategoryName: (id: string) => id
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategorySelectComponent, NoopAnimationsModule],
      providers: [{ provide: I18nService, useValue: mockI18nService }]
    }).compileComponents();

    fixture = TestBed.createComponent(CategorySelectComponent);
    component = fixture.componentInstance;
    component.selectedCategory = 'Groceries';
    component.categories = [
      { id: 'Groceries', name: 'Groceries', color: '#000', icon: 'pi-shopping-cart' },
      { id: 'Housing', name: 'Housing', color: '#111', icon: 'pi-home' }
    ];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit categoryChange when selection changes', () => {
    let emittedCategory: CategoryType | null = null;
    component.categoryChange.subscribe((cat) => {
      emittedCategory = cat;
    });

    component.selectCategory('Housing');

    expect(emittedCategory).toBe('Housing');
  });

  it('should emit createCategoryClick', () => {
    let emitted = false;
    component.createCategoryClick.subscribe(() => {
      emitted = true;
    });

    component.onCreateCategory();

    expect(emitted).toBe(true);
  });

  it('sets data-assistant on the trigger button when assistantSuggested is true', () => {
    component.assistantSuggested = true;
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('data-assistant')).toBe('true');
  });

  it('sets data-assistant="false" by default', () => {
    const button = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('data-assistant')).toBe('false');
  });

  it('disables the trigger button when disabled is true', () => {
    component.disabled = true;
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    expect(button.disabled).toBe(true);
  });

  describe('project options', () => {
    beforeEach(() => {
      component.projects = [
        { id: 'proj-1', name: 'Férias Algarve 2026', type: 'project', amount: 1000 } as never,
        { id: 'proj-2', name: 'Obras Casa', type: 'project', amount: 2000 } as never
      ];
      fixture.detectChanges();
    });

    it('emits projectChange when group option is toggled', () => {
      let emittedProjectId: string | undefined = undefined;
      component.projectChange.subscribe((id) => {
        emittedProjectId = id;
      });

      component.onGroupToggle({
        group: component['groups']()[0],
        option: { value: 'proj-1', label: 'Férias Algarve 2026', selected: false }
      });

      expect(emittedProjectId).toBe('proj-1');
    });

    it('identifies selected project correctly by id or name', () => {
      component.selectedProjectId = 'proj-1';
      expect(component.isProjectSelected(component.projects[0])).toBe(true);
      expect(component.isProjectSelected(component.projects[1])).toBe(false);

      component.selectedProjectId = undefined;
      component.selectedProjectName = 'Obras Casa';
      expect(component.isProjectSelected(component.projects[0])).toBe(false);
      expect(component.isProjectSelected(component.projects[1])).toBe(true);
    });
  });
});
