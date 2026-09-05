import type { Preview } from '@storybook/angular-vite';
import { applicationConfig } from '@storybook/angular-vite';
import { setCompodocJson } from '@storybook/addon-docs/angular';
import docJson from '../documentation.json';
import { provideAppStore } from '../src/app/application/app-store.service';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { TRANSACTION_REPOSITORY_TOKEN } from '../src/app/application/tokens';
import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

import '../src/styles.scss';

setCompodocJson(docJson);

@Component({ template: '', standalone: true })
class DummyComponent {}

class MockDialogRef {
  close() {}
}

const mockTransactionRepository = {
  getAll: async () => [],
  saveAll: async () => {},
  update: async () => {},
  delete: async () => {},
  clear: async () => {},
};

const preview: Preview = {
  decorators: [
    applicationConfig({
      providers: [
        provideHttpClient(),
        provideAppStore(),
        provideRouter([{ path: '**', component: DummyComponent }]),
        provideAnimations(),
        { provide: DialogRef, useClass: MockDialogRef },
        { provide: DIALOG_DATA, useValue: {
          preview: { accountsToImport: [], transactionsToImport: [] },
          account: { id: 'mock', name: 'Mock Account' },
          categoryId: 'mock-cat',
          transaction: { id: 'mock', amount: 0, date: '2024-01-01', description: 'Mock', category: 'Home' }
        } },
        { provide: TRANSACTION_REPOSITORY_TOKEN, useValue: mockTransactionRepository }
      ],
    }),
  ],
  args: {
    transactions: [],
    categoryOptions: [],
    categories: [],
    allTransactions: [],
    previewTransactions: [],
    rawRows: [],
    mappings: [],
    stats: [],
    logs: [],
    visible: true,
    visibleTabs: ['all', 'top20', 'credit', 'debit'],
    showCategory: true,
    showActions: false,
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    value: 0,
    percentage: 50,
    color: '#3498db',
    title: 'Example Title',
    icon: 'info',
    label: 'Example Label',
    name: 'check',
    category: 'Home',
    selectedCategory: 'Home',
    categoryName: 'Home',
    categoryId: 'c_home',
    targetCategory: 'Home',
    options: [{ value: '1', label: 'Option 1' }],
    data: { series: [], categories: [] }, 
    asOfDate: '2024-01-01',
    fileName: 'example.csv',
    isConfirmReset: false,
    isConfirmResetImports: false,
    cycleStartDay: 1,
    currentLang: 'pt',
    transaction: { id: 't1', amount: 10, date: '2024-01-01', description: 'Mock', category: 'Home' },
    chartData: { series: [], categories: [] }
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
  },
};

export default preview;
