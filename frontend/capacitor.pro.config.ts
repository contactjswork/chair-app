import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.getchair.pro',
  appName: 'CHAIR PRO',
  webDir: 'out',
  server: {
    url: 'https://getchair.app/pro',
    cleartext: false,
  },
  ios: {
    scheme: 'CHAIR PRO',
    backgroundColor: '#0a0a0a',
  },
  android: {
    backgroundColor: '#0a0a0a',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
