import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mrflen.stocklens',
  appName: 'Mr.FLEN Stock-LENS',
  webDir: 'public',
  server: {
    url: process.env.NATIVE_APP_URL || 'http://localhost:8787',
    cleartext: true
  }
};

export default config;
