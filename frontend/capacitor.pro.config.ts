import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.getchair.pro',
  appName: 'CHAIR PRO',
  webDir: 'out',
  server: {
    // www, pas apex : getchair.app redirige (308) vers www.getchair.app,
    // et cette redirection change de host → Capacitor la traite comme une
    // navigation externe et éjecte l'app entière vers Safari 2s après le
    // lancement. Pointer directement sur la cible finale évite la redirection.
    url: 'https://www.getchair.app/pro',
    cleartext: false,
    // Filet de sécurité : si un lien pointe un jour vers l'apex (getchair.app,
    // qui redirige vers www), ça reste dans l'app au lieu de rebasculer sur Safari.
    allowNavigation: ['getchair.app', 'www.getchair.app'],
  },
  ios: {
    scheme: 'CHAIR PRO',
    backgroundColor: '#0a0a0a',
    allowsLinkPreview: false,
    webContentsDebuggingEnabled: false,
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
