import { Injectable, Provider, computed, signal } from '@angular/core';
import { GoogleAuthService as IbidGoogleAuthService } from '@ibid/services';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { environment } from '../../../environments/environment';

export type GoogleAuthStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface GoogleTokenResponse {
  readonly access_token?: string;
  readonly expires_in?: number;
  readonly error?: string;
}

declare global {
  interface Window {
    readonly google?: {
      readonly accounts: {
        readonly oauth2: {
          initTokenClient(config: {
            readonly client_id: string;
            readonly scope: string;
            readonly callback: (response: GoogleTokenResponse) => void;
          }): {
            requestAccessToken(overrideConfig?: { readonly prompt?: string }): void;
          };
        };
      };
    };
  }
}

@Injectable({
  providedIn: 'root'
})
export class GoogleAuthService {
  private readonly CLIENT_ID_KEY = 'savvy_google_client_id';
  private readonly ACCESS_TOKEN_KEY = 'savvy_google_access_token';
  private readonly TOKEN_EXPIRES_KEY = 'savvy_google_token_expires';
  private readonly DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

  public readonly status = signal<GoogleAuthStatus>('disconnected');
  public readonly accessToken = signal<string | null>(null);
  public readonly tokenExpiresAt = signal<number | null>(null);
  public readonly clientId = signal<string>(environment.googleClientId ?? '');
  public readonly userEmail = signal<string | null>(null);
  public readonly errorMessage = signal<string | null>(null);
  protected googleAuthPlugin = GoogleAuth;

  public readonly isAuthenticated = computed(() => {
    const token = this.accessToken();
    const expiresAt = this.tokenExpiresAt();
    if (!token || !expiresAt) return false;
    return Date.now() < expiresAt;
  });

  private tokenClient: { requestAccessToken(overrideConfig?: { readonly prompt?: string }): void } | null = null;

  constructor() {
    this.checkRedirectCallback();
    this.restoreSession();

    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', () => this.checkRedirectCallback());
    }
  }

  private isNativePlatform(): boolean {
    if (typeof window === 'undefined') return false;
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    return !!cap?.isNativePlatform?.();
  }

  private checkRedirectCallback(): void {
    if (typeof window === 'undefined') return;
    const hashOrSearch = window.location.hash || window.location.search;
    if (!hashOrSearch) return;

    const queryStr = hashOrSearch.startsWith('#') || hashOrSearch.startsWith('?')
      ? hashOrSearch.substring(1)
      : hashOrSearch;
    const params = new URLSearchParams(queryStr);
    const accessToken = params.get('access_token');
    const expiresIn = params.get('expires_in');
    const error = params.get('error');

    if (accessToken) {
      this.handleTokenResponse({
        access_token: accessToken,
        expires_in: expiresIn ? parseInt(expiresIn, 10) : 3600
      });
      window.history.replaceState(null, '', window.location.pathname);
    } else if (error) {
      this.handleTokenResponse({ error });
      window.history.replaceState(null, '', window.location.pathname);
    }
  }

  private restoreSession(): void {
    if (typeof window === 'undefined') return;

    const savedClientId = localStorage.getItem(this.CLIENT_ID_KEY);
    if (savedClientId) {
      this.clientId.set(savedClientId);
    } else if (environment.googleClientId) {
      this.clientId.set(environment.googleClientId);
    }

    const savedToken = sessionStorage.getItem(this.ACCESS_TOKEN_KEY);
    const savedExpires = sessionStorage.getItem(this.TOKEN_EXPIRES_KEY);
    if (savedToken && savedExpires) {
      const expiresTimestamp = parseInt(savedExpires, 10);
      if (Date.now() < expiresTimestamp) {
        this.accessToken.set(savedToken);
        this.tokenExpiresAt.set(expiresTimestamp);
        this.status.set('connected');
      }
    }
  }

  public setClientId(id: string): void {
    this.clientId.set(id.trim());
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.CLIENT_ID_KEY, id.trim());
    }
    this.tokenClient = null;
  }

  public handleTokenResponse(response: GoogleTokenResponse): void {
    if (response.error || !response.access_token) {
      this.status.set('error');
      this.errorMessage.set(response.error ?? 'Unknown OAuth error');
      return;
    }

    const expiresInSec = response.expires_in ?? 3600;
    const expiresTimestamp = Date.now() + expiresInSec * 1000;

    this.accessToken.set(response.access_token);
    this.tokenExpiresAt.set(expiresTimestamp);
    this.status.set('connected');
    this.errorMessage.set(null);

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(this.ACCESS_TOKEN_KEY, response.access_token);
      sessionStorage.setItem(this.TOKEN_EXPIRES_KEY, expiresTimestamp.toString());
    }
  }

  public async login(): Promise<boolean> {
    const currentClientId = this.clientId();
    if (!currentClientId || currentClientId.includes('YOUR_GOOGLE_CLIENT_ID')) {
      this.status.set('error');
      this.errorMessage.set(
        'Google OAuth Client ID is not configured. Please define googleClientId in environment.ts'
      );
      return false;
    }

    if (typeof window === 'undefined') return false;

    if (this.isNativePlatform()) {
      try {
        this.status.set('connecting');
        await this.googleAuthPlugin.initialize({
          clientId: currentClientId,
          scopes: ['profile', 'email', this.DRIVE_SCOPE],
          grantOfflineAccess: false
        });
        const googleUser = await this.googleAuthPlugin.signIn();
        if (googleUser?.authentication?.accessToken) {
          if (googleUser.email) {
            this.userEmail.set(googleUser.email);
          }
          this.handleTokenResponse({
            access_token: googleUser.authentication.accessToken,
            expires_in: 3600
          });
          return true;
        }
        this.status.set('disconnected');
        return false;
      } catch (err: unknown) {
        const message = err instanceof Error
          ? err.message
          : (typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Google Sign-In failed');
        if (message.toLowerCase().includes('cancel') || message.includes('12501')) {
          this.status.set('disconnected');
          this.errorMessage.set(null);
        } else {
          this.status.set('error');
          this.errorMessage.set(message);
        }
        return false;
      }
    }

    await this.ensureGsiLoaded();

    if (!window.google?.accounts?.oauth2) {
      this.status.set('error');
      this.errorMessage.set('Google Identity Services SDK failed to load.');
      return false;
    }

    this.status.set('connecting');

    if (!this.tokenClient) {
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: currentClientId,
        scope: this.DRIVE_SCOPE,
        callback: (resp: GoogleTokenResponse) => this.handleTokenResponse(resp)
      });
    }

    this.tokenClient.requestAccessToken({ prompt: '' });
    return true;
  }

  public logout(): void {
    if (this.isNativePlatform()) {
      try {
        this.googleAuthPlugin.signOut();
      } catch {

      }
    }

    this.accessToken.set(null);
    this.tokenExpiresAt.set(null);
    this.userEmail.set(null);
    this.status.set('disconnected');
    this.errorMessage.set(null);

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(this.ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(this.TOKEN_EXPIRES_KEY);
    }
  }

  private async ensureGsiLoaded(): Promise<void> {
    if (typeof window === 'undefined' || window.google?.accounts?.oauth2) return;

    return new Promise((resolve) => {
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }
}

export function provideAppGoogleAuth(): Provider[] {
  return [{ provide: IbidGoogleAuthService, useExisting: GoogleAuthService }];
}
