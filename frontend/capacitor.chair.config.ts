import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.getchair.client',
  appName: 'CHAIR',
  webDir: 'out',
  server: {
    // www, pas apex : getchair.app redirige (308) vers www.getchair.app,
    // et cette redirection change de host → Capacitor la traite comme une
    // navigation externe et éjecte l'app entière vers Safari 2s après le
    // lancement. Pointer directement sur la cible finale évite la redirection.
    url: 'https://www.getchair.app/app',
    cleartext: false,
    // Filet de sécurité : si un lien pointe un jour vers l'apex (getchair.app,
    // qui redirige vers www), ça reste dans l'app au lieu de rebasculer sur Safari.
    allowNavigation: ['getchair.app', 'www.getchair.app'],
    // Page locale affichée quand le chargement du site distant échoue au
    // niveau réseau (didFailProvisionalNavigation : hors-ligne, DNS, TLS…).
    // Sans elle : écran blanc définitif. Résolue en capacitor://localhost/
    // error.html, servie depuis le bundle (ios/App/App/public/error.html,
    // committé — exception dans ios/.gitignore). Ne couvre PAS les erreurs
    // HTTP (500…) : une réponse du serveur, même en erreur, est rendue.
    errorPath: 'error.html',
  },
  ios: {
    scheme: 'CHAIR',
    backgroundColor: '#ffffff',
    allowsLinkPreview: false,
    webContentsDebuggingEnabled: false,
    // Marqueur d'identité du binaire, ajouté au User-Agent de la WebView.
    // CHAIR CLIENT et CHAIR PRO chargent le MÊME site distant (server.url) :
    // sans ce marqueur, rien au runtime ne permet de savoir dans lequel des
    // deux binaires le code tourne (window.Capacitor est identique, et l'URL
    // de départ n'est pas persistante — une navigation interne l'efface).
    // Lu par lib/appContext.ts. Doit rester synchronisé avec la constante
    // CLIENT_UA_MARKER de ce fichier.
    appendUserAgent: 'CHAIRClient/1',
  },
  android: {
    backgroundColor: '#ffffff',
    // Même marqueur côté Android — voir le commentaire ios.appendUserAgent.
    appendUserAgent: 'CHAIRClient/1',
  },
  plugins: {
    // Présentation d'une push quand l'app est AU PREMIER PLAN (iOS).
    // Volontairement ['badge'] seul : pas de bannière système ni de son quand
    // l'app est ouverte — c'est le toast interne (lib/push.ts) qui affiche la
    // notification, sinon l'utilisateur verrait bannière + toast en double.
    // En arrière-plan, la bannière système normale s'affiche (cette option ne
    // concerne que le premier plan). Effectif au PROCHAIN build TestFlight.
    PushNotifications: {
      presentationOptions: ['badge'],
    },
    SplashScreen: {
      launchShowDuration: 0, // on gère le splash nous-mêmes dans l'app
    },
  },
};

export default config;
