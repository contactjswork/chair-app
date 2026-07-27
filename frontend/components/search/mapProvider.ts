// Interface commune des fournisseurs de carte de la page Recherche.
//
// L'UX (marqueurs, clustering, sélection, "rechercher dans cette zone") est
// écrite UNE fois contre cette interface — l'implémentation actuelle est
// Leaflet + OpenStreetMap (leafletAdapter.ts). Brancher MapKit JS ou Google
// Maps plus tard = écrire un nouvel adaptateur, sans toucher à l'UX.

export interface MapLatLng {
  lat: number;
  lng: number;
}

export interface MapBounds {
  sw_lat: number;
  sw_lng: number;
  ne_lat: number;
  ne_lng: number;
}

export interface MapViewport {
  center: MapLatLng;
  zoom: number;
  bounds: MapBounds;
}

export interface MapMarkerData {
  /** Clé unique du résultat (`salon-12`, `hairdresser-4`, `chair-8`) */
  key: string;
  lat: number;
  lng: number;
  /** 'chair' = carte dédiée location de fauteuil (ChairSearchMap) — jamais
   *  affiché en même temps que 'salon'/'hairdresser' (carte recherche client),
   *  seul le rendu de pastille est mutualisé ici. */
  type: 'salon' | 'hairdresser' | 'chair';
  /** Note affichée dans la pastille — null si aucun avis */
  rating: number | null;
  /** Chaque coiffeur (salarié ou indépendant) a son propre marqueur avec sa
   *  photo — jamais absorbé dans un marqueur salon. */
  avatarUrl?: string | null;
  initials?: string;
  levelColor?: string | null;
  /** Uniquement pour type='chair' — prix affiché directement dans la pastille (ex: "25€/j"). */
  priceLabel?: string;
}

export interface MapInitOptions {
  center: MapLatLng;
  zoom: number;
  /** Tap sur un marqueur individuel */
  onSelect: (key: string) => void;
  /** Tap sur le fond de carte (désélection) */
  onBackgroundTap: () => void;
  /** Fin d'un déplacement INITIÉ PAR L'UTILISATEUR (jamais programmatique) */
  onUserMoveEnd: (viewport: MapViewport) => void;
}

export interface MapAdapter {
  init(el: HTMLElement, opts: MapInitOptions): Promise<void>;
  destroy(): void;
  setMarkers(markers: MapMarkerData[]): void;
  setSelected(key: string | null): void;
  setUserLocation(loc: MapLatLng | null): void;
  setCenter(loc: MapLatLng, zoom?: number): void;
  fitBounds(bounds: MapBounds, paddingPx?: number): void;
  getViewport(): MapViewport | null;
  invalidateSize(): void;
}
