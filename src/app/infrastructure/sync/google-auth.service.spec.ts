import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { GoogleAuthService } from './google-auth.service';

describe('GoogleAuthService', () => {
  let service: GoogleAuthService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    delete (window as unknown as { Capacitor?: unknown }).Capacitor;
    service = new GoogleAuthService();
  });

  afterEach(() => {
    delete (window as unknown as { Capacitor?: unknown }).Capacitor;
    vi.restoreAllMocks();
  });

  it('should initialize with disconnected state by default', () => {
    expect(service.status()).toBe('disconnected');
    expect(service.accessToken()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should restore client ID from localStorage if present', () => {
    localStorage.setItem('savvy_google_client_id', 'test-client-id.apps.googleusercontent.com');
    const newService = new GoogleAuthService();
    expect(newService.clientId()).toBe('test-client-id.apps.googleusercontent.com');
  });

  it('should update client ID and persist to localStorage', () => {
    service.setClientId('new-client-id.apps.googleusercontent.com');
    expect(service.clientId()).toBe('new-client-id.apps.googleusercontent.com');
    expect(localStorage.getItem('savvy_google_client_id')).toBe('new-client-id.apps.googleusercontent.com');
  });

  it('should handle token receipt and update authentication status', () => {
    const fakeToken = 'ya29.test-token';
    service.handleTokenResponse({
      access_token: fakeToken,
      expires_in: 3600
    });

    expect(service.accessToken()).toBe(fakeToken);
    expect(service.status()).toBe('connected');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('should clear token and reset state on logout', () => {
    service.handleTokenResponse({
      access_token: 'ya29.test-token',
      expires_in: 3600
    });
    expect(service.isAuthenticated()).toBe(true);

    service.logout();
    expect(service.accessToken()).toBeNull();
    expect(service.status()).toBe('disconnected');
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should report isAuthenticated as false when token is expired', () => {
    service.handleTokenResponse({
      access_token: 'ya29.test-token',
      expires_in: -10
    });

    expect(service.isAuthenticated()).toBe(false);
  });

  it('should parse access token from URL hash on initialization', () => {
    window.location.hash = '#access_token=ya29.hash-token&expires_in=3600';
    const hashService = new GoogleAuthService();

    expect(hashService.accessToken()).toBe('ya29.hash-token');
    expect(hashService.status()).toBe('connected');
    expect(hashService.isAuthenticated()).toBe(true);
    window.location.hash = '';
  });

  it('should call native GoogleAuth.signIn when running on native Capacitor platform', async () => {
    (window as unknown as { Capacitor: { isNativePlatform: () => boolean } }).Capacitor = {
      isNativePlatform: () => true
    };
    service.setClientId('42192423778-test.apps.googleusercontent.com');

    (service as unknown as { googleAuthPlugin: typeof GoogleAuth }).googleAuthPlugin = {
      initialize: vi.fn().mockResolvedValue(undefined),
      signIn: vi.fn().mockResolvedValue({
        id: 'user-123',
        name: 'Alexandre Santos',
        familyName: 'Santos',
        givenName: 'Alexandre',
        imageUrl: '',
        serverAuthCode: '',
        email: 'alexandre.teste@gmail.com',
        authentication: {
          accessToken: 'ya29.native-token',
          idToken: 'id-token-123'
        }
      }),
      signOut: vi.fn().mockResolvedValue(undefined),
      refresh: vi.fn()
    } as unknown as typeof GoogleAuth;

    const result = await service.login();
    expect(result).toBe(true);
    expect(service.status()).toBe('connected');
    expect(service.accessToken()).toBe('ya29.native-token');
    expect(service.userEmail()).toBe('alexandre.teste@gmail.com');
  });

  it('should handle cancellation gracefully on native Capacitor platform', async () => {
    (window as unknown as { Capacitor: { isNativePlatform: () => boolean } }).Capacitor = {
      isNativePlatform: () => true
    };
    service.setClientId('42192423778-test.apps.googleusercontent.com');

    (service as unknown as { googleAuthPlugin: typeof GoogleAuth }).googleAuthPlugin = {
      initialize: vi.fn().mockResolvedValue(undefined),
      signIn: vi.fn().mockRejectedValue(new Error('the user canceled the sign in flow')),
      signOut: vi.fn().mockResolvedValue(undefined),
      refresh: vi.fn()
    } as unknown as typeof GoogleAuth;

    const result = await service.login();
    expect(result).toBe(false);
    expect(service.status()).toBe('disconnected');
    expect(service.errorMessage()).toBeNull();
  });
});
