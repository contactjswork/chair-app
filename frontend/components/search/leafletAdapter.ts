// Implémentation Leaflet + CARTO (tuiles couleur) de l'interface MapAdapter.
// Marqueurs et clusters dessinés en divIcon HTML.
//
// Principe produit : chaque coiffeur (salarié OU indépendant) a son propre
// marqueur avec sa photo — jamais absorbé dans le marqueur de son salon. Le
// salon a un marqueur à part (bâtiment) pour qui cherche l'établissement.
// La distinction salon/coiffeur repose sur la FORME (pastille building vs
// pastille avatar rond) et l'icône, jamais la couleur seule.

import type { Map as LeafletMap, Marker, LayerGroup } from 'leaflet';
import type { MapAdapter, MapBounds, MapInitOptions, MapLatLng, MapMarkerData, MapViewport } from './mapProvider';
import { markerHtml, clusterHtml, USER_DOT_HTML, CLUSTER_CELL_PX, MAX_AUTO_ZOOM, SPREAD_ZOOM } from './markerHtml';

export class LeafletAdapter implements MapAdapter {
  private L: typeof import('leaflet') | null = null;
  private map: LeafletMap | null = null;
  private markerLayer: LayerGroup | null = null;
  private userMarker: Marker | null = null;
  private markers: MapMarkerData[] = [];
  private selectedKey: string | null = null;
  private opts: MapInitOptions | null = null;
  /** Fenêtre temporelle après un déplacement programmatique — les moveend
   *  émis dans cette fenêtre (parfois plusieurs pour un seul fitBounds animé)
   *  ne comptent jamais comme un déplacement utilisateur. */
  private programmaticUntil = 0;

  private markProgrammatic(): void {
    this.programmaticUntil = performance.now() + 1200;
  }

  async init(el: HTMLElement, opts: MapInitOptions): Promise<void> {
    const L = await import('leaflet');
    this.L = L;
    this.opts = opts;

    const map = L.map(el, {
      center: [opts.center.lat, opts.center.lng],
      zoom: opts.zoom,
      zoomControl: false,
      attributionControl: true,
    });
    this.map = map;

    // CARTO Voyager — gratuit, sans clé. Comparé côte à côte (Positron,
    // Voyager brut, Voyager filtré) sur plusieurs villes/zooms avant de
    // choisir : Positron est trop plat/monochrome (perd toute couleur de
    // terrain, eau, végétation — l'effet "délavé" reproché), Voyager brut a
    // les bons ingrédients (terrain crème, eau bleue, parcs verts, routes
    // blanches) mais des bâtiments/routes trop saturés (orange vif) pour
    // évoquer le calme d'Apple Plans. Le filtre CSS ci-dessous (appliqué au
    // pane des tuiles UNIQUEMENT, jamais aux marqueurs) désature et éclaircit
    // légèrement pour se rapprocher du rendu Apple Maps, sans changer de
    // fournisseur ni ajouter de dépendance/clé.
    // Tuiles OpenStreetMap officielles — SANS clé d'API. CARTO
    // (basemaps.cartocdn.com) exige désormais une clé et incruste
    // « API KEY REQUIRED » en filigrane sur chaque tuile : le repli censé
    // sauver la carte l'affichait cassée (constaté en production).
    // OSM est libre d'accès et suffit pour un repli qui doit juste marcher.
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 20,
      subdomains: 'abcd',
    }).addTo(map);

    const tilePane = map.getPane('tilePane');
    if (tilePane) {
      tilePane.style.filter = 'saturate(0.7) brightness(1.06) contrast(0.93) hue-rotate(4deg)';
    }

    this.markerLayer = L.layerGroup().addTo(map);

    map.on('click', () => opts.onBackgroundTap());

    map.on('moveend', () => {
      // Le clustering dépend du zoom — re-render à chaque fin de mouvement
      this.renderMarkers();
      if (performance.now() < this.programmaticUntil) return;
      const vp = this.getViewport();
      if (vp) opts.onUserMoveEnd(vp);
    });
  }

  destroy(): void {
    this.map?.remove();
    this.map = null;
    this.markerLayer = null;
    this.userMarker = null;
    this.L = null;
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
    if (!this.L || !this.map) return;
    if (this.userMarker) {
      this.userMarker.remove();
      this.userMarker = null;
    }
    if (loc) {
      const icon = this.L.divIcon({ html: USER_DOT_HTML, className: 'chair-map-marker', iconSize: [16, 16], iconAnchor: [8, 8] });
      this.userMarker = this.L.marker([loc.lat, loc.lng], { icon, interactive: false, zIndexOffset: -100 }).addTo(this.map);
    }
  }

  setCenter(loc: MapLatLng, zoom?: number): void {
    if (!this.map) return;
    this.markProgrammatic();
    this.map.setView([loc.lat, loc.lng], zoom ?? this.map.getZoom(), { animate: true });
  }

  fitBounds(bounds: MapBounds, paddingPx = 48): void {
    if (!this.map || !this.L) return;
    this.markProgrammatic();
    this.map.fitBounds(
      this.L.latLngBounds([bounds.sw_lat, bounds.sw_lng], [bounds.ne_lat, bounds.ne_lng]),
      { padding: [paddingPx, paddingPx], maxZoom: MAX_AUTO_ZOOM, animate: true }
    );
  }

  getViewport(): MapViewport | null {
    if (!this.map) return null;
    const c = this.map.getCenter();
    const b = this.map.getBounds();
    return {
      center: { lat: c.lat, lng: c.lng },
      zoom: this.map.getZoom(),
      bounds: {
        sw_lat: b.getSouth(), sw_lng: b.getWest(),
        ne_lat: b.getNorth(), ne_lng: b.getEast(),
      },
    };
  }

  invalidateSize(): void {
    // Un recalage de taille n'est jamais un déplacement utilisateur
    this.markProgrammatic();
    this.map?.invalidateSize();
  }

  // ── Rendu marqueurs + clustering grille ──────────────────────────────────

  private renderMarkers(): void {
    const { L, map, markerLayer } = this;
    if (!L || !map || !markerLayer) return;

    markerLayer.clearLayers();

    const zoom = map.getZoom();
    const singles: { m: MapMarkerData; lat: number; lng: number }[] = [];

    if (zoom >= SPREAD_ZOOM) {
      // Plus de clustering — on étale les fiches qui partagent le même point
      const groups = new Map<string, MapMarkerData[]>();
      for (const m of this.markers) {
        const key = `${m.lat.toFixed(6)}_${m.lng.toFixed(6)}`;
        const g = groups.get(key);
        if (g) g.push(m);
        else groups.set(key, [m]);
      }
      for (const group of groups.values()) {
        if (group.length === 1) {
          singles.push({ m: group[0], lat: group[0].lat, lng: group[0].lng });
          continue;
        }
        const center = map.project([group[0].lat, group[0].lng], zoom);
        const radius = Math.max(34, (group.length * 44) / (2 * Math.PI));
        group.forEach((m, i) => {
          const angle = (2 * Math.PI * i) / group.length - Math.PI / 2;
          const pos = map.unproject(
            center.add([Math.cos(angle) * radius, Math.sin(angle) * radius]),
            zoom
          );
          singles.push({ m, lat: pos.lat, lng: pos.lng });
        });
      }
    } else {
      const cells = new Map<string, MapMarkerData[]>();
      for (const m of this.markers) {
        // Le marqueur sélectionné reste toujours individuel, jamais absorbé
        if (m.key === this.selectedKey) {
          singles.push({ m, lat: m.lat, lng: m.lng });
          continue;
        }
        const p = map.project([m.lat, m.lng], zoom);
        const cellKey = `${Math.floor(p.x / CLUSTER_CELL_PX)}_${Math.floor(p.y / CLUSTER_CELL_PX)}`;
        const bucket = cells.get(cellKey);
        if (bucket) bucket.push(m);
        else cells.set(cellKey, [m]);
      }

      for (const bucket of cells.values()) {
        if (bucket.length === 1) {
          singles.push({ m: bucket[0], lat: bucket[0].lat, lng: bucket[0].lng });
          continue;
        }
        // Cluster — position au barycentre, tap = zoom sur la zone du groupe
        const lat = bucket.reduce((s, m) => s + m.lat, 0) / bucket.length;
        const lng = bucket.reduce((s, m) => s + m.lng, 0) / bucket.length;
        const icon = L.divIcon({ html: clusterHtml(bucket.length), className: 'chair-map-marker', iconSize: [36, 36], iconAnchor: [18, 18] });
        const marker = L.marker([lat, lng], { icon, zIndexOffset: 200 });
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e as unknown as Event);
          const lats = bucket.map((m) => m.lat);
          const lngs = bucket.map((m) => m.lng);
          const span = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
          if (span < 0.0005) {
            // Toutes les fiches au même point (centroïde ville) — zoomer au
            // niveau où elles s'étalent en cercle
            this.setCenter({ lat, lng }, SPREAD_ZOOM);
          } else {
            this.fitBounds(
              { sw_lat: Math.min(...lats), sw_lng: Math.min(...lngs), ne_lat: Math.max(...lats), ne_lng: Math.max(...lngs) },
              70
            );
          }
        });
        marker.addTo(markerLayer);
      }
    }

    for (const { m, lat, lng } of singles) {
      const selected = m.key === this.selectedKey;
      const icon = L.divIcon({
        html: markerHtml(m, selected),
        className: 'chair-map-marker',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      const marker = L.marker([lat, lng], { icon, zIndexOffset: selected ? 1000 : 0 });
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e as unknown as Event);
        this.opts?.onSelect(m.key);
      });
      marker.addTo(markerLayer);
    }
  }
}
