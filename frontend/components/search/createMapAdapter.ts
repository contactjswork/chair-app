// Choix du moteur de carte — UNE seule porte d'entrée pour les 3 cartes de
// l'app (recherche client, fauteuils à louer, section carte de la home).
//
// Apple Plans (MapKit JS) d'abord : si le backend a des clés MapKit
// configurées (GET /api/mapkit-token répond), la vraie carte Apple s'affiche.
// Sinon — clés absentes, CDN inaccessible, échec d'init — repli silencieux
// sur Leaflet/OpenStreetMap (l'ancienne carte) : la carte ne casse JAMAIS.
//
// Le repli n'est jamais collant : Apple Plans est retenté à CHAQUE carte
// montée. Seul l'échec « clés non configurées » (501/404 sur /mapkit-token)
// coupe les tentatives pour la session — lui seul ne peut pas se résoudre
// tout seul. Voir shouldTryMapkit() pour le raisonnement complet.
//
// NEXT_PUBLIC_MAP_PROVIDER=leaflet force l'ancien moteur (debug/urgence).

import type { MapAdapter, MapInitOptions } from './mapProvider';

/** Échec définitif pour la session : clés MapKit absentes côté backend. */
let mapkitBrokenForSession = false;

/**
 * Distingue l'échec définitif du transitoire via le message d'erreur émis
 * par mapkitAdapter (`mapkit-token <status>`) : 501 = clés non configurées,
 * 404 = route absente (backend pas à jour). Tout le reste — erreur réseau,
 * mapkit.js introuvable, 5xx passager — est traité comme transitoire.
 */
function isDefinitiveMapkitFailure(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /mapkit-token (501|404)\b/.test(msg);
}

/**
 * Apple Plans est retenté à CHAQUE carte montée, sans mémoire d'échec — seul
 * le cas « clés non configurées » (501/404) coupe les tentatives pour la
 * session, parce que lui ne peut pas se résoudre tout seul.
 *
 * Pourquoi aucun délai de reprise : un échec transitoire (réseau faible,
 * CDN Apple lent) collait l'ancienne carte pendant des minutes alors que la
 * connexion était revenue — c'est exactement ce que Julien constatait
 * (« elle s'enlève toujours »). Le coût d'un réessai est négligeable : le
 * jeton est en cache de session et mapkit.js dans le cache du navigateur,
 * donc une reprise réussie ne coûte quasiment rien, et un échec retombe sur
 * le repli comme avant.
 */
function shouldTryMapkit(): boolean {
  return !mapkitBrokenForSession;
}

export async function createAndInitMapAdapter(el: HTMLElement, opts: MapInitOptions): Promise<MapAdapter> {
  const forced = process.env.NEXT_PUBLIC_MAP_PROVIDER;

  if (forced !== 'leaflet' && shouldTryMapkit()) {
    try {
      const { MapKitAdapter } = await import('./mapkitAdapter');
      const adapter = new MapKitAdapter();
      await adapter.init(el, opts);
      return adapter;
    } catch (err) {
      if (isDefinitiveMapkitFailure(err)) {
        mapkitBrokenForSession = true;
      }
      if (process.env.NODE_ENV !== 'production') {
        console.info('[carte] MapKit indisponible, repli Leaflet :', err);
      }
    }
  }

  const { LeafletAdapter } = await import('./leafletAdapter');
  const adapter = new LeafletAdapter();
  await adapter.init(el, opts);
  return adapter;
}
