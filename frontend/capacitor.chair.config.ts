import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.getchair.client',
  appName: 'CHAIR',
  webDir: 'out',
  server: {
    url: 'https://getchair.app/app',
    cleartext: false,
  },
  ios: {
    scheme: 'CHAIR',
    backgroundColor: '#ffffff',
  },
  android: {
    backgroundColor: '#ffffff',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0, // on gère le splash nous-mêmes dans l'app
    },
  },
};

export default config;
