'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import BottomSheet from '@/components/ui/BottomSheet';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getUserGeo } from '@/lib/homeFilters';
import { getRankingRadiusTiers } from '@/lib/appConfig';
import { leaderboard, api } from '@/lib/api';
import type { ApiLeaderboard, ApiLeaderboardEntry, ApiSpecialty, ApiSpecialtyLeaderboard, ApiSpecialtyLeaderboardEntry } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/types';
import {
  Trophy, Star, BadgeCheck, Search, X, ChevronRight,
  HelpCircle, RotateCcw, WifiOff, Crown, MapPin, Check,
} from 'lucide-react';
import { SPECIALTY_ILLUSTRATIONS, HOMME_SPECIALTY_SLUGS } from '@/lib/specialties';
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
  isChairPlus: boolean;
}

function fromGlobal(e: ApiLeaderboardEntry): DisplayEntry {
  return {
    rank: e.rank, id: e.id, slug: e.slug, name: e.name, avatar: e.avatar, city: e.city,
    metaLabel: e.specialty,
    ratingLabel: e.avg_rating > 0 ? `${e.avg_rating.toFixed(1)} · ${e.reviews_count} avis` : null,
    isVerified: e.is_verified,
    isChairPlus: !!e.is_chair_plus,
  };
}

function fromSpecialty(e: ApiSpecialtyLeaderboardEntry): DisplayEntry {
  return {
    rank: e.rank, id: e.id, slug: e.slug, name: e.name, avatar: e.avatar, city: e.city,
    metaLabel: e.is_reference ? 'Référence — Top 1%' : e.level_name,
    ratingLabel: null,
    isVerified: e.is_verified,
    isChairPlus: !!e.is_chair_plus,
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
        className="w-full pl-11 pr-9 py-3.5 bg-white shadow-[0_2px_10px_-4px_rgba(10,10,10,0.1)] ring-1 ring-neutral-100 rounded-2xl text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-neutral-300 transition-all"
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

// ── Bottom sheet spécialité — tuiles PHOTO, triées Homme/Femme ────────────
// Même langage visuel que le filtre de la recherche (SpecialtyTile) : la photo
// live administrable (Specialty.image_url) prime, l'illustration d'onboarding
// sert de repli. Un choix de spécialité est un choix VISUEL — une liste de
// libellés nus obligeait à connaître le jargon (retour Julien).

function specialtyImage(s: ApiSpecialty): string | null {
  return resolveMediaUrl(s.image_url) ?? SPECIALTY_ILLUSTRATIONS[s.slug] ?? null;
}

function specialtyGender(s: ApiSpecialty): 'homme' | 'femme' {
  const cat = (s.category ?? '').toLowerCase();
  if (cat.includes('homme')) return 'homme';
  if (cat.includes('femme')) return 'femme';
  return HOMME_SPECIALTY_SLUGS.includes(s.slug) ? 'homme' : 'femme';
}

function SpecialtyPhotoTile({ s, active, onClick }: { s: ApiSpecialty; active: boolean; onClick: () => void }) {
  const img = specialtyImage(s);
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className="flex flex-col items-center gap-1.5 min-w-0 active:scale-[0.94] transition-transform"
    >
      <span
        className={`relative w-[64px] h-[64px] rounded-2xl overflow-hidden bg-neutral-100 flex items-center justify-center transition-shadow ${
          active ? 'ring-[2.5px] ring-neutral-900 ring-offset-2 ring-offset-white' : 'ring-1 ring-neutral-200'
        }`}
      >
        {img ? (
          <Image src={img} alt="" fill className="object-cover" sizes="64px" />
        ) : (
          <span className="text-[15px] font-bold text-neutral-400">{s.name.charAt(0)}</span>
        )}
        {active && (
          <span className="absolute inset-0 bg-neutral-900/35 flex items-center justify-center">
            <Check size={20} className="text-white" strokeWidth={3} />
          </span>
        )}
      </span>
      <span className={`text-[10.5px] leading-tight text-center w-full line-clamp-2 ${active ? 'font-bold text-neutral-900' : 'font-medium text-neutral-500'}`}>
        {s.name}
      </span>
    </button>
  );
}

function SpecialtySheet({
  specialties, selectedId, onSelect, onClose,
}: { specialties: ApiSpecialty[]; selectedId: number | null; onSelect: (id: number | null) => void; onClose: () => void }) {
  const groups: Array<{ label: string; items: ApiSpecialty[] }> = [
    { label: 'Homme', items: specialties.filter((s) => specialtyGender(s) === 'homme') },
    { label: 'Femme', items: specialties.filter((s) => specialtyGender(s) === 'femme') },
  ].filter((g) => g.items.length > 0);

  return (
    // PAS de conteneur scrollable ici : BottomSheet possède déjà LE conteneur
    // de scroll, et son geste tirer-pour-fermer surveille ce conteneur-là. Un
    // second overflow-y-auto imbriqué le rendait aveugle (scrollTop externe
    // toujours à 0) : chaque tentative de faire défiler la grille armait la
    // fermeture à la place — la sheet était inscrollable (bug réel constaté).
    <BottomSheet onClose={onClose} maxHeight="max-h-[82vh]">
      <div className="p-5 pb-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[16px] font-bold text-neutral-900">Spécialité</p>
          <button onClick={onClose} aria-label="Fermer" className="w-11 h-11 -m-1.5 flex items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100">
            <X size={16} />
          </button>
        </div>

        <button
          onClick={() => { onSelect(null); onClose(); }}
          className={`w-full mb-5 px-4 py-3 rounded-2xl text-[13px] font-semibold border transition-all ${
            selectedId === null ? 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-200 text-neutral-700 hover:border-neutral-400'
          }`}
        >
          Toutes les spécialités
        </button>

        {groups.map((g) => (
          <div key={g.label} className="mb-5 last:mb-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-3">{g.label}</p>
            <div className="grid grid-cols-4 gap-x-2 gap-y-4">
              {g.items.map((s) => (
                <SpecialtyPhotoTile
                  key={s.id}
                  s={s}
                  active={selectedId === s.id}
                  onClick={() => { onSelect(s.id); onClose(); }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}

// ── Bottom sheet rayon — classement autour de la ville du compte ──────────
// Le rayon s'applique à la position de la VILLE du compte (jamais le GPS de
// l'appareil — cohérent avec la politique de confidentialité). 'auto' garde le
// comportement historique : paliers intelligents qui s'élargissent jusqu'à
// trouver des résultats.
export type RadiusChoice = 'auto' | 25 | 50 | 100 | 'france';

const RADIUS_OPTIONS: Array<{ value: RadiusChoice; label: string; hint: string }> = [
  { value: 'auto',   label: 'Autour de moi',    hint: 'Zone élargie automatiquement si besoin' },
  { value: 25,       label: '25 km',            hint: 'Tout proche' },
  { value: 50,       label: '50 km',            hint: 'Ta ville et ses alentours' },
  { value: 100,      label: '100 km',           hint: 'Ta grande région' },
  { value: 'france', label: 'Toute la France',  hint: 'Le classement national' },
];

// Libellé COURT — le chip est un bouton, pas un panneau d'information : la
// zone active complète (« à moins de 25 km de Toulouse ») vit déjà dans le
// sous-titre de la page. « Autour de Toulouse » dans un chip cassait la
// rangée (retour Julien).
function radiusChipLabel(choice: RadiusChoice): string {
  if (choice === 'auto') return 'Distance';
  if (choice === 'france') return 'France';
  return `${choice} km`;
}

function RadiusSheet({
  choice, city, onSelect, onClose,
}: { choice: RadiusChoice; city: string | null; onSelect: (c: RadiusChoice) => void; onClose: () => void }) {
  return (
    <BottomSheet onClose={onClose}>
      <div className="p-5 pb-8">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[16px] font-bold text-neutral-900">Distance</p>
          <button onClick={onClose} aria-label="Fermer" className="w-11 h-11 -m-1.5 flex items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100">
            <X size={16} />
          </button>
        </div>
        <p className="text-[12px] text-neutral-400 mb-4">
          {city ? `Le rayon est calculé autour de ${city}, la ville de ton compte.` : 'Le rayon est calculé autour de la ville de ton compte.'}
        </p>
        <div className="space-y-1.5">
          {RADIUS_OPTIONS.map((opt) => {
            const active = choice === opt.value;
            return (
              <button
                key={String(opt.value)}
                onClick={() => { onSelect(opt.value); onClose(); }}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all ${
                  active ? 'bg-neutral-900 border-neutral-900' : 'border-neutral-200 hover:border-neutral-400'
                }`}
              >
                <span className="min-w-0">
                  <span className={`block text-[14px] font-semibold ${active ? 'text-white' : 'text-neutral-900'}`}>{opt.label}</span>
                  <span className={`block text-[11px] mt-0.5 ${active ? 'text-white/60' : 'text-neutral-400'}`}>{opt.hint}</span>
                </span>
                {active && <Check size={16} className="text-white flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </BottomSheet>
  );
}

// ── Bottom sheet explication ────────────────────────────────────────────
function ExplainSheet({ onClose }: { onClose: () => void }) {
  const points = [
    'La qualité et la quantité des avis vérifiés (un avis isolé ne suffit jamais à dépasser un profil avec beaucoup d\'avis constants).',
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
          <button onClick={onClose} className="w-8 h-8 relative before:absolute before:-inset-1.5 before:content-[''] flex items-center justify-center rounded-full bg-neutral-100 flex-shrink-0">
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
      href={`/app/coiffeur/${entry.slug}`}
      // Relief par ombre douce plutôt que bordure — même langage que le
      // reste de la home (RecommendationCard, HomeRankingSection).
      className={`relative flex flex-col items-center text-center bg-white rounded-[24px] shadow-[0_4px_16px_-6px_rgba(10,10,10,0.14)] hover:shadow-[0_10px_26px_-8px_rgba(10,10,10,0.22)] active:scale-[0.97] transition-all min-w-0 ${PODIUM_STEP_HEIGHT[entry.rank] ?? ''} ${
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
        <span className={`absolute -bottom-1 -right-1 flex items-center justify-center rounded-full font-bold border-2 border-white shadow-sm ${RANK_BADGE[entry.rank] ?? 'bg-neutral-100 text-neutral-600'} ${isFirst ? 'w-7 h-7 text-[12px]' : 'w-6 h-6 text-[11px]'}`}>
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

// ── Ligne de liste (rang 4+) — cartes individuelles avec relief, même
// langage que HomeRankingSection sur la home (plus de liste plate à traits). ─
function RankRow({ entry, isMe }: { entry: DisplayEntry; isMe?: boolean }) {
  const avatar = resolveMediaUrl(entry.avatar);
  const initial = (entry.name ?? '?').charAt(0).toUpperCase();

  return (
    <Link
      href={`/app/coiffeur/${entry.slug}`}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 shadow-[0_2px_10px_-4px_rgba(10,10,10,0.08)] hover:shadow-[0_6px_18px_-6px_rgba(10,10,10,0.14)] active:scale-[0.98] transition-all ${
        isMe ? 'bg-neutral-900/[0.03] ring-1 ring-neutral-200' : 'bg-white ring-1 ring-neutral-100'
      }`}
    >
      <span className="w-7 text-center text-[13px] font-bold text-neutral-400 flex-shrink-0">{entry.rank}</span>
      <div className="relative w-11 h-11 rounded-full overflow-hidden bg-neutral-200 flex items-center justify-center flex-shrink-0">
        {avatar ? <Image src={avatar} alt={entry.name} fill className="object-cover" sizes="44px" /> : <span className="text-sm font-bold text-neutral-500">{initial}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[14px] font-bold text-neutral-900 truncate">{entry.name}</p>
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
  const [radiusChoice, setRadiusChoice] = useState<RadiusChoice>('auto');
  const [specialties, setSpecialties]   = useState<ApiSpecialty[]>([]);
  const [sheetOpen, setSheetOpen]       = useState<'specialty' | 'radius' | 'explain' | null>(null);

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

    // Une recherche de ville tapée prime sur tout ; le choix de rayon ne vaut
    // que rapporté à la ville du COMPTE (jamais le GPS appareil). 'france'
    // ignore la géo, un rayon fixe fait UNE requête (pas de paliers), 'auto'
    // garde les paliers intelligents historiques.
    const geo = geoValue || radiusChoice === 'france' ? null : getUserGeo(user);

    // Rayon fixe choisi par l'utilisateur → une seule fenêtre, assumée même
    // vide (l'état vide propose d'élargir) ; 'auto' → paliers configurables.
    const fixedKm = typeof radiusChoice === 'number' ? radiusChoice : null;
    const radiusTiers = geo
      ? (fixedKm !== null
          ? [{ km: fixedKm, label: `à moins de ${fixedKm} km${geo.city ? ` de ${geo.city}` : ''}` }]
          : await getRankingRadiusTiers())
      : [];

    try {
      if (specialtyId) {
        if (geo) {
          for (const { km, label } of radiusTiers) {
            const res = await leaderboard.bySpecialty({
              specialtyId, geo: 'radius', lat: geo.lat, lng: geo.lng, radiusKm: km, limit: 30,
            });
            if (res.results.length || fixedKm !== null) {
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
          for (const { km, label } of radiusTiers) {
            const res = await leaderboard.get({ type: sortType, lat: geo.lat, lng: geo.lng, radiusKm: km, limit: 30 }) as ApiLeaderboard;
            if (res.results.length || fixedKm !== null) {
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
  }, [specialtyId, geoValue, sortType, radiusChoice, user]);

  const specialtyName = specialtyId ? (specialties.find((s) => s.id === specialtyId)?.name ?? null) : null;
  const { title, subtitle } = buildTitle(specialtyName, geoValue, autoGeoLabel);

  const entries: DisplayEntry[] = useMemo(() => {
    if (specialtyData) return specialtyData.results.map(fromSpecialty);
    if (globalData) return globalData.results.map(fromGlobal);
    return [];
  }, [specialtyData, globalData]);

  const podium = entries.slice(0, 3);
  const rest   = entries.slice(3);
  const hasActiveFilters = !!geoValue || !!specialtyId || sortType !== 'engagement' || radiusChoice !== 'auto';

  // Le chip Distance n'a de sens que rapporté à une origine : la ville du
  // compte. Déconnecté ou sans ville, la recherche texte reste le seul levier.
  const userGeo = getUserGeo(user);
  const canUseRadius = !!userGeo && !geoValue;

  function resetFilters() {
    setGeoValue('');
    setSpecialtyId(null);
    setSortType('engagement');
    setRadiusChoice('auto');
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

        {/* Chips filtres — UNE seule rangée, chaque chip porte son état.
            L'ancienne deuxième rangée « filtres actifs + × » répétait mot pour
            mot les chips déjà noirs juste au-dessus (retour Julien : « c'est
            guez ») : un chip actif se retire en le tapant à nouveau, la
            duplication n'apportait que du bruit. Le reset est un petit bouton
            circulaire en fin de rangée, seulement quand il a un rôle. */}
        <div className="px-4 mb-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <SharedFilterChip active={!!specialtyId} onClick={() => setSheetOpen('specialty')}>
            {specialtyName ? specialtyName : 'Spécialité'}
          </SharedFilterChip>
          {canUseRadius && (
            <SharedFilterChip active={radiusChoice !== 'auto'} onClick={() => setSheetOpen('radius')}>
              <MapPin size={12} className={radiusChoice !== 'auto' ? '' : 'text-neutral-400'} />
              {radiusChipLabel(radiusChoice)}
            </SharedFilterChip>
          )}
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
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              aria-label="Réinitialiser les filtres"
              title="Réinitialiser les filtres"
              className="flex-shrink-0 w-9 h-9 inline-flex items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-800 active:scale-90 transition-all"
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>

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
                  subtitle={typeof radiusChoice === 'number'
                    ? `Personne dans un rayon de ${radiusChoice} km — élargis la zone.`
                    : 'Élargissez la zone ou retirez la spécialité.'}
                  action={typeof radiusChoice === 'number'
                    ? <PrimaryButton size="sm" onClick={() => setRadiusChoice(radiusChoice === 25 ? 50 : radiusChoice === 50 ? 100 : 'france')}>
                        {radiusChoice === 100 ? 'Voir toute la France' : `Élargir à ${radiusChoice === 25 ? 50 : 100} km`}
                      </PrimaryButton>
                    : <PrimaryButton size="sm" onClick={resetFilters}>Réinitialiser les filtres</PrimaryButton>}
                />
              ) : (
                <EmptyState
                  icon={Trophy}
                  title="Pas encore assez de données"
                  subtitle="Le classement sera disponible dès que suffisamment d'avis vérifiés auront été publiés."
                />
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Podium — une vraie scène : les trois cartes sur leurs marches,
                posées sur un socle dégradé. C'est l'image mentale « podium »
                qui manquait — trois cartes flottantes ne racontaient pas de
                hiérarchie (retour Julien). */}
            {podium.length > 0 && (
              <div className="px-4 mb-5">
                <div className="relative rounded-[28px] bg-gradient-to-b from-neutral-50 to-neutral-100/80 ring-1 ring-neutral-100 px-3 pt-6 pb-0 overflow-hidden">
                  <div className="relative z-10 flex items-end gap-2">
                    {podium[1] && <PodiumCard entry={podium[1]} size="sm" />}
                    {podium[0] && <PodiumCard entry={podium[0]} size="lg" />}
                    {podium[2] && <PodiumCard entry={podium[2]} size="sm" />}
                  </div>
                  {/* Les marches — hauteurs 2 / 1 / 3, sous les cartes */}
                  <div className="relative z-0 flex items-end gap-2 -mt-1">
                    <div className="flex-1 h-7 rounded-t-xl bg-neutral-200/70 flex items-start justify-center pt-1">
                      <span className="text-[11px] font-black text-neutral-400">2</span>
                    </div>
                    <div className="flex-[1.15] h-11 rounded-t-xl bg-gradient-to-b from-amber-100 to-amber-50 ring-1 ring-amber-200/60 flex items-start justify-center pt-1.5">
                      <span className="text-[13px] font-black text-amber-500">1</span>
                    </div>
                    <div className="flex-1 h-5 rounded-t-xl bg-orange-100/70 flex items-start justify-center pt-0.5">
                      <span className="text-[11px] font-black text-orange-400">3</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Liste — cartes espacées plutôt que traits, même relief que le podium */}
            {rest.length > 0 && (
              <div className="px-4 pt-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-2.5 px-1">
                  Le reste du classement
                </p>
                <div className="space-y-2">
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
      {sheetOpen === 'radius' && (
        <RadiusSheet choice={radiusChoice} city={userGeo?.city ?? null} onSelect={setRadiusChoice} onClose={() => setSheetOpen(null)} />
      )}
      {sheetOpen === 'explain' && <ExplainSheet onClose={() => setSheetOpen(null)} />}
    </AppShell>
  );
}
