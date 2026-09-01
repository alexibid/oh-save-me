import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '@application/i18n.service';

@Pipe({
    name: 'translate',
    standalone: true,
    pure: false
})
export class AppTranslatePipe implements PipeTransform {
    private readonly i18n = inject(I18nService);

    transform(key: string, fallback?: string): string {
        if (!key) return '';

        if (typeof this.i18n?.translate === 'function') {
            return this.i18n.translate(key, fallback);
        }

        const normalizedKey = key.toLowerCase();
        const tFn = typeof this.i18n?.t === 'function' ? this.i18n.t() : undefined;
        const translations = (tFn ?? {}) as Record<string, string>;

        if (translations[key]) {
            return translations[key];
        }

        if (translations[normalizedKey]) {
            return translations[normalizedKey];
        }

        return fallback ?? key;
    }
}