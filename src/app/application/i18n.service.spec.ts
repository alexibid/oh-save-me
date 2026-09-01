import { describe, it, expect, beforeEach } from 'vitest';
import { I18nService } from './i18n.service';

describe('I18nService', () => {
  let service: I18nService;

  beforeEach(() => {
    localStorage.clear();
    service = new I18nService();
  });

  it('should initialize with default language pt', () => {
    expect(service.currentLang()).toBe('pt');
  });

  it('should toggle language between pt and en', async () => {
    service.toggleLanguage();
    expect(service.currentLang()).toBe('en');

    service.toggleLanguage();
    expect(service.currentLang()).toBe('pt');
  });

  it('should format currency correctly in pt and en', async () => {
    await service.setLanguage('pt');
    expect(service.formatCurrency(1234.56)).toMatch(/1[.]?234,56\s*€/);
    expect(service.formatCurrency(-50.5)).toMatch(/-50,50\s*€/);

    await service.setLanguage('en');
    expect(service.formatCurrency(1234.56)).toMatch(/€1,234\.56/);
    expect(service.formatCurrency(-50.5)).toMatch(/-€50\.50/);
  });

  it('should format dates according to selected language', async () => {
    await service.setLanguage('pt');
    expect(service.formatDate('2026-08-05')).toBe('05/08/2026');

    await service.setLanguage('en');
    expect(service.formatDate('2026-08-05')).toBe('08/05/2026');
  });
});
