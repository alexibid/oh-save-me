import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '@application/i18n.service';

@Pipe({
  name: 'appCurrency',
  standalone: true,
  pure: false
})
export class AppCurrencyPipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) return '';
    return this.i18n.formatCurrency(value);
  }
}
