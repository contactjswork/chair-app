// Implémentation Apple Plans (MapKit JS officiel) de l'interface MapAdapter —
// la VRAIE carte Apple, légalement : script officiel cdn.apple-mapkit.com,
// token JWT signé côté backend (GET /api/mapkit-token) avec la clé MapKit JS
// du compte Apple Developer, attribution/logo Apple affichés par la lib
// (obligatoire, jamais masqués).
//
// Même contrat que LeafletAdapter : marqueurs photo par coiffeur, pastille
// bâtiment par salon, pastille prix par fauteuil, clustering grille custom et
// étalement en cercle au zoom max — tout le rendu HTML vient de markerHtml.ts
// (partagé), la projection du clustering est un Web Mercator pur (markerHtml)
// car MapKit n'expose pas de project()/unproject() par zoom.

import type { MapAdapter, MapBounds, MapInitOptions, MapLatLng, MapMarkerData, MapViewport } from './mapProvider';
import {
  markerHtml, clusterHtml, USER_DOT_HTML,
  CLUSTER_CELL_PX, MAX_AUTO_ZOOM, SPREAD_ZOOM,
  mercatorProject, mercatorUnproject,
} from './markerHtml';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window { mapkit?: any }
}

const MAPKIT_SRC = 'https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js';
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

let loadPromise: Promise<any> | null = null;
let scriptPromise: Promise<void> | null = null;

/** Jeton mémorisé pour la session — évite un aller-retour serveur (~220 ms
 *  sur l'hébergement mutualisé) à chaque carte ouverte. Marge de sécurité de
 *  2 min avant l'expiration réelle annoncée par le backend. */
const TOKEN_KEY = 'chair_mapkit_token';

function readCachedToken(): string | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const { token, expiresAt } = JSON.parse(raw) as { token: string; expiresAt: number };
    if (!token || Date.now() > expiresAt) { sessionStorage.removeItem(TOKEN_KEY); return null; }
    return token;
  } catch { return null; }
}

async function fetchToken(useCache = true): Promise<string> {
  if (useCache) {
    const cached = readCachedToken();
    if (cached) return cached;
  }
  const res = await fetch(`${API}/mapkit-token`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`mapkit-token ${res.status}`);
  const data = await res.json();
  if (!data?.token) throw new Error('mapkit-token vide');
  try {
    const ttl = Math.max(60, Number(data.expires_in ?? 1800) - 120) * 1000;
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token: data.token, expiresAt: Date.now() + ttl }));
  } catch { /* stockage indisponible : on continue sans cache */ }
  return data.token;
}

/** Injecte le script Apple (idempotent). Séparé du jeton pour pouvoir lancer
 *  les deux EN PARALLÈLE — avant, le script n'était demandé qu'une fois le
 *  jeton reçu, soit ~400 ms d'attente pure ajoutés au premier affichage. */
function loadScript(): Promise<void> {
  if (window.mapkit) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${MAPKIT_SRC}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (window.mapkit) { resolve(); return; }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('mapkit.js introuvable')));
      return;
    }
    const s = document.createElement('script');
    s.src = MAPKIT_SRC;
    s.crossOrigin = 'anonymous';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('mapkit.js introuvable'));
    document.head.appendChild(s);
  });
  scriptPromise.catch(() => { scriptPromise = null; });
  return scriptPromise;
}

/**
 * Démarre le téléchargement du script + du jeton SANS attendre que la carte
 * soit montée. Appelé depuis la page de recherche dès son affichage : quand
 * l'utilisateur arrive réellement sur la carte, tout est déjà en mémoire.
 */
export function warmUpMapKit(): void {
  if (typeof window === 'undefined') return;
  loadScript().catch(() => {});
  fetchToken().catch(() => {});
}

/**
 * Charge le script MapKit + init global (une seule fois par page). Rejette si
 * le backend n'a pas de clés MapKit configurées (501) — l'appelant bascule
 * alors sur Leaflet, la carte ne casse jamais.
 */
export async function loadMapKit(): Promise<any> {
  if (window.mapkit?.maps) return window.mapkit;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    // Script et jeton en parallèle : le plus lent des deux donne le temps
    // total, au lieu de la somme des deux.
    const [firstToken] = await Promise.all([fetchToken(), loadScript()]);

    const mapkit = window.mapkit;
    if (!mapkit) throw new Error('mapkit global absent');

    const firstTokenBox = { value: firstToken as string | null };

    mapkit.init({
      authorizationCallback: (done: (token: string) => void) => {
        // Premier appel : token déjà récupéré. Renouvellements : re-fetch.
        if (firstTokenBox.value) {
          done(firstTokenBox.value);
          firstTokenBox.value = null;
        } else {
          // Renouvellement : jamais depuis le cache (c'est justement qu'il a expiré).
          fetchToken(false).then(done).catch(() => done(''));
        }
      },
      language: 'fr',
    });

    return mapkit;
  })();

  loadPromise.catch(() => { loadPromise = null; });
  return loadPromise;
}

export class MapKitAdapter implements MapAdapter {
  private mapkit: any = null;
  private map: any = null;
  private opts: MapInitOptions | null = null;
  private markers: MapMarkerData[] = [];
  private annotations: any[] = [];
  private userAnnotation: any = null;
  private selectedKey: string | null = null;
  private el: HTMLElement | null = null;
  private programmaticUntil = 0;
  private markerTapAt = 0;

  private markProgrammatic(): void {
    this.programmaticUntil = performance.now() + 1200;
  }

  async init(el: HTMLElement, opts: MapInitOptions): Promise<void> {
    const mapkit = await loadMapKit();
    this.mapkit = mapkit;
    this.opts = opts;
    this.el = el;

    this.markProgrammatic();
    const map = new mapkit.Map(el, {
      center: new mapkit.Coordinate(opts.center.lat, opts.center.lng),
      showsCompass: mapkit.FeatureVisibility.Hidden,
      showsMapTypeControl: false,
      showsZoomControl: false,
      showsScale: mapkit.FeatureVisibility.Hidden,
      isRotationEnabled: false,
      showsPointsOfInterest: true,
    });
    this.map = map;
    this.setCenter(opts.center, opts.zoom);

    map.addEventListener('single-tap', () => {
      // Un tap sur un marqueur (géré via listener DOM) précède ce single-tap :
      // fenêtre courte pour ne pas désélectionner ce qu'on vient de choisir.
      if (performance.now() - this.markerTapAt < 400) return;
      opts.onBackgroundTap();
    });

    map.addEventListener('region-change-end', () => {
      this.renderMarkers();
      if (performance.now() < this.programmaticUntil) return;
      const vp = this.getViewport();
      if (vp) opts.onUserMoveEnd(vp);
    });
  }

  destroy(): void {
    try { this.map?.destroy(); } catch { /* déjà détruit */ }
    this.map = null;
    this.mapkit = null;
    this.annotations = [];
    this.userAnnotation = null;
    this.el = null;
  }

  setMarkers(markers: MapMarkerData[]): void {
    this.markers = markers;
    this.renderMarkers();
  }

  setSelected(key: string | null): void {
    if (this.selectedKey === key) return;
    this.selectedKey = key;
    this.renderMarkers();
  }

  setUserLocation(loc: MapLatLng | null): void {
    const { mapkit, map } = this;
    if (!mapkit || !map) return;
    if (this.userAnnotation) {
      map.removeAnnotation(this.userAnnotation);
      this.userAnnotation = null;
    }
    if (loc) {
      const a = new mapkit.Annotation(
        new mapkit.Coordinate(loc.lat, loc.lng),
        () => {
          const div = document.createElement('div');
          div.innerHTML = USER_DOT_HTML;
          return div;
        },
        { enabled: false }
      );
      map.addAnnotation(a);
      this.userAnnotation = a;
    }
  }

  setCenter(loc: MapLatLng, zoom?: number): void {
    const { mapkit, map } = this;
    if (!mapkit || !map) return;
    this.markProgrammatic();
    const z = zoom ?? this.currentZoom() ?? 13;
    const lngDelta = this.lngDeltaForZoom(z);
    const latDelta = lngDelta * Math.cos((loc.lat * Math.PI) / 180) * (this.aspectRatio());
    map.setRegionAnimated(new mapkit.CoordinateRegion(
      new mapkit.Coordinate(loc.lat, loc.lng),
      new mapkit.CoordinateSpan(latDelta, lngDelta)
    ), true);
  }

  // Le padding pixel de l'interface est approximé par la marge relative de
  // 25% ci-dessous — MapKit raisonne en régions, pas en pixels.
  fitBounds(bounds: MapBounds): void {
    const { mapkit, map } = this;
    if (!mapkit || !map) return;
    this.markProgrammatic();
    // Marge relative + span minimal (équivalent MAX_AUTO_ZOOM : jamais zoomer
    // plus près que le zoom 16 sur un fitBounds automatique).
    const minLng = this.lngDeltaForZoom(MAX_AUTO_ZOOM);
    const latDelta = Math.max((bounds.ne_lat - bounds.sw_lat) * 1.25, minLng * 0.8);
    const lngDelta = Math.max((bounds.ne_lng - bounds.sw_lng) * 1.25, minLng);
    map.setRegionAnimated(new mapkit.CoordinateRegion(
      new mapkit.Coordinate((bounds.sw_lat + bounds.ne_lat) / 2, (bounds.sw_lng + bounds.ne_lng) / 2),
      new mapkit.CoordinateSpan(latDelta, lngDelta)
    ), true);
  }

  getViewport(): MapViewport | null {
    const { map } = this;
    if (!map) return null;
    const r = map.region;
    if (!r) return null;
    return {
      center: { lat: r.center.latitude, lng: r.center.longitude },
      zoom: this.currentZoom() ?? 13,
      bounds: {
        sw_lat: r.center.latitude - r.span.latitudeDelta / 2,
        sw_lng: r.center.longitude - r.span.longitudeDelta / 2,
        ne_lat: r.center.latitude + r.span.latitudeDelta / 2,
        ne_lng: r.center.longitude + r.span.longitudeDelta / 2,
      },
    };
  }

  invalidateSize(): void {
    // MapKit suit lui-même la taille de son conteneur — rien à faire, mais un
    // resize ne doit jamais compter comme un déplacement utilisateur.
    this.markProgrammatic();
  }

  // ── Interne ───────────────────────────────────────────────────────────────

  private aspectRatio(): number {
    const w = this.el?.clientWidth || 375;
    const h = this.el?.clientHeight || 600;
    return h / w;
  }

  /** Zoom Web-Mercator équivalent, déduit de la largeur angulaire affichée. */
  private currentZoom(): number | null {
    const { map, el } = this;
    if (!map?.region || !el) return null;
    const width = el.clientWidth || 375;
    const lngDelta = map.region.span.longitudeDelta || 360;
    return Math.max(1, Math.min(21, Math.log2((360 * width) / (256 * lngDelta))));
  }

  private lngDeltaForZoom(zoom: number): number {
    const width = this.el?.clientWidth || 375;
    return (360 * width) / (256 * Math.pow(2, zoom));
  }

  private renderMarkers(): void {
    const { mapkit, map } = this;
    if (!mapkit || !map) return;

    if (this.annotations.length) {
      map.removeAnnotations(this.annotations);
      this.annotations = [];
    }

    const zoom = Math.round(this.currentZoom() ?? 13);
    const singles: { m: MapMarkerData; lat: number; lng: number }[] = [];
    const clusters: { lat: number; lng: number; bucket: MapMarkerData[] }[] = [];

    if (zoom >= SPREAD_ZOOM) {
      const groups = new Map<string, MapMarkerData[]>();
      for (const m of this.markers) {
        const key = `${m.lat.toFixed(6)}_${m.lng.toFixed(6)}`;
        const g = groups.get(key);
        if (g) g.push(m); else groups.set(key, [m]);
      }
      for (const group of groups.values()) {
        if (group.length === 1) {
          singles.push({ m: group[0], lat: group[0].lat, lng: group[0].lng });
          continue;
        }
        const c = mercatorProject(group[0].lat, group[0].lng, zoom);
        const radius = Math.max(34, (group.length * 44) / (2 * Math.PI));
        group.forEach((m, i) => {
          const angle = (2 * Math.PI * i) / group.length - Math.PI / 2;
          const p = mercatorUnproject(c.x + Math.cos(angle) * radius, c.y + Math.sin(angle) * radius, zoom);
          singles.push({ m, lat: p.lat, lng: p.lng });
        });
      }
    } else {
      const cells = new Map<string, MapMarkerData[]>();
      for (const m of this.markers) {
        if (m.key === this.selectedKey) {
          singles.push({ m, lat: m.lat, lng: m.lng });
          continue;
        }
        const p = mercatorProject(m.lat, m.lng, zoom);
        const cellKey = `${Math.floor(p.x / CLUSTER_CELL_PX)}_${Math.floor(p.y / CLUSTER_CELL_PX)}`;
        const bucket = cells.get(cellKey);
        if (bucket) bucket.push(m); else cells.set(cellKey, [m]);
      }
      for (const bucket of cells.values()) {
        if (bucket.length === 1) {
          singles.push({ m: bucket[0], lat: bucket[0].lat, lng: bucket[0].lng });
          continue;
        }
        clusters.push({
          lat: bucket.reduce((s, m) => s + m.lat, 0) / bucket.length,
          lng: bucket.reduce((s, m) => s + m.lng, 0) / bucket.length,
          bucket,
        });
      }
    }

    const mkAnnotation = (lat: number, lng: number, html: string, onTap: () => void, zPriority: number) => {
      const a = new this.mapkit.Annotation(
        new this.mapkit.Coordinate(lat, lng),
        () => {
          const div = document.createElement('div');
          div.innerHTML = html;
          div.addEventListener('click', (e) => {
            e.stopPropagation();
            this.markerTapAt = performance.now();
            onTap();
          });
          return div;
        },
        // Nos pastilles gèrent leur propre ancrage (translate -50%/-100%) :
        // l'annotation elle-même est un point 0x0 posé sur la coordonnée.
        { size: { width: 0, height: 0 }, anchorOffset: new DOMPoint(0, 0), displayPriority: zPriority }
      );
      return a;
    };

    const next: any[] = [];

    for (const c of clusters) {
      next.push(mkAnnotation(c.lat, c.lng, clusterHtml(c.bucket.length), () => {
        const lats = c.bucket.map((m) => m.lat);
        const lngs = c.bucket.map((m) => m.lng);
        const span = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
        if (span < 0.0005) {
          this.setCenter({ lat: c.lat, lng: c.lng }, SPREAD_ZOOM);
        } else {
          this.fitBounds(
            { sw_lat: Math.min(...lats), sw_lng: Math.min(...lngs), ne_lat: Math.max(...lats), ne_lng: Math.max(...lngs) }
          );
        }
      }, 900));
    }

    for (const { m, lat, lng } of singles) {
      const selected = m.key === this.selectedKey;
      next.push(mkAnnotation(lat, lng, markerHtml(m, selected), () => this.opts?.onSelect(m.key), selected ? 1000 : 500));
    }

    if (next.length) map.addAnnotations(next);
    this.annotations = next;
  }
}
