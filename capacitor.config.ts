import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.timelog.app',
  appName: 'Time Log',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '334822322788-b71eu9kp0psptr5m4nnpt15rp436epa9.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  }
};

export default config;

