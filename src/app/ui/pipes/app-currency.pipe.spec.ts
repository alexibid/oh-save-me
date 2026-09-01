import { TestBed } from '@angular/core/testing';
import { AppCurrencyPipe } from './app-currency.pipe';
import { I18nService } from '@application/i18n.service';

describe('AppCurrencyPipe', () => {
  let pipe: AppCurrencyPipe;
  let i18nService: I18nService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        I18nService
      ]
    });
    i18nService = TestBed.inject(I18nService);
    pipe = TestBed.runInInjectionContext(() => new AppCurrencyPipe());
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return empty string for null or undefined values', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });

  it('should format positive value in pt language', async () => {
    await i18nService.setLanguage('pt');
    const result = pipe.transform(1234.56);

    expect(result).toMatch(/1[.]?234,56\s*€/);
  });

  it('should format negative value in pt language', async () => {
    await i18nService.setLanguage('pt');
    const result = pipe.transform(-50.5);
    expect(result).toMatch(/-50,50\s*€/);
  });

  it('should format positive value in en language', async () => {
    await i18nService.setLanguage('en');
    const result = pipe.transform(1234.56);

    expect(result).toMatch(/€\s*1[,]?234\.56/);
  });
});
