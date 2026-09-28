// Pages « du site » (confidentialité, CGU, mentions légales, contact) :
// dans les apps natives, elles s'ouvrent dans une feuille Safari par-dessus
// l'app (décision Julien 28/09/2026 : « quand tu es sur l'app, ça ouvre ça
// depuis le site ») — le document légal reste celui du site, l'utilisateur
// le referme d'un geste et retrouve l'écran où il était. Sur le web, simple
// navigation interne.

import { Capacitor } from '@capacitor/core';

export const SITE_URL = 'https://www.getchair.app';

/** Ouvre une page du site. Retourne true si elle a été ouverte en natif
 *  (l'appelant doit alors bloquer la navigation interne). */
export async function ouvrirPageSite(path: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const url = `${SITE_URL}${path}`;
  try {
    // Binaire antérieur au plugin : isPluginAvailable faux → repli ci-dessous.
    if (Capacitor.isPluginAvailable('Browser')) {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url, presentationStyle: 'popover' });
      return true;
    }
  } catch { /* repli */ }
  window.open(url, '_blank');
  return true;
}
