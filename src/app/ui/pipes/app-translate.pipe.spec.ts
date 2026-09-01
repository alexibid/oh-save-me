import { TestBed } from '@angular/core/testing';
import { AppTranslatePipe } from './app-translate.pipe';
import { I18nService } from '@application/i18n.service';

import { vi, afterEach } from 'vitest';

describe('AppTranslatePipe', () => {
    let pipe: AppTranslatePipe;
    let i18nService: I18nService;
    let store: Record<string, string> = {};

    beforeEach(() => {
        store = {};
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => store[key] || null);
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
            store[key] = value;
        });
        vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => {
            delete store[key];
        });
        vi.spyOn(Storage.prototype, 'clear').mockImplementation(() => {
            store = {};
        });

        TestBed.configureTestingModule({
            providers: [I18nService]
        });
        i18nService = TestBed.inject(I18nService);
        pipe = TestBed.runInInjectionContext(() => new AppTranslatePipe());
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should create an instance', () => {
        expect(pipe).toBeTruthy();
    });

    it('should return empty string for empty key', () => {
        expect(pipe.transform('')).toBe('');
    });

    it('should translate key if exists', () => {
        i18nService.setLanguage('pt');
        expect(pipe.transform('title')).toBe('Finanças Familiares');
    });

    it('should return fallback if key does not exist', () => {
        expect(pipe.transform('non_existing_key', 'Fallback Text')).toBe('Fallback Text');
    });

    it('should return key if fallback is not provided and key does not exist', () => {
        expect(pipe.transform('non_existing_key')).toBe('non_existing_key');
    });
});