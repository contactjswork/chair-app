'use client';

import { useEffect, useRef, useState } from 'react';
import { adminApi } from '@/lib/adminApi';
import 'leaflet/dist/leaflet.css';
import { Scissors, Building2, User, Activity } from 'lucide-react';

/**
 * Le monde CHAIR — demande Julien (15/09/2026) : « une carte du monde où on
 * verra tous les coiffeurs, clients, gérants avec des pings ».
 *
 * Carte Leaflet (tuiles OSM, comme le repli de la recherche client — jamais
 * de grayscale sur une carte réelle) avec un point par coiffeur (noir), salon
 * (ambre) et client (gris). Dessous : le pouls produit — les événements clés
 * des 14 derniers jours (inscriptions, réservations, scans…), comptés par
 * notre table product_events, aucun traceur tiers.
 */

interface MapPoints { coiffeurs: [number, number][]; salons: [number, number][]; clients: [number, number][] }
interface ProductEvents {
  totaux: Record<string, number>;
  quatorze_jours: Record<string, { jour: string; total: number }[]>;
}

/** Borne « 7 derniers jours » — hors rendu (Date.now est impur pour React). */
function seuilSeptJours(): string {
  return new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
}

const EVENEMENTS: { name: string; label: string }[] = [
  { name: 'inscription_client', label: 'Inscriptions client' },
  { name: 'inscription_pro',    label: 'Inscriptions pro' },
  { name: 'reservation',        label: 'Réservations' },
  { name: 'visite_verifiee',    label: 'Visites vérifiées' },
  { name: 'avis_verifie',       label: 'Avis vérifiés' },
  { name: 'demande_fauteuil',   label: 'Demandes de fauteuil' },
  { name: 'invitation_equipe_acceptee', label: 'Équipes rejointes' },
  { name: 'abonnement_demarre', label: 'Abonnements démarrés' },
];

export default function AdminMondePage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [points, setPoints] = useState<MapPoints | null>(null);
  const [events, setEvents] = useState<ProductEvents | null>(null);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    adminApi.get<MapPoints>('/admin/map-points').then(setPoints).catch(() => setErreur('Carte indisponible.'));
    adminApi.get<ProductEvents>('/admin/product-events').then(setEvents).catch(() => {});
  }, []);

  // Leaflet en import dynamique (window indisponible au SSR) — même approche
  // que components/search/leafletAdapter.ts.
  useEffect(() => {
    if (!points || !mapRef.current) return;
    let map: import('leaflet').Map | null = null;
    let annule = false;

    (async () => {
      const L = await import('leaflet');
      if (annule || !mapRef.current) return;

      map = L.map(mapRef.current, { zoomControl: true, attributionControl: false }).setView([46.6, 2.2], 6);
      // OSM standard — CARTO exige désormais une clé (voir leafletAdapter.ts).
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

      const poser = (coords: [number, number][], couleur: string, rayon: number) => {
        for (const [lat, lng] of coords) {
          L.circleMarker([lat, lng], {
            radius: rayon, color: couleur, fillColor: couleur,
            fillOpacity: 0.75, weight: 1, opacity: 0.9,
          }).addTo(map!);
        }
      };
      // Clients dessous (discrets), salons, puis coiffeurs au-dessus.
      poser(points.clients, '#a3a3a3', 3);
      poser(points.salons, '#f5b942', 5);
      poser(points.coiffeurs, '#0a0a0a', 4);
    })();

    return () => { annule = true; map?.remove(); };
  }, [points]);

  const septJours = (name: string): number => {
    const rows = events?.quatorze_jours?.[name] ?? [];
    return rows.filter((r) => r.jour >= seuilSeptJours()).reduce((acc, r) => acc + r.total, 0);
  };

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-xl font-bold text-neutral-900 mb-1">Le monde CHAIR</h1>
      <p className="text-sm text-neutral-500 mb-5">
        {points
          ? `${points.coiffeurs.length} coiffeurs · ${points.salons.length} salons · ${points.clients.length} clients géolocalisés`
          : erreur || 'Chargement…'}
      </p>

      <div ref={mapRef} className="h-[520px] rounded-[20px] overflow-hidden ring-1 ring-neutral-200 bg-neutral-100" />

      <div className="flex items-center gap-4 mt-3 text-[12px] text-neutral-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-neutral-900 inline-block" /><Scissors size={11} /> Coiffeurs</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#f5b942] inline-block" /><Building2 size={11} /> Salons</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-neutral-400 inline-block" /><User size={11} /> Clients</span>
      </div>

      {/* ── Pouls produit ── */}
      <div className="mt-8">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-neutral-900 mb-3">
          <Activity size={15} /> Pouls produit
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {EVENEMENTS.map((e) => (
            <div key={e.name} className="bg-white rounded-2xl ring-1 ring-neutral-200 p-4">
              <p className="text-[11px] text-neutral-400 font-semibold">{e.label}</p>
              <p className="text-xl font-bold text-neutral-900 tabular-nums mt-1">{septJours(e.name)}</p>
              <p className="text-[10px] text-neutral-400">7 derniers jours · {events?.totaux?.[e.name] ?? 0} au total</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
