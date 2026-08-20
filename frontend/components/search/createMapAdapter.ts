// Choix du moteur de carte — UNE seule porte d'entrée pour les 3 cartes de
// l'app (recherche client, fauteuils à louer, section carte de la home).
//
// Apple Plans (MapKit JS) d'abord : si le backend a des clés MapKit
// configurées (GET /api/mapkit-token répond), la vraie carte Apple s'affiche.
// Sinon — clés absentes, CDN inaccessible, échec d'init — repli silencieux
// sur Leaflet/CARTO (l'ancienne carte) : la carte ne casse JAMAIS.
//
// NEXT_PUBLIC_MAP_PROVIDER=leaflet force l'ancien moteur (debug/urgence).

import type { MapAdapter, MapInitOptions } from './mapProvider';

let mapkitBroken = false;

export async function createAndInitMapAdapter(el: HTMLElement, opts: MapInitOptions): Promise<MapAdapter> {
  const forced = process.env.NEXT_PUBLIC_MAP_PROVIDER;

  if (forced !== 'leaflet' && !mapkitBroken) {
    try {
      const { MapKitAdapter } = await import('./mapkitAdapter');
      const adapter = new MapKitAdapter();
      await adapter.init(el, opts);
      return adapter;
    } catch (err) {
      // Clés non configurées (501) ou init impossible : on ne réessaie plus
      // pour cette session — chaque carte suivante part directement sur Leaflet.
      mapkitBroken = true;
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
