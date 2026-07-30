'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import BottomSheet from '@/components/ui/BottomSheet';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getUserGeo, RADIUS_TIERS } from '@/lib/homeFilters';
import { leaderboard, api } from '@/lib/api';
import type { ApiLeaderboard, ApiLeaderboardEntry, ApiSpecialty, ApiSpecialtyLeaderboard, ApiSpecialtyLeaderboardEntry } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/types';
import {
  Trophy, Star, BadgeCheck, Search, X, ChevronRight,
  HelpCircle, RotateCcw, WifiOff, Crown,
} from 'lucide-react';
import { FilterChip as SharedFilterChip } from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/Button';
import { Skeleton, SkeletonCircle, SkeletonText } from '@/components/ui/Skeleton';

// ── Type d'entrée normalisé pour l'affichage — les deux endpoints backend
// (global / par spécialité) renvoient des formes différentes, unifiées ici
// pour que le podium et la liste n'aient qu'un seul type à gérer. ──────────
interface DisplayEntry {
  rank: number;
  id: number;
  slug: string;
  name: string;
  avatar: string | null;
  city: string | null;
  metaLabel: string | null;   // spécialité (mode global) ou niveau (mode spécialité)
  ratingLabel: string | null; // "4,9 · 86 avis" — seulement quand la donnée existe réellement
  isVerified: boolean;
}

function fromGlobal(e: ApiLeaderboardEntry): DisplayEntry {
  return {
    rank: e.rank, id: e.id, slug: e.slug, name: e.name, avatar: e.avatar, city: e.city,
    metaLabel: e.specialty,
    ratingLabel: e.avg_rating > 0 ? `${e.avg_rating.toFixed(1)} · ${e.reviews_count} avis` : null,
    isVerified: e.is_verified,
  };
}

function fromSpecialty(e: ApiSpecialtyLeaderboardEntry): DisplayEntry {
  return {
    rank: e.rank, id: e.id, slug: e.slug, name: e.name, avatar: e.avatar, city: e.city,
    metaLabel: e.is_reference ? 'Référence — Top 1%' : e.level_name,
    ratingLabel: null,
    isVerified: e.is_verified,
  };
}

function buildTitle(specialtyName: string | null, geoValue: string, autoGeoLabel: string | null): { title: string; subtitle: string } {
  // Recherche manuelle (geoValue tapé) toujours prioritaire sur la
  // localisation automatique du compte (autoGeoLabel) pour l'affichage.
  const localizedSubtitle = geoValue ? `à ${geoValue}` : autoGeoLabel ? `Coiffeurs ${autoGeoLabel}` : null;
  if (specialtyName && localizedSubtitle) return { title: `Meilleurs coiffeurs en ${specialtyName}`, subtitle: localizedSubtitle };
  if (specialtyName) return { title: `Meilleurs coiffeurs en ${specialtyName}`, subtitle: 'Toute la communauté CHAIR' };
  if (localizedSubtitle) return { title: 'Les mieux classés', subtitle: localizedSubtitle };
  return { title: 'Les meilleurs coiffeurs', subtitle: 'Découvrez les professionnels les mieux notés de la communauté CHAIR.' };
}

// ── Barre de recherche géo — texte libre, jamais pré-rempli ────────────────
function GeoSearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onChange(draft.trim()); }}
      className="relative"
    >
      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onChange(draft.trim())}
        placeholder="Rechercher une ville, une région ou un département"
        className="w-full pl-11 pr-9 py-3.5 bg-neutral-100 rounded-2xl text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-neutral-300 transition-all"
      />
      {draft && (
        <button
          type="button"
          onClick={() => { setDraft(''); onChange(''); }}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
        >
          <X size={15} />
        </button>
      )}
    </form>
  );
}

// ── Bottom sheet spécialité ─────────────────────────────────────────────
function SpecialtySheet({
  specialties, selectedId, onSelect, onClose,
}: { specialties: ApiSpecialty[]; selectedId: number | null; onSelect: (id: number | null) => void; onClose: () => void }) {
  return (
    <BottomSheet onClose={onClose} maxHeight="max-h-[75vh]">
      <div className="p-5 pb-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[16px] font-bold text-neutral-900">Spécialité</p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100">
            <X size={15} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => { onSelect(null); onClose(); }}
            className={`text-left px-4 py-3 rounded-2xl text-[13px] font-semibold border transition-all ${
              selectedId === null ? 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-200 text-neutral-700 hover:border-neutral-400'
            }`}
          >
            Toutes spécialités
          </button>
          {specialties.map((s) => (
            <button
              key={s.id}
              onClick={() => { onSelect(s.id); onClose(); }}
              className={`text-left px-4 py-3 rounded-2xl text-[13px] font-semibold border transition-all ${
                selectedId === s.id ? 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-200 text-neutral-700 hover:border-neutral-400'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}

// ── Bottom sheet explication ────────────────────────────────────────────
function ExplainSheet({ onClose }: { onClose: () => void }) {
  const points = [
    'La qualité et la quantité des avis certifiés (un avis isolé ne suffit jamais à dépasser un profil avec beaucoup d\'avis constants).',
    'L\'activité récente et la régularité des publications.',
    'La qualité du profil et du portfolio.',
    'La pertinence dans la spécialité choisie.',
    'La zone géographique lorsqu\'un filtre local est appliqué.',
  ];
  return (
    <BottomSheet onClose={onClose}>
      <div className="p-5 pb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[16px] font-bold text-neutral-900">Comment fonctionne le classement ?</p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 flex-shrink-0">
            <X size={15} />
          </button>
        </div>
        <p className="text-[13px] text-neutral-500 mb-4 leading-relaxed">
          La position d&apos;un coiffeur dépend de plusieurs signaux combinés, pas d&apos;un seul chiffre :
        </p>
        <ul className="space-y-2.5 mb-4">
          {points.map((p, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13px] text-neutral-700">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 mt-1.5 flex-shrink-0" />
              {p}
            </li>
          ))}
        </ul>
        <p className="text-[12px] text-neutral-400 leading-relaxed">
          Les nouveaux talents avec une activité forte peuvent progresser rapidement — l&apos;ancienneté seule ne garantit pas une bonne place.
        </p>
      </div>
    </BottomSheet>
  );
}

// ── Podium (top 3) — hiérarchie réelle (hauteur + ton or/argent/bronze),
// pas juste trois cartes identiques avec un chiffre différent. ────────────
const RANK_RING: Record<number, string> = {
  1: 'ring-2 ring-amber-300',
  2: 'ring-2 ring-neutral-300',
  3: 'ring-2 ring-orange-300',
};
const RANK_BADGE: Record<number, string> = {
  1: 'bg-amber-400 text-white',
  2: 'bg-neutral-300 text-white',
  3: 'bg-orange-400 text-white',
};
const PODIUM_STEP_HEIGHT: Record<number, string> = {
  1: 'pt-7',
  2: 'pt-3',
  3: 'pt-1',
};

function PodiumCard({ entry, size }: { entry: DisplayEntry; size: 'lg' | 'sm' }) {
  const avatar = resolveMediaUrl(entry.avatar);
  const initial = (entry.name ?? '?').charAt(0).toUpperCase();
  const isFirst = size === 'lg';

  return (
    <Link
      href={`/coiffeur/${entry.slug}`}
      className={`relative flex flex-col items-center text-center bg-white rounded-2xl border border-neutral-100 hover:border-neutral-300 hover:shadow-md active:scale-[0.97] transition-all min-w-0 ${PODIUM_STEP_HEIGHT[entry.rank] ?? ''} ${
        isFirst ? 'px-4 pb-5 flex-[1.15]' : 'px-3 pb-3.5 flex-1'
      }`}
    >
      {isFirst && (
        <Crown size={18} className="text-amber-400 fill-amber-400 mb-1" strokeWidth={1.5} />
      )}
      <div className="relative mb-2">
        <div className={`relative rounded-full overflow-hidden bg-neutral-200 flex items-center justify-center ${RANK_RING[entry.rank] ?? ''} ${isFirst ? 'w-20 h-20' : 'w-14 h-14'}`}>
          {avatar ? (
            <Image src={avatar} alt={entry.name} fill className="object-cover" sizes="80px" />
          ) : (
            <span className={`font-bold text-neutral-500 ${isFirst ? 'text-2xl' : 'text-lg'}`}>{initial}</span>
          )}
        </div>
        <span className={`absolute -bottom-1 -right-1 flex items-center justify-center rounded-full font-bold border-2 border-white ${RANK_BADGE[entry.rank] ?? 'bg-neutral-100 text-neutral-600'} ${isFirst ? 'w-7 h-7 text-[12px]' : 'w-6 h-6 text-[11px]'}`}>
          {entry.rank}
        </span>
      </div>
      <p className={`font-bold text-neutral-900 w-full flex items-center justify-center gap-1 min-w-0 ${isFirst ? 'text-[14px]' : 'text-[12px]'}`}>
        <span className="truncate">{entry.name}</span>
        {entry.isVerified && <BadgeCheck size={isFirst ? 13 : 11} className="text-neutral-900 flex-shrink-0" />}
      </p>
      {entry.city && <p className={`text-neutral-400 truncate w-full ${isFirst ? 'text-[11px]' : 'text-[10px]'} mt-0.5`}>{entry.city}</p>}
      {entry.metaLabel && (
        <span className={`mt-1.5 inline-block px-2 py-0.5 rounded-full font-semibold truncate max-w-full ${isFirst ? 'text-[10px]' : 'text-[9px]'} bg-neutral-100 text-neutral-600`}>
          {entry.metaLabel}
        </span>
      )}
      {entry.ratingLabel && (
        <p className={`mt-1 font-semibold text-neutral-700 flex items-center gap-1 ${isFirst ? 'text-[11px]' : 'text-[10px]'}`}>
          <Star size={isFirst ? 10 : 9} className="fill-amber-400 text-amber-400" />{entry.ratingLabel}
        </p>
      )}
    </Link>
  );
}

// ── Ligne de liste (rang 4+) ────────────────────────────────────────────
function RankRow({ entry, isMe }: { entry: DisplayEntry; isMe?: boolean }) {
  const avatar = resolveMediaUrl(entry.avatar);
  const initial = (entry.name ?? '?').charAt(0).toUpperCase();

  return (
    <Link
      href={`/coiffeur/${entry.slug}`}
      className={`flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 active:bg-neutral-100 transition-colors ${isMe ? 'bg-neutral-900/[0.03] ring-1 ring-inset ring-neutral-300' : ''}`}
    >
      <span className="w-7 text-center text-[13px] font-bold text-neutral-400 flex-shrink-0">{entry.rank}</span>
      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-200 flex items-center justify-center flex-shrink-0">
        {avatar ? <Image src={avatar} alt={entry.name} fill className="object-cover" sizes="40px" /> : <span className="text-sm font-bold text-neutral-500">{initial}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-semibold text-neutral-900 truncate">{entry.name}</p>
          {isMe && <span className="text-[9px] font-bold uppercase tracking-wide text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded-full flex-shrink-0">Vous</span>}
          {entry.isVerified && <BadgeCheck size={11} className="text-neutral-900 flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 truncate">
          {entry.metaLabel && <span className="truncate">{entry.metaLabel}</span>}
          {entry.metaLabel && entry.city && <span>·</span>}
          {entry.city && <span>{entry.city}</span>}
        </div>
      </div>
      {entry.ratingLabel && (
        <div className="text-right flex-shrink-0">
          <p className="text-[12px] font-bold text-neutral-900 flex items-center gap-0.5"><Star size={10} className="fill-amber-400 text-amber-400" />{entry.ratingLabel.split(' · ')[0]}</p>
          <p className="text-[10px] text-neutral-400">{entry.ratingLabel.split(' · ')[1]}</p>
        </div>
      )}
      <ChevronRight size={14} className="text-neutral-200 flex-shrink-0" />
    </Link>
  );
}

export default function ClassementsPage() {
  const { user } = useAuth();
  const myProfileId = user?.hairdresser_profile?.id ?? null;

  const [geoValue, setGeoValue]         = useState('');
  const [specialtyId, setSpecialtyId]   = useState<number | null>(null);
  const [sortType, setSortType]         = useState<'engagement' | 'reviews' | 'progression'>('engagement');
  const [specialties, setSpecialties]   = useState<ApiSpecialty[]>([]);
  const [sheetOpen, setSheetOpen]       = useState<'specialty' | 'explain' | null>(null);

  const [globalData, setGlobalData]       = useState<ApiLeaderboard | null>(null);
  const [specialtyData, setSpecialtyData] = useState<ApiSpecialtyLeaderboard | null>(null);
  const [loading, setLoading]             = useState(true);
  const [loadError, setLoadError]         = useState(false);
  // Distinct de geoValue (recherche manuelle tapée) — reflète juste QUEL rayon
  // de la localisation automatique du compte a fini par renvoyer un résultat,
  // pour le sous-titre ("près de chez vous" / "dans votre région").
  const [autoGeoLabel, setAutoGeoLabel]   = useState<string | null>(null);

  useEffect(() => {
    api.get<ApiSpecialty[]>('/specialties').then(setSpecialties).catch(() => {});
  }, []);

  // Par défaut (aucune recherche manuelle), le classement est localisé sur la
  // position réelle du compte — jamais un classement France entière tant
  // qu'un rayon plus proche a des résultats (50km, puis élargi ~régional).
  async function load() {
    setLoading(true);
    setLoadError(false);
    setAutoGeoLabel(null);

    const geo = geoValue ? null : getUserGeo(user);

    try {
      if (specialtyId) {
        if (geo) {
          for (const { km, label } of RADIUS_TIERS) {
            const res = await leaderboard.bySpecialty({
              specialtyId, geo: 'radius', lat: geo.lat, lng: geo.lng, radiusKm: km, limit: 30,
            });
            if (res.results.length) {
              setSpecialtyData(res); setGlobalData(null); setAutoGeoLabel(label);
              setLoading(false);
              return;
            }
          }
        }
        const res = await leaderboard.bySpecialty({ specialtyId, geo: geoValue ? 'auto' : 'country', geoValue: geoValue || undefined, limit: 30 });
        setSpecialtyData(res); setGlobalData(null);
      } else {
        if (geo) {
          for (const { km, label } of RADIUS_TIERS) {
            const res = await leaderboard.get({ type: sortType, lat: geo.lat, lng: geo.lng, radiusKm: km, limit: 30 }) as ApiLeaderboard;
            if (res.results.length) {
              setGlobalData(res); setSpecialtyData(null); setAutoGeoLabel(label);
              setLoading(false);
              return;
            }
          }
        }
        const res = await leaderboard.get({ type: sortType, city: geoValue || undefined, limit: 30 }) as ApiLeaderboard;
        setGlobalData(res); setSpecialtyData(null);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialtyId, geoValue, sortType, user]);

  const specialtyName = specialtyId ? (specialties.find((s) => s.id === specialtyId)?.name ?? null) : null;
  const { title, subtitle } = buildTitle(specialtyName, geoValue, autoGeoLabel);

  const entries: DisplayEntry[] = useMemo(() => {
    if (specialtyData) return specialtyData.results.map(fromSpecialty);
    if (globalData) return globalData.results.map(fromGlobal);
    return [];
  }, [specialtyData, globalData]);

  const podium = entries.slice(0, 3);
  const rest   = entries.slice(3);
  const hasActiveFilters = !!geoValue || !!specialtyId || sortType !== 'engagement';

  function resetFilters() {
    setGeoValue('');
    setSpecialtyId(null);
    setSortType('engagement');
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto pb-28 md:pb-8 overflow-x-hidden">
        {/* Header */}
        <div className="px-4 pt-6 pb-4">
          <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-neutral-400 mb-1 flex items-center gap-1.5">
            <Trophy size={11} className="text-amber-500" />CHAIR
          </p>
          <h1 className="text-[24px] font-bold text-neutral-900 tracking-tight">{title}</h1>
          <p className="text-[13px] text-neutral-400 mt-1">{subtitle}</p>
        </div>

        {/* Recherche géo */}
        <div className="px-4 mb-3">
          <GeoSearchBar value={geoValue} onChange={setGeoValue} />
        </div>

        {/* Chips filtres */}
        <div className="px-4 mb-3 flex gap-2 overflow-x-auto no-scrollbar">
          <SharedFilterChip active={!!specialtyId} onClick={() => setSheetOpen('specialty')}>
            {specialtyName ? specialtyName : 'Spécialité'}
          </SharedFilterChip>
          {!specialtyId && (
            <>
              <SharedFilterChip active={sortType === 'reviews'} onClick={() => setSortType((t) => t === 'reviews' ? 'engagement' : 'reviews')}>
                Mieux notés
              </SharedFilterChip>
              <SharedFilterChip active={sortType === 'progression'} onClick={() => setSortType((t) => t === 'progression' ? 'engagement' : 'progression')}>
                Nouveaux talents
              </SharedFilterChip>
            </>
          )}
        </div>

        {/* Filtres actifs + reset */}
        {hasActiveFilters && (
          <div className="px-4 mb-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {geoValue && (
              <SharedFilterChip active onClick={() => setGeoValue('')} aria-label={`Retirer le filtre ${geoValue}`}>
                {geoValue}
                <X size={12} className="text-neutral-400" />
              </SharedFilterChip>
            )}
            {specialtyName && (
              <SharedFilterChip active onClick={() => setSpecialtyId(null)} aria-label={`Retirer le filtre ${specialtyName}`}>
                {specialtyName}
                <X size={12} className="text-neutral-400" />
              </SharedFilterChip>
            )}
            {sortType !== 'engagement' && (
              <SharedFilterChip
                active
                onClick={() => setSortType('engagement')}
                aria-label={`Retirer le filtre ${sortType === 'reviews' ? 'Mieux notés' : 'Nouveaux talents'}`}
              >
                {sortType === 'reviews' ? 'Mieux notés' : 'Nouveaux talents'}
                <X size={12} className="text-neutral-400" />
              </SharedFilterChip>
            )}
            <button onClick={resetFilters} className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-400 hover:text-neutral-700 transition-colors px-1">
              <RotateCcw size={11} />Réinitialiser
            </button>
          </div>
        )}

        {/* Comment ça marche */}
        <div className="px-4 mb-4">
          <button onClick={() => setSheetOpen('explain')} className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-neutral-600 transition-colors">
            <HelpCircle size={12} />Comment fonctionne le classement ?
          </button>
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="px-4 space-y-3">
            <div className="flex items-end gap-2">
              <Skeleton className="flex-1 h-32" />
              <Skeleton className="flex-[1.15] h-40" />
              <Skeleton className="flex-1 h-28" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <SkeletonCircle />
                <div className="flex-1"><SkeletonText width="w-32" /></div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="px-4">
            <div className="bg-white rounded-2xl border border-neutral-100">
              <EmptyState
                icon={WifiOff}
                title="Impossible de charger le classement"
                subtitle="Vérifiez votre connexion et réessayez."
                action={<PrimaryButton size="sm" onClick={load}>Réessayer</PrimaryButton>}
              />
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div className="px-4">
            <div className="bg-white rounded-2xl border border-neutral-100">
              {hasActiveFilters ? (
                <EmptyState
                  icon={Trophy}
                  title="Aucun coiffeur ne correspond à ces filtres"
                  subtitle="Élargissez la zone ou retirez la spécialité."
                  action={<PrimaryButton size="sm" onClick={resetFilters}>Réinitialiser les filtres</PrimaryButton>}
                />
              ) : (
                <EmptyState
                  icon={Trophy}
                  title="Pas encore assez de données"
                  subtitle="Le classement sera disponible dès que suffisamment d'avis certifiés auront été publiés."
                />
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Podium */}
            {podium.length > 0 && (
              <div className="px-4 mb-4 flex items-end gap-2">
                {podium[1] && <PodiumCard entry={podium[1]} size="sm" />}
                {podium[0] && <PodiumCard entry={podium[0]} size="lg" />}
                {podium[2] && <PodiumCard entry={podium[2]} size="sm" />}
              </div>
            )}

            {/* Liste */}
            {rest.length > 0 && (
              <div className="border-t border-neutral-100">
                <div className="divide-y divide-neutral-50">
                  {rest.map((entry) => (
                    <RankRow key={entry.id} entry={entry} isMe={entry.id === myProfileId} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {sheetOpen === 'specialty' && (
        <SpecialtySheet specialties={specialties} selectedId={specialtyId} onSelect={setSpecialtyId} onClose={() => setSheetOpen(null)} />
      )}
      {sheetOpen === 'explain' && <ExplainSheet onClose={() => setSheetOpen(null)} />}
    </AppShell>
  );
}
