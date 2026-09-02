import { CapacitorConfig } from '@capacitor/cli';

// CHAIR BUSINESS — le 3e binaire (décision Julien 02/09/2026) : l'app des
// GÉRANTS de salon. Tout ce qui ne touche pas au métier de coiffeur vit ici :
// salon, équipe, location de fauteuil (côté annonce), recrutement, abonnement
// CHAIR BUSINESS. Un gérant qui coiffe aussi utilise LES DEUX apps (BUSINESS
// pour le salon, PRO pour son activité de coiffeur).
const config: CapacitorConfig = {
  appId: 'app.getchair.business',
  appName: 'CHAIR BUSINESS',
  webDir: 'out',
  server: {
    // www, pas apex : getchair.app redirige (308) vers www.getchair.app,
    // et cette redirection change de host → Capacitor la traite comme une
    // navigation externe et éjecte l'app entière vers Safari 2s après le
    // lancement. Pointer directement sur la cible finale évite la redirection.
    url: 'https://www.getchair.app/business',
    cleartext: false,
    // Filet de sécurité : si un lien pointe un jour vers l'apex (getchair.app,
    // qui redirige vers www), ça reste dans l'app au lieu de rebasculer sur Safari.
    allowNavigation: ['getchair.app', 'www.getchair.app'],
    // Même page d'erreur hors-ligne que les deux autres binaires.
    errorPath: 'error.html',
  },
  ios: {
    scheme: 'CHAIR BUSINESS',
    backgroundColor: '#0a0a0a',
    allowsLinkPreview: false,
    webContentsDebuggingEnabled: false,
    // Marqueur d'identité du binaire — même mécanique que CHAIRClient /
    // CHAIRPro (les trois binaires chargent le même site, seul le User-Agent
    // les distingue au runtime). Lu par lib/appContext.ts (BUSINESS_UA_MARKER).
    appendUserAgent: 'CHAIRBusiness/1',
  },
  android: {
    backgroundColor: '#0a0a0a',
    appendUserAgent: 'CHAIRBusiness/1',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge'],
    },
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
