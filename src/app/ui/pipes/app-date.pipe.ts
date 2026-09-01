import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '@application/i18n.service';

@Pipe({
  name: 'appDate',
  standalone: true,
  pure: false
})
export class AppDatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(value: string | null | undefined): string {
    if (!value) return '';
    return this.i18n.formatDate(value);
  }
}
