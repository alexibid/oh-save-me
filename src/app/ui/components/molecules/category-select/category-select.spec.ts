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

  it('should emit categoryChange when selection changes with normal category', () => {
    let emittedCategory: CategoryType | null = null;
    component.categoryChange.subscribe((cat) => {
      emittedCategory = cat;
    });

    component.onChange('Housing');

    expect(emittedCategory).toBe('Housing');
  });

  it('should emit createCategoryClick when selection changes with trigger', () => {
    let emitted = false;
    component.createCategoryClick.subscribe(() => {
      emitted = true;
    });

    component.onChange('NEW_CATEGORY_TRIGGER');

    expect(emitted).toBe(true);
  });

  it('sets data-assistant="true" on the trigger button when assistantSuggested is true, triggering the glow treatment', () => {
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

  it('does not open the search panel when disabled', () => {
    component.disabled = true;
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button').click();

    expect(component['searchMode']()).toBe(false);
  });

  describe('compact searchable panel', () => {
    it('is closed by default', () => {
      expect(component['searchMode']()).toBe(false);
    });

    it('opens search mode when the trigger button is clicked', () => {
      fixture.nativeElement.querySelector('button').click();
      expect(component['searchMode']()).toBe(true);
    });

    it('filters categories by search query, case-insensitively', () => {
      component['searchQuery'].set('hous');
      expect(component['filteredCategories']().map(c => c.id)).toEqual(['Housing']);
    });

    it('shows every category when the search query is empty', () => {
      expect(component['filteredCategories']().map(c => c.id)).toEqual(['Groceries', 'Housing']);
    });

    it('closes search mode and clears the search query after selecting a category', () => {
      component['searchMode'].set(true);
      component['searchQuery'].set('hous');

      component.onChange('Housing');

      expect(component['searchMode']()).toBe(false);
      expect(component['searchQuery']()).toBe('');
    });
  });

  describe('project options', () => {
    beforeEach(() => {
      component.projects = [
        { id: 'proj-1', name: 'Férias Algarve 2026', type: 'project', amount: 1000 } as never,
        { id: 'proj-2', name: 'Obras Casa', type: 'project', amount: 2000 } as never
      ];
      fixture.detectChanges();
    });

    it('emits projectChange with the raw project id when a project option is chosen', () => {
      let emittedProjectId: string | undefined | null = null;
      component.projectChange.subscribe((id) => {
        emittedProjectId = id;
      });

      component.onChange(component['projectOptionValue']('proj-1'));

      expect(emittedProjectId).toBe('proj-1');
    });

    it('does not emit categoryChange when a project option is chosen', () => {
      let categoryEmitted = false;
      component.categoryChange.subscribe(() => {
        categoryEmitted = true;
      });

      component.onChange(component['projectOptionValue']('proj-1'));

      expect(categoryEmitted).toBe(false);
    });

    it('filters projects by search query, case-insensitively', () => {
      component['searchQuery'].set('algarve');
      expect(component['filteredProjects']().map(p => p.id)).toEqual(['proj-1']);
    });

    it('shows every project when the search query is empty', () => {
      expect(component['filteredProjects']().map(p => p.id)).toEqual(['proj-1', 'proj-2']);
    });

    it('emits undefined to deselect project when clicking an already selected project', () => {
      component.selectedProjectId = 'proj-1';
      let emitted: string | undefined = 'initial';
      component.projectChange.subscribe(id => { emitted = id; });

      component.toggleProject(component.projects[0]);

      expect(emitted).toBeUndefined();
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

    it('handles clicking a project and then a category in the dropdown', () => {
      let emittedProject: string | undefined = undefined;
      let emittedCategory: CategoryType | null = null;
      component.projectChange.subscribe(id => { emittedProject = id; });
      component.categoryChange.subscribe(cat => { emittedCategory = cat; });

      const triggerBtn = fixture.nativeElement.querySelector('.a-category-select__btn');
      triggerBtn.click();
      fixture.detectChanges();

      expect(component['searchMode']()).toBe(true);

      const projectOption = fixture.nativeElement.querySelector('.a-category-select__option--project');
      projectOption.dispatchEvent(new MouseEvent('mousedown'));
      fixture.detectChanges();

      expect(emittedProject).toBe('proj-1');
      expect(component['searchMode']()).toBe(true);
      expect(component.selectedProjectId).toBe('proj-1');

      const categoryOptions = fixture.nativeElement.querySelectorAll('.a-category-select__option:not(.a-category-select__option--project):not(.a-category-select__option--create)');
      categoryOptions[1].dispatchEvent(new MouseEvent('mousedown'));
      fixture.detectChanges();

      expect(emittedCategory).toBe('Housing');
      expect(component['searchMode']()).toBe(false);
    });
  });
});
