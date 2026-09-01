import { AppTranslatePipe } from '@ui/pipes/app-translate.pipe';
import { AppDatePipe } from '@ui/pipes/app-date.pipe';
import { AppCurrencyPipe } from '@ui/pipes/app-currency.pipe';
import { I18nService, translate } from '@application/i18n.service';

export const I18N_SHARED = [
  AppTranslatePipe,
  AppDatePipe,
  AppCurrencyPipe
] as const;

export { AppTranslatePipe, AppDatePipe, AppCurrencyPipe, I18nService, translate };