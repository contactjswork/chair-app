'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { chairRentals } from '@/lib/api';
import {
  resolveMediaUrl, CHAIR_SPACE_TYPES, CHAIR_EQUIPMENT_LABELS,
  type ApiChairRental, type ApiChairRentalRequest, type ChairEquipmentKey, type ChairSpaceType,
} from '@/lib/types';
import ChairSearchMap from '@/components/chairSearch/ChairSearchMap';
import OwnerBottomSheet from '@/components/owner/OwnerBottomSheet';
import {
  Armchair, MapPin, Search, X, Camera, List, Map as MapIcon, SlidersHorizontal, Check,
} from 'lucide-react';

const DEFAULT_MAP_CENTER = { lat: 46.6, lng: 2.2 };
const DEFAULT_MAP_ZOOM = 5;

const DAY_LABELS: Record<number, string> = {
  1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 7: 'Dim',
};

const REQUEST_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Envoyée', cls: 'bg-amber-400 text-white' },
  in_discussion: { label: 'En discussion', cls: 'bg-blue-500 text-white' },
  accepted: { label: 'Acceptée', cls: 'bg-green-500 text-white' },
  declined: { label: 'Refusée', cls: 'bg-red-400 text-white' },
  cancelled: { label: 'Annulée', cls: 'bg-neutral-400 text-white' },
};

interface Filters {
  space_type: ChairSpaceType | '';
  min_price: string;
  max_price: string;
  equipment: ChairEquipmentKey[];
}

const EMPTY_FILTERS: Filters = { space_type: '', min_price: '', max_price: '', equipment: [] };

export default function FauteuilsALouerPage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);
  const [rentals, setRentals] = useState<ApiChairRental[]>([]);
  const [myRequests, setMyRequests] = useState<ApiChairRentalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<Filters>(EMPTY_FILTERS);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      chairRentals.list({
        space_type: filters.space_type || undefined,
        min_price: filters.min_price ? parseFloat(filters.min_price) : undefined,
        max_price: filters.max_price ? parseFloat(filters.max_price) : undefined,
        equipment: filters.equipment.length ? filters.equipment : undefined,
      }),
      chairRentals.myRequestsSent(),
    ]).then(([r, rr]) => {
      setRentals(r);
      setMyRequests(rr);
    }).finally(() => setLoading(false));
  }, [user, filters]);

  const filtered = rentals.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      (r.salon?.name ?? '').toLowerCase().includes(q) ||
      (r.city ?? '').toLowerCase().includes(q)
    );
  });

  const getMyRequest = (id: number) => myRequests.find((r) => r.chair_rental_id === id);
  const activeFilterCount = (filters.space_type ? 1 : 0) + (filters.min_price ? 1 : 0) + (filters.max_price ? 1 : 0) + filters.equipment.length;

  function openFilters() { setDraftFilters(filters); setFiltersOpen(true); }
  function applyFilters() { setFilters(draftFilters); setFiltersOpen(false); }
  function resetFilters() { setDraftFilters(EMPTY_FILTERS); }

  if (isLoading || loading) {
    return <div className="min-h-screen bg-neutral-50 flex items-center justify-center"><div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-6">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-neutral-900">Fauteuils à louer</h1>
          <p className="text-xs text-neutral-400 mt-0.5">{filtered.length} annonce{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par ville, salon..."
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-neutral-200 rounded-2xl text-sm focus:outline-none focus:border-neutral-800 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                <X size={13} />
              </button>
            )}
          </div>
          <button
            onClick={openFilters}
            className={`relative before:absolute before:-inset-[2px] before:content-[''] flex items-center justify-center w-10 h-10 rounded-2xl border transition-colors flex-shrink-0 ${
              activeFilterCount > 0 ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white border-neutral-200 text-neutral-500'
            }`}
            aria-label="Filtres"
          >
            <SlidersHorizontal size={15} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>
          <div className="flex bg-neutral-100 rounded-2xl p-1 gap-1 flex-shrink-0">
            <button onClick={() => setView('list')}
              className={`flex items-center justify-center w-11 h-11 rounded-xl transition-colors ${view === 'list' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}
              aria-label="Vue liste">
              <List size={15} />
            </button>
            <button onClick={() => setView('map')}
              className={`flex items-center justify-center w-11 h-11 rounded-xl transition-colors ${view === 'map' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}
              aria-label="Vue carte — fauteuils uniquement, jamais la carte de recherche client">
              <MapIcon size={15} />
            </button>
          </div>
        </div>

        {view === 'map' ? (
          <div>
            {/* La carte reste toujours montée en vue carte, même à 0 résultat —
                sinon l'utilisateur qui tape sur "carte" ne voit jamais la carte
                elle-même et croit qu'elle est cassée. */}
            <div className="rounded-2xl overflow-hidden border border-neutral-100 h-[45vh] mb-3">
              <ChairSearchMap
                items={filtered
                  .filter((r) => r.latitude != null && r.longitude != null)
                  .map((r) => ({ id: r.id, lat: r.latitude!, lng: r.longitude!, pricePerDay: r.price_per_day ?? undefined }))}
                selectedId={selectedId}
                onSelect={setSelectedId}
                initialCenter={DEFAULT_MAP_CENTER}
                initialZoom={DEFAULT_MAP_ZOOM}
              />
            </div>
            {filtered.length === 0 ? (
              <div className="bg-white rounded-[24px] shadow-[0_4px_18px_-8px_rgba(10,10,10,0.08)] ring-1 ring-neutral-100 p-8 text-center">
                <Armchair size={32} className="text-neutral-200 mx-auto mb-2.5" />
                <p className="text-sm font-semibold text-neutral-700">Aucune annonce disponible</p>
                <p className="text-xs text-neutral-400 mt-1">Revenez plus tard ou modifiez vos filtres.</p>
              </div>
            ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
              {filtered.map((r) => {
                const firstPhoto = r.photos?.[0];
                const isSelected = selectedId === r.id;
                return (
                  <div key={r.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(r.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') setSelectedId(r.id); }}
                    className={`flex-shrink-0 w-56 text-left bg-white rounded-[20px] overflow-hidden snap-start transition-all cursor-pointer shadow-[0_4px_16px_-8px_rgba(10,10,10,0.1)] ${isSelected ? 'ring-2 ring-neutral-900' : 'ring-1 ring-neutral-100'}`}
                  >
                    <div className="relative aspect-video bg-neutral-100">
                      {firstPhoto
                        ? <Image src={resolveMediaUrl(firstPhoto) ?? firstPhoto} alt={r.title} fill className="object-cover" sizes="224px" />
                        : <div className="absolute inset-0 flex items-center justify-center"><Camera size={20} className="text-neutral-300" /></div>
                      }
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-bold text-neutral-900 truncate">{r.title}</p>
                      <p className="text-[11px] text-neutral-400 truncate mb-1">{r.salon?.name ?? 'Salon'}{r.city ? ` · ${r.city}` : ''}</p>
                      {r.price_per_day != null && <p className="text-xs font-semibold text-neutral-900">{r.price_per_day}€/j</p>}
                      {/* Navigation interne : target="_blank" éjecterait vers Safari
                          dans l'app Capacitor, où l'utilisateur n'est pas connecté. */}
                      <Link href={`/fauteuil/${r.slug}`}
                        className="mt-1.5 block w-full text-center text-[11px] font-semibold text-neutral-600 border border-neutral-200 rounded-lg py-1.5 hover:bg-neutral-50 transition-colors">
                        Voir l&apos;annonce
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-[28px] shadow-[0_4px_18px_-8px_rgba(10,10,10,0.08)] ring-1 ring-neutral-100 p-12 text-center">
            <Armchair size={36} className="text-neutral-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-neutral-700">Aucune annonce disponible</p>
            <p className="text-xs text-neutral-400 mt-1">Revenez plus tard ou modifiez vos filtres.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((r) => {
              const firstPhoto = r.photos?.[0];
              const myReq = getMyRequest(r.id);
              const badge = myReq ? REQUEST_BADGE[myReq.status] : null;
              return (
                <Link key={r.id} href={`/fauteuil/${r.slug}`}
                  className="text-left bg-white rounded-[22px] shadow-[0_4px_16px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-100 overflow-hidden hover:shadow-[0_10px_28px_-10px_rgba(10,10,10,0.2)] transition-shadow">
                  <div className="relative aspect-video bg-neutral-100">
                    {firstPhoto
                      ? <Image src={resolveMediaUrl(firstPhoto) ?? firstPhoto} alt={r.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 320px" />
                      : <div className="absolute inset-0 flex items-center justify-center"><Camera size={24} className="text-neutral-300" /></div>
                    }
                    {(r.photos?.length ?? 0) > 1 && (
                      <span className="absolute top-2 right-2 text-[9px] bg-black/50 text-white px-1.5 py-0.5 rounded-full font-semibold">
                        {r.photos!.length} photos
                      </span>
                    )}
                    {badge && (
                      <span className={`absolute top-2 left-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${badge.cls}`}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-bold text-neutral-900 line-clamp-1 mb-1">{r.title}</p>
                    <div className="flex items-center gap-1 text-xs text-neutral-500 mb-2">
                      <MapPin size={9} />
                      <span className="truncate">{r.salon?.name ?? 'Salon'}{r.city ? ` · ${r.city}` : ''}</span>
                    </div>
                    <div className="flex items-end gap-2">
                      {r.price_per_day != null && <div><span className="text-base font-bold text-neutral-900">{r.price_per_day}€</span><span className="text-[10px] text-neutral-400"> /j</span></div>}
                      {r.price_per_week != null && <div><span className="text-sm font-semibold text-neutral-700">{r.price_per_week}€</span><span className="text-[10px] text-neutral-400"> /sem.</span></div>}
                      {r.price_per_month != null && <div><span className="text-sm font-semibold text-neutral-700">{r.price_per_month}€</span><span className="text-[10px] text-neutral-400"> /mois</span></div>}
                    </div>
                    {(r.available_days?.length ?? 0) > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {r.available_days!.slice(0, 4).map((d) => (
                          <span key={d} className="text-[9px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded-full font-medium">{DAY_LABELS[d]}</span>
                        ))}
                        {r.available_days!.length > 4 && <span className="text-[9px] text-neutral-400">+{r.available_days!.length - 4}</span>}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <OwnerBottomSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtres">
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold text-neutral-700 mb-2">Type d’espace</p>
            <div className="flex flex-wrap gap-1.5">
              {CHAIR_SPACE_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setDraftFilters((f) => ({ ...f, space_type: f.space_type === value ? '' : value }))}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                    draftFilters.space_type === value ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white border-neutral-200 text-neutral-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-neutral-700 mb-2">Prix / jour</p>
            <div className="flex items-center gap-2">
              <input type="number" min="0" placeholder="Min" value={draftFilters.min_price}
                onChange={(e) => setDraftFilters((f) => ({ ...f, min_price: e.target.value }))}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400" />
              <span className="text-neutral-300">—</span>
              <input type="number" min="0" placeholder="Max" value={draftFilters.max_price}
                onChange={(e) => setDraftFilters((f) => ({ ...f, max_price: e.target.value }))}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400" />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-neutral-700 mb-2">Équipements</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(CHAIR_EQUIPMENT_LABELS) as ChairEquipmentKey[]).map((key) => {
                const active = draftFilters.equipment.includes(key);
                return (
                  <button
                    key={key}
                    onClick={() => setDraftFilters((f) => ({
                      ...f,
                      equipment: active ? f.equipment.filter((k) => k !== key) : [...f.equipment, key],
                    }))}
                    className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                      active ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white border-neutral-200 text-neutral-600'
                    }`}
                  >
                    {active && <Check size={10} />}{CHAIR_EQUIPMENT_LABELS[key]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={resetFilters} className="flex-1 py-3 text-sm font-semibold text-neutral-600 border border-neutral-200 rounded-2xl hover:bg-neutral-50 transition-colors">
              Réinitialiser
            </button>
            <button onClick={applyFilters} className="flex-1 py-3 text-sm font-semibold bg-neutral-900 text-white rounded-2xl hover:bg-neutral-700 transition-colors">
              Voir les résultats
            </button>
          </div>
        </div>
      </OwnerBottomSheet>
    </div>
  );
}
