import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryType, CategoryInfo } from '@domain/models/category';
import { Budget } from '@domain/models/budget';
import { I18nService } from '@ui/shared/i18n-shared';
import { SmartBudgetCellComponent } from 'ibid-ui';

const PROJECT_OPTION_PREFIX = 'PROJECT:';

@Component({
  selector: 'ohsaveme-category-select',
  standalone: true,
  imports: [CommonModule, SmartBudgetCellComponent],
  template: `
    <div class="a-category-select-wrapper">
      <button
        type="button"
        class="a-category-select__btn"
        [disabled]="_disabled()"
        [attr.data-assistant]="_assistantSuggested() ? 'true' : 'false'"
        [attr.aria-label]="i18n.currentLang() === 'pt' ? 'Selecionar categoria' : 'Select category'"
        (click)="openSearch()"
        [style.display]="searchMode() ? 'none' : 'flex'"
      >
        <ibid-smart-budget-cell
          [categoryId]="selectedCategory"
          [categoryName]="i18n.getCategoryName(selectedCategory)"
          [categoryColor]="selectedCategoryColor"
          [projectName]="selectedProjectName"
          [showChevron]="true"
        ></ibid-smart-budget-cell>
      </button>

      <input
        #searchInput
        type="text"
        class="a-input a-category-select__input"
        [attr.aria-label]="i18n.currentLang() === 'pt' ? 'Pesquisar categoria ou projeto' : 'Search category or project'"
        [value]="searchQuery()"
        (input)="onSearchInput($event)"
        (blur)="closeSearch()"
        [style.display]="searchMode() ? 'block' : 'none'"
      />

      @if (searchMode()) {
        <div class="a-category-select__dropdown" role="listbox" [attr.aria-label]="i18n.currentLang() === 'pt' ? 'Lista de categorias' : 'Categories list'">
          @if (filteredProjects().length > 0) {
            <div
              role="group"
              [attr.aria-label]="i18n.currentLang() === 'pt' ? 'Projetos' : 'Projects'"
            >
            <div class="a-category-select__section-header" aria-hidden="true">
              {{ i18n.currentLang() === 'pt' ? 'Projetos' : 'Projects' }}
            </div>
            @for (project of filteredProjects(); track project.id) {
              <div
                class="a-category-select__option a-category-select__option--project"
                role="option"
                [attr.aria-selected]="isProjectSelected(project)"
                [class.a-category-select__option--selected]="isProjectSelected(project)"
                (mousedown)="$event.preventDefault(); toggleProject(project)"
              >
                <span class="a-category-select__checkbox" [class.a-category-select__checkbox--checked]="isProjectSelected(project)">
                  @if (isProjectSelected(project)) {
                    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
                    </svg>
                  }
                </span>
                <span class="a-category-select__project-label">{{ project.name }}</span>
              </div>
            }
            <div class="a-category-select__separator" aria-hidden="true"></div>
            </div>
          }

          <div
            role="group"
            [attr.aria-label]="i18n.currentLang() === 'pt' ? 'Categorias' : 'Categories'"
          >
          <div class="a-category-select__section-header" aria-hidden="true">
            {{ i18n.currentLang() === 'pt' ? 'Categorias' : 'Categories' }}
          </div>

          <div
            class="a-category-select__option a-category-select__option--create"
            role="option"
            aria-selected="false"
            (mousedown)="$event.preventDefault(); onCreateCategory()"
          >
            + {{ i18n.currentLang() === 'pt' ? 'Nova Categoria' : 'New Category' }}...
          </div>

          @for (cat of filteredCategories(); track cat.id) {
            <div
              class="a-category-select__option"
              role="option"
              [attr.aria-selected]="cat.id === selectedCategory"
              [class.a-category-select__option--selected]="cat.id === selectedCategory"
              (mousedown)="$event.preventDefault(); selectCategory(cat.id)"
            >
              <span class="a-category-select__checkbox" [class.a-category-select__checkbox--checked]="cat.id === selectedCategory">
                @if (cat.id === selectedCategory) {
                  <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
                  </svg>
                }
              </span>
              <span class="a-category-select__dot" [style.background-color]="cat.color"></span>
              <span class="a-category-select__category-label">{{ i18n.getCategoryName(cat.id) }}</span>
            </div>
          }
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './category-select.scss'
})
export class CategorySelectComponent {
  protected readonly i18n = inject(I18nService);

  @Input({ required: true }) selectedCategory!: CategoryType;
  @Input({ required: true }) categories!: CategoryInfo[];
  @Input() projects: readonly Budget[] = [];
  @Input() selectedProjectId: string | undefined = undefined;
  @Input() selectedProjectName: string | undefined = undefined;

  @Input() set assistantSuggested(val: boolean) {
    this._assistantSuggested.set(val);
  }
  get assistantSuggested(): boolean {
    return this._assistantSuggested();
  }
  protected readonly _assistantSuggested = signal(false);

  @Input() set disabled(val: boolean) {
    this._disabled.set(val);
  }
  get disabled(): boolean {
    return this._disabled();
  }
  protected readonly _disabled = signal(false);

  @Output() categoryChange = new EventEmitter<CategoryType>();
  @Output() projectChange = new EventEmitter<string | undefined>();
  @Output() createCategoryClick = new EventEmitter<void>();

  @ViewChild('searchInput') private readonly searchInput?: ElementRef<HTMLInputElement>;

  protected readonly searchMode = signal(false);
  protected readonly searchQuery = signal('');

  protected readonly filteredCategories = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.categories;
    return this.categories.filter(cat => this.i18n.getCategoryName(cat.id).toLowerCase().includes(query));
  });

  protected readonly filteredProjects = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.projects;
    return this.projects.filter(project => project.name.toLowerCase().includes(query));
  });

  get selectedCategoryColor(): string | undefined {
    return this.categories?.find(c => c.id === this.selectedCategory)?.color;
  }

  isProjectSelected(project: Budget): boolean {
    if (this.selectedProjectId) {
      return this.selectedProjectId === project.id;
    }
    if (this.selectedProjectName) {
      return this.selectedProjectName === project.name;
    }
    return false;
  }

  protected projectOptionValue(projectId: string): string {
    return `${PROJECT_OPTION_PREFIX}${projectId}`;
  }

  protected openSearch() {
    if (this._disabled()) return;
    this.searchMode.set(true);
    setTimeout(() => this.searchInput?.nativeElement.focus());
  }

  protected closeSearch() {
    this.searchMode.set(false);
    this.searchQuery.set('');
  }

  protected onSearchInput(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  toggleProject(project: Budget) {
    const isSelected = this.isProjectSelected(project);
    const newId = isSelected ? undefined : project.id;
    this.selectedProjectId = newId;
    this.selectedProjectName = newId ? project.name : undefined;
    this.projectChange.emit(newId);
  }

  selectCategory(categoryId: CategoryType) {
    this.selectedCategory = categoryId;
    this.closeSearch();
    this.categoryChange.emit(categoryId);
  }

  onCreateCategory() {
    this.closeSearch();
    this.createCategoryClick.emit();
  }

  onChange(value: string) {
    this.closeSearch();

    if (value === 'NEW_CATEGORY_TRIGGER') {
      this.createCategoryClick.emit();
    } else if (value.startsWith(PROJECT_OPTION_PREFIX)) {
      const pid = value.slice(PROJECT_OPTION_PREFIX.length);
      const proj = this.projects.find(p => p.id === pid);
      if (proj && this.isProjectSelected(proj)) {
        this.projectChange.emit(undefined);
      } else {
        this.projectChange.emit(pid);
      }
    } else {
      this.categoryChange.emit(value as CategoryType);
    }
  }
}
