import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryType, CategoryInfo } from '@domain/models/category';
import { Budget } from '@domain/models/budget';
import { I18nService } from '@ui/shared/i18n-shared';
import {
  SearchableSelectComponent,
  SearchableSelectGroup,
  SearchableSelectOption
} from 'ibid-ui';

@Component({
  selector: 'ohsaveme-category-select',
  standalone: true,
  imports: [CommonModule, SearchableSelectComponent],
  template: `
    <ibid-searchable-select
      [value]="selectedCategory"
      [label]="i18n.getCategoryName(selectedCategory)"
      [color]="selectedCategoryColor"
      [glassColor]="selectedCategoryColor"
      [handDrawn]="2"
      [projectName]="selectedProjectName"
      [groups]="groups()"
      [options]="categoryOptions()"
      [showCreateOption]="true"
      [createOptionLabel]="'+ ' + (i18n.currentLang() === 'pt' ? 'Nova Categoria' : 'New Category') + '...'"
      [disabled]="_disabled()"
      [assistantSuggested]="_assistantSuggested()"
      [ariaLabel]="i18n.currentLang() === 'pt' ? 'Selecionar categoria' : 'Select category'"
      [searchPlaceholder]="i18n.currentLang() === 'pt' ? 'Pesquisar categoria ou projeto' : 'Search category or project'"
      (valueChange)="selectCategory($event)"
      (groupToggle)="onGroupToggle($event)"
      (createClick)="onCreateCategory()"
    ></ibid-searchable-select>
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

  get selectedCategoryColor(): string | undefined {
    return this.categories?.find(c => c.id === this.selectedCategory)?.color;
  }

  protected readonly groups = computed<SearchableSelectGroup<string>[]>(() => {
    if (!this.projects || this.projects.length === 0) return [];
    return [
      {
        title: this.i18n.currentLang() === 'pt' ? 'Projetos' : 'Projects',
        mode: 'checkbox',
        options: this.projects.map(p => ({
          value: p.id,
          label: p.name,
          selected: this.isProjectSelected(p)
        }))
      }
    ];
  });

  protected readonly categoryOptions = computed<SearchableSelectOption<CategoryType>[]>(() => {
    return (this.categories || []).map(cat => ({
      value: cat.id,
      label: this.i18n.getCategoryName(cat.id),
      color: cat.color,
      icon: cat.icon || 'help',
      selected: cat.id === this.selectedCategory
    }));
  });

  isProjectSelected(project: Budget): boolean {
    if (this.selectedProjectId) {
      return this.selectedProjectId === project.id;
    }
    if (this.selectedProjectName) {
      return this.selectedProjectName === project.name;
    }
    return false;
  }

  selectCategory(categoryId: CategoryType): void {
    this.selectedCategory = categoryId;
    this.categoryChange.emit(categoryId);
  }

  onGroupToggle(event: { group: SearchableSelectGroup<string>; option: SearchableSelectOption<string> }): void {
    const isSelected = event.option.selected;
    const newId = isSelected ? undefined : event.option.value;
    const proj = this.projects.find(p => p.id === newId);
    this.selectedProjectId = newId;
    this.selectedProjectName = proj?.name;
    this.projectChange.emit(newId);
  }

  onCreateCategory(): void {
    this.createCategoryClick.emit();
  }
}
