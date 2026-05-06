import type { CapacitorConfig } from '@capacitor/cli';

const nativeUrl = process.env.NATIVE_APP_URL || process.env.PUBLIC_BASE_URL || '';

const config: CapacitorConfig = {
  appId: 'com.mrflen.stocklens',
  appName: 'Mr.FLEN Stock-LENS',
  webDir: 'public'
};

if (nativeUrl) {
  config.server = {
    url: nativeUrl,
    cleartext: nativeUrl.startsWith('http://')
  };
}

export default config;
