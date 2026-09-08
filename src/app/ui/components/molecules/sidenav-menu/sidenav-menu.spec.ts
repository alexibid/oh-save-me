import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SidenavMenuComponent } from './sidenav-menu';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { APP_STORE_TOKEN } from '@application/app-store';
import { I18nService } from '@application/i18n.service';

describe('SidenavMenuComponent', () => {
  let component: SidenavMenuComponent;
  let fixture: ComponentFixture<SidenavMenuComponent>;

  const mockStore = {
    cycleStartDay: () => 1,
    setCycleStartDay: vi.fn(),
    resetImports: vi.fn(),
    preset: () => 'current_month',
    startDate: () => '2026-07-28',
    endDate: () => '2026-08-28',
    minAvailableDate: () => '',
    maxAvailableDate: () => '',
    applyPreset: vi.fn()
  };

  const mockI18nService = {
    currentLang: () => 'pt',
    setLanguage: vi.fn(),
    translate: (key: string) => key,
    t: () => ({
      settingsTitle: 'Settings',
      languageLabel: 'Idioma',
      startDayLabel: 'Start Day',
      resetBtn: 'Clear Imports'
    })
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SidenavMenuComponent,
        BrowserAnimationsModule
      ],
      providers: [
        provideRouter([]),
        { provide: APP_STORE_TOKEN, useValue: mockStore },
        { provide: I18nService, useValue: mockI18nService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SidenavMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle isSettingsExpanded state correctly', () => {
    expect(component['isExpanded']('isSettingsExpanded')).toBe(false);

    component['toggleExpandable']('isSettingsExpanded');
    expect(component['isExpanded']('isSettingsExpanded')).toBe(true);

    component['toggleExpandable']('isSettingsExpanded');
    expect(component['isExpanded']('isSettingsExpanded')).toBe(false);
  });

  it('should toggle isCategoriesExpanded state correctly', () => {
    expect(component['isExpanded']('isCategoriesExpanded')).toBe(false);

    component['toggleExpandable']('isCategoriesExpanded');
    expect(component['isExpanded']('isCategoriesExpanded')).toBe(true);

    component['toggleExpandable']('isCategoriesExpanded');
    expect(component['isExpanded']('isCategoriesExpanded')).toBe(false);
  });

  it('should delegate resetImports and setCycleStartDay to store', () => {
    component.onResetImports();
    expect(mockStore.resetImports).toHaveBeenCalled();

    component.onCycleStartDayChange(5);
    expect(mockStore.setCycleStartDay).toHaveBeenCalledWith(5);
  });

  it('should delegate language change to i18nService', () => {
    component['onLanguageChange']('en');
    expect(mockI18nService.setLanguage).toHaveBeenCalledWith('en');
  });

  it('should emit closeClicked when a navigation link is clicked', () => {
    const emitSpy = vi.fn();
    component.closeClicked.subscribe(emitSpy);
    component.onLinkClick();
    expect(emitSpy).toHaveBeenCalled();
  });
});
