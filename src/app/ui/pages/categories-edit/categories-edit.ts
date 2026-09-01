import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CATEGORY_REPOSITORY_TOKEN, TRANSACTION_REPOSITORY_TOKEN } from '@application/tokens';
import { useStore } from '@application/app-store';
import { CategoryMlService } from '@application/services/category-ml.service';
import { CategoryInfo, CategoryType, TEMPLATE_CATEGORIES } from '@domain/models/category';
import { Transaction } from '@domain/models/transaction';
import { MlConfirmationDialogComponent } from '@ui/components/organisms/ml-confirmation-dialog/ml-confirmation-dialog';
import { normalizeText, slugify } from '@ibid/utils';
import { I18nService } from '@ui/shared/i18n-shared';
import { ButtonComponent, FormFieldComponent, IconButtonComponent, IconComponent } from 'ibid-ui';

@Component({
  selector: 'ohsaveme-categories-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MlConfirmationDialogComponent,
    ButtonComponent,
    IconButtonComponent,
    FormFieldComponent,
    IconComponent
  ],
  templateUrl: './categories-edit.html',
  styleUrl: './categories-edit.scss'
})
export class CategoriesEditComponent implements OnInit, OnDestroy {
  protected readonly store = useStore();
  protected readonly i18n = inject(I18nService);
  private readonly categoryRepository = inject(CATEGORY_REPOSITORY_TOKEN);
  private readonly transactionRepository = inject(TRANSACTION_REPOSITORY_TOKEN);
  private readonly mlService = inject(CategoryMlService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  public readonly cycleStartDay = this.store.cycleStartDay;

  public readonly categories = signal<CategoryInfo[]>([]);
  public readonly rules = signal<{ token: string; category: CategoryType; enabled: boolean }[]>([]);
  public readonly genericRules = signal<{ token: string; category: CategoryType; enabled: boolean }[]>([]);

  protected formName = '';
  protected readonly selectedColor = signal<string>('#3b82f6');
  protected readonly selectedIcon = signal<string>('pi-tag');
  protected readonly isEditing = signal<CategoryInfo | null>(null);

  protected readonly showMlDialog = signal<boolean>(false);
  protected readonly mlTargetCategory = signal<CategoryType>('');
  protected readonly mlSimilarTransactions = signal<readonly Transaction[]>([]);

  protected readonly presetColors = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#14b8a6',
    '#6b7280',
    '#22c55e',
  ];

  protected readonly presetIcons = [
    'pi-tag',
    'pi-home',
    'pi-shopping-bag',
    'pi-shopping-cart',
    'pi-car',
    'pi-play-circle',
    'pi-book',
    'pi-heart',
    'pi-gift',
    'pi-desktop',
    'pi-compass',
    'pi-wallet',
    'pi-info-circle',
    'pi-chart-line',
  ];

  ngOnInit() {
    this.updateLanguageByRoute();
    this.loadCategories();
    this.loadRules();
  }

  ngOnDestroy() {
    this.removeHrefLagnTags();
  }

  private updateLanguageByRoute() {
    const url = this.router.url;
    if (url.includes('/categories')) {
      this.i18n.setLanguage('en');
    } else if (url.includes('/categorias')) {
      this.i18n.setLanguage('pt');
    }
    this.updateHrefLagnTags();
  }

  private updateHrefLagnTags() {
    if (typeof window === 'undefined') return;

    this.removeHrefLagnTags();

    const origin = window.location.origin;

    const linkPt = this.document.createElement('link');
    linkPt.setAttribute('rel', 'alternate');
    linkPt.setAttribute('hreflang', 'pt');
    linkPt.setAttribute('href', `${origin}/categorias`);

    const linkEn = this.document.createElement('link');
    linkEn.setAttribute('rel', 'alternate');
    linkEn.setAttribute('hreflang', 'en');
    linkEn.setAttribute('href', `${origin}/categories`);

    this.document.head.appendChild(linkPt);
    this.document.head.appendChild(linkEn);
  }

  private removeHrefLagnTags() {
    if (typeof window === 'undefined') return;
    const existing = this.document.querySelectorAll('link[hreflang]');
    existing.forEach(el => el.remove());
  }

  private async loadCategories() {
    const list = await this.categoryRepository.getAll();
    this.categories.set([...list]);
  }

  private loadRules() {
    const list = this.mlService.getUserRules();
    this.rules.set(list);
    const generic = this.mlService.getGenericRules();
    this.genericRules.set(generic);
  }

  protected isPredefined(id: string): boolean {
    return TEMPLATE_CATEGORIES.some(c => c.id === id);
  }

  protected hasCustomCategories(): boolean {
    return this.categories().some(c => !this.isPredefined(c.id));
  }

  protected startEdit(category: CategoryInfo) {
    this.isEditing.set(category);
    this.formName = category.name;
    this.selectedColor.set(category.color);
    this.selectedIcon.set(category.icon);
  }

  protected cancelEdit() {
    this.isEditing.set(null);
    this.resetForm();
  }

  private resetForm() {
    this.formName = '';
    this.selectedColor.set('#3b82f6');
    this.selectedIcon.set('pi-tag');
  }

  protected async saveCategory() {
    if (!this.formName.trim()) return;

    const editingItem = this.isEditing();
    if (editingItem) {

      const updated: CategoryInfo = {
        ...editingItem,
        name: this.formName.trim(),
        color: this.selectedColor(),
        icon: this.selectedIcon()
      };
      await this.categoryRepository.save(updated);
      this.isEditing.set(null);
    } else {

      const id = slugify(this.formName);
      const newCategory: CategoryInfo = {
        id: id || `cat-${Date.now()}`,
        name: this.formName.trim(),
        color: this.selectedColor(),
        icon: this.selectedIcon(),
        enabled: true
      };
      await this.categoryRepository.save(newCategory);
    }

    this.resetForm();
    await this.loadCategories();
  }

  protected async deleteCategory(id: string) {
    if (confirm('Tem a certeza que deseja eliminar esta categoria personalizada?')) {
      await this.categoryRepository.delete(id);
      await this.loadCategories();
    }
  }

  protected async toggleCategory(category: CategoryInfo) {
    const nextEnabled = category.enabled === false ? true : false;
    const updated: CategoryInfo = {
      ...category,
      enabled: nextEnabled
    };
    await this.categoryRepository.save(updated);
    await this.loadCategories();

    if (!nextEnabled) {
      const allTx = await this.transactionRepository.getAll();
      const affectedTx = allTx.filter(tx => tx.category === category.id);
      if (affectedTx.length > 0) {
        this.mlSimilarTransactions.set(affectedTx);
        const fallback = this.categories().find(c => c.enabled !== false && c.id !== category.id)?.id || 'Others';
        this.mlTargetCategory.set(fallback);
        this.showMlDialog.set(true);
      }
    }
  }

  protected async toggleRule(rule: { token: string; category: CategoryType; enabled: boolean }) {
    this.mlService.toggleRule(rule.token);
    this.loadRules();

    const isNowDisabled = rule.enabled;
    if (isNowDisabled) {
      const allTx = await this.transactionRepository.getAll();
      const affectedTx = allTx.filter(tx => {
        const tokens = normalizeText(tx.description);
        return tokens.includes(rule.token);
      });

      if (affectedTx.length > 0) {
        this.mlSimilarTransactions.set(affectedTx);
        const fallback = this.categories().find(c => c.id !== rule.category)?.id || 'Others';
        this.mlTargetCategory.set(fallback);
        this.showMlDialog.set(true);
      }
    }
  }

  protected async onMlConfirm(updatedTransactions: Transaction[]) {
    await this.store.applyTransactionCategories(updatedTransactions);
    this.showMlDialog.set(false);
  }

  protected onMlCancel() {
    this.showMlDialog.set(false);
  }

  protected deleteRule(token: string) {
    this.mlService.deleteRule(token);
    this.loadRules();
  }

  protected resetMlRules() {
    if (confirm(this.i18n.translate('mlResetConfirm'))) {
      this.mlService.resetUserMemory();
      this.loadRules();
    }
  }
}
