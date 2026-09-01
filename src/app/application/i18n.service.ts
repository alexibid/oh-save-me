import { Injectable, Provider, signal, computed, inject } from '@angular/core';
import { I18nService as IbidI18nService } from '@ibid/services';
import { CUSTOMIZATION_REPOSITORY_TOKEN } from './tokens';
import { TRANSLATIONS } from './translations/translations';
import { CustomizationRepository } from '@domain/repositories/customization.repository';
import { Customization } from '@domain/models/customization';

export type Language = 'en' | 'pt';

const LOCALE_BY_LANGUAGE: Record<Language, string> = { pt: 'pt-PT', en: 'en-US' };

const DEFAULT_CURRENCY = 'EUR';

const CURRENCY_BY_REGION: Record<string, string> = {
  PT: 'EUR', ES: 'EUR', FR: 'EUR', DE: 'EUR', IT: 'EUR', IE: 'EUR', NL: 'EUR',
  US: 'USD', GB: 'GBP', BR: 'BRL', CH: 'CHF', CA: 'CAD', AU: 'AUD'
};

export function currencyForLocale(locale: string | undefined): string {
  if (!locale) return DEFAULT_CURRENCY;
  const region = locale.split('-')[1]?.toUpperCase();
  return region ? CURRENCY_BY_REGION[region] ?? DEFAULT_CURRENCY : DEFAULT_CURRENCY;
}

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private readonly customizationRepository?: CustomizationRepository;
  private readonly currentLanguage = signal<Language>('pt');
  private readonly currentCurrency = signal<string>(DEFAULT_CURRENCY);

  readonly currentLang = this.currentLanguage.asReadonly();
  readonly currency = this.currentCurrency.asReadonly();

  readonly locale = computed<string>(() => LOCALE_BY_LANGUAGE[this.currentLanguage()]);

  readonly currencySymbol = computed<string>(() => {
    const parts = new Intl.NumberFormat(this.locale(), {
      style: 'currency',
      currency: this.currentCurrency()
    }).formatToParts(0);
    return parts.find(part => part.type === 'currency')?.value ?? this.currentCurrency();
  });

  readonly translations = computed(() => TRANSLATIONS[this.currentLanguage()]);

  readonly t = this.translations;

  constructor() {
    try {
      this.customizationRepository = inject(CUSTOMIZATION_REPOSITORY_TOKEN, { optional: true }) ?? undefined;
    } catch {
      this.customizationRepository = undefined;
    }
    const savedCurrency = localStorage.getItem('app_currency');
    if (savedCurrency) this.currentCurrency.set(savedCurrency);

    const saved = localStorage.getItem('app_lang');
    if (saved === 'en' || saved === 'pt') {
      this.currentLanguage.set(saved);
    }
    this.loadLangFromDb();
  }

  translate(key: string, fallback?: string): string {
    if (!key) return fallback ?? '';
    const table = this.translations() as unknown as Record<string, string>;
    if (table[key]) return table[key];
    const lower = key.toLowerCase();
    if (table[lower]) return table[lower];
    return fallback ?? key;
  }

  private async loadLangFromDb() {
    if (this.customizationRepository) {
      try {
        const list = await this.customizationRepository.getAll();
        const lang = list.find((c: Customization) => c.key === 'app_lang')?.value;
        if (lang === 'en' || lang === 'pt') {
          this.currentLanguage.set(lang);
        }
      } catch {}
    }
  }

  async setLanguage(lang: Language) {
    this.currentLanguage.set(lang);
    localStorage.setItem('app_lang', lang);
    if (this.customizationRepository) {
      try {
        await this.customizationRepository.save({ key: 'app_lang', value: lang });
      } catch {}
    }
  }

  toggleLanguage() {
    this.setLanguage(this.currentLanguage() === 'pt' ? 'en' : 'pt');
  }

  getCategoryName(id: string): string {
    if (!id) return '';
    const key = id.toLowerCase();
    const translations = this.t() as unknown as Record<string, string>;
    if (translations[key]) {
      return translations[key];
    }
    return id
      .split(/[-_]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;

    if (this.currentLanguage() === 'pt') {
      return `${day}/${month}/${year}`;
    }
    return `${month}/${day}/${year}`;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat(this.locale(), {
      style: 'currency',
      currency: this.currentCurrency(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value).replace(/[\u00a0\u202f]/g, ' ');
  }

  setCurrency(code: string): void {
    this.currentCurrency.set(code);
    localStorage.setItem('app_currency', code);
  }
}

export function translate(
  keyOrService: string | unknown,
  keyOrFallback?: string,
  fallback?: string
): string {
  if (!keyOrService) return keyOrFallback ?? fallback ?? '';

  if (typeof keyOrService === 'object') {
    const service = keyOrService as Record<string, unknown>;
    const key = keyOrFallback ?? '';
    if (typeof service['translate'] === 'function') {
      return (service['translate'] as (k: string, fb?: string) => string)(key, fallback);
    }
    if (typeof service['t'] === 'function') {
      const tVal = (service['t'] as () => unknown)();
      const table = (tVal ?? {}) as Record<string, string>;
      if (table[key]) return table[key];
      const lower = key.toLowerCase();
      if (table[lower]) return table[lower];
    }
    return fallback ?? key;
  }

  const key = keyOrService as string;
  const fb = keyOrFallback;
  try {
    const service = inject(I18nService, { optional: true });
    if (service) {
      return service.translate(key, fb);
    }
  } catch {}
  return fb ?? key;
}
export function provideAppI18n(): Provider[] {
  return [{ provide: IbidI18nService, useExisting: I18nService }];
}
