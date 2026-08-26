// Choix du moteur de carte — UNE seule porte d'entrée pour les 3 cartes de
// l'app (recherche client, fauteuils à louer, section carte de la home).
//
// Apple Plans (MapKit JS) d'abord : si le backend a des clés MapKit
// configurées (GET /api/mapkit-token répond), la vraie carte Apple s'affiche.
// Sinon — clés absentes, CDN inaccessible, échec d'init — repli silencieux
// sur Leaflet/CARTO (l'ancienne carte) : la carte ne casse JAMAIS.
//
// Le repli n'est PAS définitif pour autant : une microcoupure réseau au
// lancement ne doit pas condamner l'utilisateur à l'ancienne carte jusqu'au
// redémarrage de l'app (fréquent en mobilité). Deux régimes d'échec :
//  - définitif (le backend répond 501/404 sur /mapkit-token : clés non
//    configurées) → Leaflet pour toute la session, inutile de réessayer ;
//  - transitoire (réseau, CDN, init) → on retente MapKit dès que l'échec
//    date de plus de MAPKIT_RETRY_MS, à la prochaine carte montée.
//
// NEXT_PUBLIC_MAP_PROVIDER=leaflet force l'ancien moteur (debug/urgence).

import type { MapAdapter, MapInitOptions } from './mapProvider';

/** Délai avant de retenter MapKit après un échec transitoire (2 minutes). */
const MAPKIT_RETRY_MS = 2 * 60 * 1000;

/** Échec définitif pour la session : clés MapKit absentes côté backend. */
let mapkitBrokenForSession = false;

/** Horodatage du dernier échec transitoire (null = aucun échec en cours). */
let mapkitFailedAt: number | null = null;

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

function shouldTryMapkit(): boolean {
  if (mapkitBrokenForSession) return false;
  if (mapkitFailedAt === null) return true;
  return Date.now() - mapkitFailedAt > MAPKIT_RETRY_MS;
}

export async function createAndInitMapAdapter(el: HTMLElement, opts: MapInitOptions): Promise<MapAdapter> {
  const forced = process.env.NEXT_PUBLIC_MAP_PROVIDER;

  if (forced !== 'leaflet' && shouldTryMapkit()) {
    try {
      const { MapKitAdapter } = await import('./mapkitAdapter');
      const adapter = new MapKitAdapter();
      await adapter.init(el, opts);
      mapkitFailedAt = null; // MapKit re-fonctionne : on oublie l'échec passé
      return adapter;
    } catch (err) {
      if (isDefinitiveMapkitFailure(err)) {
        mapkitBrokenForSession = true;
      } else {
        mapkitFailedAt = Date.now();
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
