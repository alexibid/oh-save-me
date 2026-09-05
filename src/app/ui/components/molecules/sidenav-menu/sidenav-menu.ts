import { Component, computed, inject, input, output, signal, ViewEncapsulation } from '@angular/core';

import { RouterModule } from '@angular/router';
import { CategoryInfo } from '@domain/models/category';
import { useStore } from '@application/app-store';
import { I18nService, I18N_SHARED } from '@ui/shared/i18n-shared';
import { formatDateDisplay } from '@ibid/utils';
import {
  MAIN_MENU_ITEMS,
  FOOTER_MENU_ITEMS,
  NavigationExpandable,
  NavigationLink
} from '../../../../application/config/navigation.config';
import packageJson from '../../../../../../package.json';
import { DateInputComponent, DateRangeValue, IconButtonComponent, IconComponent, NumberInputComponent, SelectComponent } from 'ibid-ui';

@Component({
  encapsulation: ViewEncapsulation.None,
  selector: 'ohsaveme-sidenav-menu',
  standalone: true,
  imports: [
    RouterModule,
    IconComponent,
    IconButtonComponent,
    I18N_SHARED,
    NumberInputComponent,
    SelectComponent,
    DateInputComponent
],
  templateUrl: './sidenav-menu.html',
  styleUrl: './sidenav-menu.scss'
})
export class SidenavMenuComponent {
  readonly categories = input<readonly CategoryInfo[]>([]);
  readonly closeClicked = output<void>();

  protected readonly mainMenuItems = MAIN_MENU_ITEMS;
  protected readonly footerMenuItems = FOOTER_MENU_ITEMS;
  protected readonly appVersion = packageJson.version;

  protected readonly i18n = inject(I18nService);
  protected readonly store = useStore();

  protected readonly presetOptions = computed(() => [
    { value: 'last_month', label: this.i18n.translate('lastMonth') },
    { value: 'current_month', label: this.i18n.translate('currentMonth') },
    { value: 'quarter', label: this.i18n.translate('quarter') },
    { value: 'semester', label: this.i18n.translate('semester') },
    { value: 'year', label: this.i18n.translate('yearPreset') },
    { value: 'custom', label: this.i18n.translate('periodCustom') }
  ]);

  protected readonly formattedDateRange = computed(() => {
    const start = this.store.startDate();
    const end = this.store.endDate();
    if (!start || !end) return '';
    return `${formatDateDisplay(start)} – ${formatDateDisplay(end)}`;
  });

  protected onPresetChange(value: string): void {
    this.store.applyPreset(value);
  }

  private readonly expansionState: Record<string, ReturnType<typeof signal<boolean>>> = {
    isCategoriesExpanded: signal<boolean>(false),
    isSettingsExpanded: signal<boolean>(false)
  };

  protected isExpanded(key: string): boolean {
    return this.expansionState[key]?.() ?? false;
  }

  protected toggleExpandable(key: string): void {
    if (this.expansionState[key]) {
      this.expansionState[key].update(v => !v);
    }
  }

  protected getChildren(item: NavigationExpandable): NavigationLink[] {
    if (typeof item.children === 'function') {
      return item.children(this.categories());
    }
    return item.children ?? [];
  }

  protected readonly languageOptions = computed(() => [
    { value: 'pt', label: 'Português (PT)' },
    { value: 'en', label: 'English (EN)' }
  ]);

  protected onLanguageChange(lang: string): void {
    if (lang === 'pt' || lang === 'en') {
      this.i18n.setLanguage(lang);
    }
  }

  toggleLanguage(): void {
    this.i18n.toggleLanguage();
  }

  onCycleStartDayChange(day: number): void {
    this.store.setCycleStartDay(day);
  }

  onResetImports(): void {
    this.store.resetImports();
  }

  onRangeChange(range: DateRangeValue): void {
    this.store.startDate.set(range.start);
    this.store.endDate.set(range.end);
    this.store.preset.set('custom');
  }

  onAddClick(): void {
    this.closeClicked.emit();
    this.store.triggerAddClick();
  }

  onLinkClick(): void {
    this.closeClicked.emit();
  }
}
