import { TestBed } from '@angular/core/testing';
import { AppDatePipe } from './app-date.pipe';
import { I18nService } from '@application/i18n.service';

describe('AppDatePipe', () => {
  let pipe: AppDatePipe;
  let i18nService: I18nService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        I18nService
      ]
    });
    i18nService = TestBed.inject(I18nService);
    pipe = TestBed.runInInjectionContext(() => new AppDatePipe());
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return empty string for null, undefined or empty string', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });

  it('should return the original value if it is not a valid YYYY-MM-DD string', () => {
    expect(pipe.transform('invalid-date')).toBe('invalid-date');
  });

  it('should format YYYY-MM-DD in pt language (DD/MM/YYYY)', async () => {
    await i18nService.setLanguage('pt');
    expect(pipe.transform('2026-07-30')).toBe('30/07/2026');
  });

  it('should format YYYY-MM-DD in en language (MM/DD/YYYY)', async () => {
    await i18nService.setLanguage('en');
    expect(pipe.transform('2026-07-30')).toBe('07/30/2026');
  });
});
