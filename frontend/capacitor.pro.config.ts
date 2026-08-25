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
    // Même page d'erreur hors-ligne que le binaire client (le fichier détecte
    // le marqueur UA CHAIRPro pour passer en thème sombre + vouvoiement et
    // réessayer vers /pro). Voir le commentaire dans capacitor.chair.config.ts.
    errorPath: 'error.html',
  },
  ios: {
    scheme: 'CHAIR PRO',
    backgroundColor: '#0a0a0a',
    allowsLinkPreview: false,
    webContentsDebuggingEnabled: false,
    // Pendant exact du marqueur CLIENT (voir capacitor.chair.config.ts) :
    // les deux binaires chargent le même site, seul le User-Agent les
    // distingue au runtime. Lu par lib/appContext.ts (PRO_UA_MARKER).
    appendUserAgent: 'CHAIRPro/1',
  },
  android: {
    backgroundColor: '#0a0a0a',
    // Même marqueur côté Android — voir le commentaire ios.appendUserAgent.
    appendUserAgent: 'CHAIRPro/1',
  },
  plugins: {
    // Présentation d'une push quand l'app est AU PREMIER PLAN (iOS).
    // Même choix que capacitor.chair.config.ts : ['badge'] seul, le toast
    // interne (lib/push.ts) gère l'affichage au premier plan.
    PushNotifications: {
      presentationOptions: ['badge'],
    },
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
