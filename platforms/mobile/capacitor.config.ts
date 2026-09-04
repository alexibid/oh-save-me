import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ohsaveme.app',
  appName: 'Oh Save Me!',
  webDir: '../../../../dist/oh-save-me/browser',
  server: {
    androidScheme: 'https',
    hostname: 'localhost'
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email', 'https://www.googleapis.com/auth/drive.file'],
      serverClientId: '42192423778-29084n6ihepqgvmedmmagrt2p0vlu9uh.apps.googleusercontent.com',
      androidClientId: '42192423778-smp11k6p7trlmv6sgfhjsvv3p3o5jul5.apps.googleusercontent.com',
      forceCodeForRefreshToken: false
    }
  }
};

export default config;
