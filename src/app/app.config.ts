import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';
import { provideTransactionRepository, provideCategoryRepository, provideBudgetRepository, provideHistoryLogRepository, provideCustomizationRepository, provideAccountRepository, provideImportBatchRepository, provideMlRuleRepository, provideMappingRuleRepository, provideColumnClassifierWeightsRepository, provideUnitRepository, provideCustomRecordRepository } from './infrastructure/database.provider';
import { withComponentInputBinding } from '@angular/router';
import { provideAppStore } from './application/app-store.service';
import { provideAppI18n } from './application/i18n.service';
import { provideAppGoogleAuth } from './infrastructure/sync/google-auth.service';
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(),
    provideTransactionRepository(),
    provideCategoryRepository(),
    provideBudgetRepository(),
    provideHistoryLogRepository(),
    provideCustomizationRepository(),
    provideAccountRepository(),
    provideImportBatchRepository(),
    provideMlRuleRepository(),
    provideMappingRuleRepository(),
    provideColumnClassifierWeightsRepository(),
    provideUnitRepository(),
    provideCustomRecordRepository(),
    provideAppStore(),
    ...provideAppI18n(),
    ...provideAppGoogleAuth(),
    provideAnimationsAsync()
  ],
};
