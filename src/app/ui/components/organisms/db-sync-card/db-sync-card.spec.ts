import { TestBed, ComponentFixture } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DbSyncCardComponent } from './db-sync-card';
import { I18nService } from '@application/i18n.service';
import { GoogleAuthService } from '@infrastructure/sync/google-auth.service';
import { GoogleDriveSyncService, GoogleAuthService as IbidGoogleAuthService } from '@ibid/services';
import { DriveSyncCoordinatorService } from '@application/services/drive-sync-coordinator.service';
import { createMockI18nService } from '../../../../../mocks/services.mock';

describe('DbSyncCardComponent', () => {
  let component: DbSyncCardComponent;
  let fixture: ComponentFixture<DbSyncCardComponent>;
  let authService: GoogleAuthService;
  let driveSyncService: GoogleDriveSyncService;
  let coordinator: DriveSyncCoordinatorService;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();

    authService = new GoogleAuthService();

    await TestBed.configureTestingModule({
      imports: [DbSyncCardComponent],
      providers: [
        { provide: I18nService, useValue: createMockI18nService() },
        { provide: GoogleAuthService, useValue: authService },
        { provide: IbidGoogleAuthService, useValue: authService },
        {
          provide: DriveSyncCoordinatorService,
          useValue: {
            syncNow: vi.fn().mockResolvedValue(true)
          }
        }
      ]
    }).compileComponents();

    driveSyncService = TestBed.inject(GoogleDriveSyncService);
    coordinator = TestBed.inject(DriveSyncCoordinatorService);
    fixture = TestBed.createComponent(DbSyncCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should render disconnected state by default', () => {
    expect(component.isConnected()).toBe(false);
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.o-db-sync-card__disconnected-section')).toBeTruthy();
    expect(element.querySelector('.o-db-sync-card__google-btn')).toBeTruthy();
  });

  it('should render connected state when authenticated', () => {
    authService.accessToken.set('valid-token');
    authService.tokenExpiresAt.set(Date.now() + 3600000);
    authService.status.set('connected');
    fixture.detectChanges();

    expect(component.isConnected()).toBe(true);
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.o-db-sync-card__connected-section')).toBeTruthy();
  });

  it('should trigger syncNow on coordinator when sync button is clicked', async () => {
    authService.accessToken.set('valid-token');
    authService.tokenExpiresAt.set(Date.now() + 3600000);
    authService.status.set('connected');
    fixture.detectChanges();

    const syncSpy = vi.spyOn(coordinator, 'syncNow');
    await component.onSyncNow();
    expect(syncSpy).toHaveBeenCalled();
  });

  it('should logout on disconnect', () => {
    authService.accessToken.set('valid-token');
    authService.tokenExpiresAt.set(Date.now() + 3600000);
    authService.status.set('connected');
    fixture.detectChanges();

    component.onDisconnect();
    expect(authService.isAuthenticated()).toBe(false);
    expect(driveSyncService.syncStatus()).toBe('disconnected');
  });

  it('should trigger auth.login on connect click', async () => {
    const loginSpy = vi.spyOn(authService, 'login').mockResolvedValue(true);
    await component.onConnect();
    expect(loginSpy).toHaveBeenCalled();
  });
});
