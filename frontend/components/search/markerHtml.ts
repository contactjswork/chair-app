// Rendu HTML des marqueurs de carte — PARTAGÉ entre les moteurs (Leaflet et
// MapKit JS/Apple Plans). Les pastilles sont des chaînes HTML injectées hors
// du pipeline Tailwind (divIcon Leaflet / factory DOM MapKit), d'où les
// styles inline et les couleurs hex brutes.
//
// Principe produit : chaque coiffeur (salarié OU indépendant) a son propre
// marqueur avec sa photo — jamais absorbé dans le marqueur de son salon. Le
// salon a un marqueur à part (bâtiment) pour qui cherche l'établissement.

import type { MapMarkerData } from './mapProvider';

const ICON_STORE = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M2 7h20"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/></svg>`;

/** Couleur de bordure de l'avatar selon le niveau CHAIR — mêmes couleurs que
 *  LEVEL_RING (lib/chairLevel.ts). */
const LEVEL_BORDER: Record<string, string> = {
  neutral: '#0a0a0a',
  bronze:  '#f59e0b',
  silver:  '#a3a3a3',
  gold:    '#eab308',
  purple:  '#a855f7',
  diamond: '#0a0a0a',
};

function fmtRating(r: number | null): string {
  if (r == null) return '';
  return r.toFixed(1).replace('.', ',');
}

function salonMarkerHtml(m: MapMarkerData, selected: boolean): string {
  const scale  = selected ? 'transform:scale(1.15);' : '';
  const shadow = selected ? '0 6px 18px rgba(0,0,0,0.45)' : '0 3px 10px rgba(0,0,0,0.28)';
  const rating = fmtRating(m.rating);

  return `
    <div style="transform:translate(-50%,-100%);position:absolute;">
      <div style="display:flex;flex-direction:column;align-items:center;${scale}transition:transform 140ms ease;transform-origin:bottom center;">
        <div style="display:flex;align-items:center;gap:4px;background:#0a0a0a;color:#fff;border:2px solid #fff;border-radius:999px;padding:5px ${rating ? '9px' : '7px'};box-shadow:${shadow};white-space:nowrap;">
          ${ICON_STORE}
          ${rating ? `<span style="font-size:11px;font-weight:700;line-height:1;">${rating}</span>` : ''}
        </div>
        <div style="width:2px;height:5px;background:#0a0a0a;"></div>
      </div>
    </div>`;
}

/** Marqueur coiffeur — pastille avatar ronde, bordée de la couleur de son
 *  niveau CHAIR, avec la note en pastille superposée. */
function hairdresserMarkerHtml(m: MapMarkerData, selected: boolean): string {
  const scale  = selected ? 'transform:scale(1.15);' : '';
  const shadow = selected ? '0 6px 18px rgba(0,0,0,0.4)' : '0 3px 10px rgba(0,0,0,0.25)';
  const rating = fmtRating(m.rating);
  const border = LEVEL_BORDER[m.levelColor ?? 'neutral'] ?? '#0a0a0a';
  const inner  = m.avatarUrl
    ? `<img src="${m.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" />`
    : `<div style="width:100%;height:100%;border-radius:50%;background:#e5e5e5;display:flex;align-items:center;justify-content:center;color:#737373;font-weight:700;font-size:13px;">${(m.initials ?? '?').slice(0, 1).toUpperCase()}</div>`;

  return `
    <div style="transform:translate(-50%,-100%);position:absolute;">
      <div style="display:flex;flex-direction:column;align-items:center;${scale}transition:transform 140ms ease;transform-origin:bottom center;">
        <div style="position:relative;width:38px;height:38px;border-radius:50%;border:2.5px solid ${border};box-shadow:${shadow};background:#fff;padding:2px;">
          <div style="width:100%;height:100%;border-radius:50%;overflow:hidden;">${inner}</div>
          ${rating ? `<div style="position:absolute;bottom:-4px;right:-6px;background:#0a0a0a;color:#fff;border:1.5px solid #fff;border-radius:999px;padding:1px 5px;font-size:9px;font-weight:700;line-height:1.4;">${rating}</div>` : ''}
        </div>
        <div style="width:2px;height:5px;background:#0a0a0a;margin-top:1px;"></div>
      </div>
    </div>`;
}

/** Marqueur fauteuil à louer — pastille prix façon Airbnb. */
function chairMarkerHtml(m: MapMarkerData, selected: boolean): string {
  const scale  = selected ? 'transform:scale(1.1);' : '';
  const bg     = selected ? '#0a0a0a' : '#fff';
  const color  = selected ? '#fff' : '#0a0a0a';
  const shadow = selected ? '0 6px 18px rgba(0,0,0,0.35)' : '0 3px 10px rgba(0,0,0,0.2)';

  return `
    <div style="transform:translate(-50%,-50%);position:absolute;">
      <div style="display:flex;align-items:center;justify-content:center;background:${bg};color:${color};border:1.5px solid #0a0a0a;border-radius:999px;padding:6px 10px;box-shadow:${shadow};white-space:nowrap;font-size:11px;font-weight:700;${scale}transition:transform 140ms ease;">
        ${m.priceLabel ?? ''}
      </div>
    </div>`;
}

export function markerHtml(m: MapMarkerData, selected: boolean): string {
  if (m.type === 'chair') return chairMarkerHtml(m, selected);
  return m.type === 'salon' ? salonMarkerHtml(m, selected) : hairdresserMarkerHtml(m, selected);
}

export function clusterHtml(count: number): string {
  return `
    <div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:#0a0a0a;color:#fff;border:2.5px solid #fff;border-radius:50%;box-shadow:0 3px 12px rgba(0,0,0,0.3);font-size:12px;font-weight:700;">
      ${count}
    </div>`;
}

export const USER_DOT_HTML = `
  <div style="width:16px;height:16px;background:#0a0a0a;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,0.15),0 2px 8px rgba(0,0,0,0.35);"></div>`;

export const CLUSTER_CELL_PX = 76;
export const MAX_AUTO_ZOOM   = 16;
/** À partir de ce zoom, plus de clustering : les fiches partageant exactement
 *  le même point (géocodage au centroïde de la ville) sont étalées en cercle. */
export const SPREAD_ZOOM = 17;

// ── Projection Web Mercator pure (indépendante du moteur de carte) ──────────
// Mêmes maths que Leaflet map.project/unproject — utilisée par l'adaptateur
// MapKit pour reproduire le clustering grille et l'étalement en cercle.

export function mercatorProject(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const scale = 256 * Math.pow(2, zoom);
  const sin = Math.sin((lat * Math.PI) / 180);
  const clamped = Math.min(Math.max(sin, -0.9999), 0.9999);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + clamped) / (1 - clamped)) / (4 * Math.PI)) * scale,
  };
}

export function mercatorUnproject(x: number, y: number, zoom: number): { lat: number; lng: number } {
  const scale = 256 * Math.pow(2, zoom);
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}
