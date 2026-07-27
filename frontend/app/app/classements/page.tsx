'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { leaderboard, api } from '@/lib/api';
import type { ApiLeaderboard, ApiLeaderboardEntry, ApiMySpecialtyRank, ApiSpecialty, ApiSpecialtyLeaderboard, ApiSpecialtyLeaderboardEntry } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/types';
import { Trophy, Star, TrendingUp, ImageIcon, Users, BadgeCheck, Crown, Scissors, MapPin, Award, Pencil } from 'lucide-react';

const TYPES = [
  { key: 'engagement',  label: 'Engagement',   icon: Trophy,     note: 'Abonnés, avis, réalisations et activité, combinés.' },
  { key: 'reviews',     label: 'Avis',         icon: Star,       note: 'Note moyenne pondérée par le nombre d\'avis.' },
  { key: 'posts',       label: 'Réalisations', icon: ImageIcon,  note: 'Nombre de réalisations publiées.' },
  { key: 'progression', label: 'Progression',  icon: TrendingUp, note: 'Les talents qui progressent le plus vite.' },
];

const LEVEL_PILL: Record<string, string> = {
  neutral: 'bg-neutral-100 text-neutral-500',
  bronze:  'bg-amber-100 text-amber-700',
  silver:  'bg-neutral-200 text-neutral-700',
  gold:    'bg-yellow-100 text-yellow-700',
  purple:  'bg-purple-100 text-purple-700',
  diamond: 'bg-neutral-900 text-white',
};

/**
 * Pastille lieu éditable en un tap. Pas de bouton "France" séparé : le champ
 * accepte directement "France" (ou vide) pour revenir au classement national
 * — un seul endroit où taper une zone, quelle qu'elle soit.
 */
function LocationChip({ value, inputPlaceholder, onSubmit }: { value: string; inputPlaceholder: string; onSubmit: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = draft.trim();
          onSubmit(/^france$/i.test(trimmed) ? '' : trimmed);
          setEditing(false);
        }}
        className="flex gap-2 w-full"
      >
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={inputPlaceholder}
          className="flex-1 min-w-0 border border-neutral-200 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:border-neutral-400 placeholder:text-neutral-400"
        />
        <button type="submit" className="bg-neutral-900 text-white text-[12px] font-semibold px-4 py-2 rounded-xl flex-shrink-0">OK</button>
      </form>
    );
  }

  return (
    <button
      onClick={() => { setDraft(value); setEditing(true); }}
      className="inline-flex items-center gap-1.5 max-w-full text-[12px] font-semibold px-3 py-2 rounded-xl border border-neutral-200 text-neutral-700 hover:border-neutral-400 transition-all"
    >
      <MapPin size={11} className="text-neutral-400 flex-shrink-0" />
      <span className="truncate">{value || 'France entière'}</span>
      <Pencil size={10} className="text-neutral-300 flex-shrink-0" />
    </button>
  );
}

function SpecialtyLeaderboardCard({ entry, isMe }: { entry: ApiSpecialtyLeaderboardEntry; isMe?: boolean }) {
  const avatar = resolveMediaUrl(entry.avatar);
  const initial = (entry.name ?? '?').charAt(0).toUpperCase();
  const isTop3 = entry.rank <= 3;

  return (
    <Link
      href={`/coiffeur/${entry.slug}`}
      className={`flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors ${
        isMe ? 'bg-neutral-900/[0.03] ring-1 ring-inset ring-neutral-300' : entry.rank === 1 ? 'bg-yellow-50/60' : ''
      }`}
    >
      <RankBadge rank={entry.rank} />
      <div className={`relative flex-shrink-0 rounded-full overflow-hidden bg-neutral-200 flex items-center justify-center ${isTop3 ? 'w-11 h-11' : 'w-9 h-9'}`}>
        {avatar ? (
          <Image src={avatar} alt={entry.name} fill className="object-cover" sizes="44px" />
        ) : (
          <span className="text-sm font-bold text-neutral-500">{initial}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className={`font-semibold truncate ${isTop3 ? 'text-[14px]' : 'text-[13px]'} text-neutral-900`}>{entry.name}</p>
          {isMe && <span className="text-[9px] font-bold uppercase tracking-wide text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded-full flex-shrink-0">Vous</span>}
          {entry.is_verified && <BadgeCheck size={12} className="text-blue-500 flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
          {entry.city && <span>{entry.city}</span>}
          <span className={`font-bold px-1.5 py-0.5 rounded-full text-[9px] uppercase tracking-wide ${LEVEL_PILL[entry.level_color] ?? LEVEL_PILL.neutral}`}>
            {entry.is_reference ? 'Légende — Top 1%' : entry.level_name}
          </span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`font-bold ${isTop3 ? 'text-[15px] text-neutral-900' : 'text-[13px] text-neutral-600'}`}>{entry.score.toLocaleString('fr-FR')}</p>
        <p className="text-[10px] text-neutral-400">pts</p>
      </div>
    </Link>
  );
}

const RANK_COLORS: Record<number, string> = {
  1: 'text-yellow-500',
  2: 'text-neutral-400',
  3: 'text-amber-600',
};

function RankBadge({ rank }: { rank: number }) {
  const color = RANK_COLORS[rank] ?? 'text-neutral-300';
  if (rank <= 3) {
    return (
      <div className={`w-8 h-8 flex items-center justify-center`}>
        <Crown size={18} className={color} />
      </div>
    );
  }
  return (
    <span className="w-8 h-8 flex items-center justify-center text-[13px] font-bold text-neutral-400">
      {rank}
    </span>
  );
}

function LeaderboardCard({ entry }: { entry: ApiLeaderboardEntry }) {
  const avatar = resolveMediaUrl(entry.avatar);
  const initial = (entry.name ?? '?').charAt(0).toUpperCase();
  const isTop3 = entry.rank <= 3;

  return (
    <Link
      href={`/coiffeur/${entry.slug}`}
      className={`flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors ${
        entry.rank === 1 ? 'bg-yellow-50/60' : ''
      }`}
    >
      <RankBadge rank={entry.rank} />

      {/* Avatar */}
      <div className={`relative flex-shrink-0 rounded-full overflow-hidden bg-neutral-200 flex items-center justify-center ${isTop3 ? 'w-11 h-11' : 'w-9 h-9'}`}>
        {avatar ? (
          <Image src={avatar} alt={entry.name} fill className="object-cover" sizes="44px" />
        ) : (
          <span className="text-sm font-bold text-neutral-500">{initial}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className={`font-semibold truncate ${isTop3 ? 'text-[14px]' : 'text-[13px]'} text-neutral-900`}>
            {entry.name}
          </p>
          {entry.is_verified && <BadgeCheck size={12} className="text-blue-500 flex-shrink-0" />}
          {entry.identity_verified && <BadgeCheck size={12} className="text-green-500 flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
          {entry.specialty && <span>{entry.specialty}</span>}
          {entry.city && <span>· {entry.city}</span>}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-neutral-500">
          {entry.avg_rating > 0 && (
            <span className="flex items-center gap-0.5">
              <Star size={10} className="fill-amber-400 text-amber-400" />
              {entry.avg_rating.toFixed(1)} ({entry.reviews_count})
            </span>
          )}
          <span className="flex items-center gap-0.5">
            <Users size={10} />
            {entry.followers_count}
          </span>
          <span className="flex items-center gap-0.5">
            <ImageIcon size={10} />
            {entry.posts_count}
          </span>
        </div>
      </div>

      {/* Score */}
      <div className="text-right flex-shrink-0">
        <p className={`font-bold ${isTop3 ? 'text-[15px] text-neutral-900' : 'text-[13px] text-neutral-600'}`}>
          {entry.score.toLocaleString('fr-FR')}
        </p>
        <p className="text-[10px] text-neutral-400">pts</p>
      </div>
    </Link>
  );
}

export default function ClassementsPage() {
  const { user } = useAuth();
  const myProfileId = user?.hairdresser_profile?.id ?? null;

  const [mode, setMode] = useState<'global' | 'specialty'>('specialty');

  // ── Classement global ──
  const [activeType, setActiveType] = useState('engagement');
  const [city, setCity] = useState('');
  const [data, setData] = useState<ApiLeaderboard | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(type: string, cityFilter: string) {
    setLoading(true);
    try {
      const res = await leaderboard.get({ type, city: cityFilter || undefined, limit: 30 }) as ApiLeaderboard;
      setData(res);
    } catch { setData(null); }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (mode === 'global') load(activeType, city);
  }, [mode, activeType, city]);

  // ── Classement par spécialité ──
  const [specialties, setSpecialties] = useState<ApiSpecialty[]>([]);
  const [specialtyId, setSpecialtyId] = useState<number | null>(null);
  // Champ libre unique — ville, département ou région : le niveau est deviné
  // côté backend (voir SpecialtyReputationService::filterByGeo), pas choisi
  // via des boutons "Ville / Département / Région" qui n'aidaient personne.
  // Vide par défaut — jamais pré-rempli, à l'utilisateur de taper sa zone.
  const [geoValue, setGeoValue] = useState('');
  const [specialtyData, setSpecialtyData] = useState<ApiSpecialtyLeaderboard | null>(null);
  const [specialtyLoading, setSpecialtyLoading] = useState(false);

  useEffect(() => {
    api.get<ApiSpecialty[]>('/specialties').then((list) => {
      setSpecialties(list);
      if (list.length > 0) setSpecialtyId((prev) => prev ?? list[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (mode !== 'specialty' || !specialtyId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSpecialtyLoading(true);
    leaderboard.bySpecialty({ specialtyId, geo: geoValue ? 'auto' : 'country', geoValue: geoValue || undefined, limit: 30 })
      .then(setSpecialtyData)
      .catch(() => setSpecialtyData(null))
      .finally(() => setSpecialtyLoading(false));
  }, [mode, specialtyId, geoValue]);

  // ── Ma position — même vue exacte que la liste, pour se situer même hors du top affiché ──
  const [myRank, setMyRank] = useState<ApiMySpecialtyRank | null>(null);

  useEffect(() => {
    if (mode !== 'specialty' || !specialtyId || !myProfileId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMyRank(null);
      return;
    }
    leaderboard.mySpecialtyRank({ specialtyId, geo: geoValue ? 'auto' : 'country', geoValue: geoValue || undefined })
      .then(setMyRank)
      .catch(() => setMyRank(null));
  }, [mode, specialtyId, geoValue, myProfileId]);

  const iAmInVisibleResults = !!specialtyData?.results.some((r) => r.id === myProfileId);

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto pb-28 md:pb-8">
        {/* Header */}
        <div className="px-4 pt-6 pb-4">
          <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-neutral-400 mb-1">CHAIR</p>
          <h1 className="text-[26px] font-bold text-neutral-900 tracking-tight">Classements</h1>
          <p className="text-[13px] text-neutral-400 mt-1">
            Les meilleurs coiffeurs de la communauté
          </p>
        </div>

        {/* Mode : Spécialité (défaut, "Top X en Y") vs Global (ancien) */}
        <div className="px-4 mb-4 flex bg-neutral-100 rounded-2xl p-1 gap-1">
          <button
            onClick={() => setMode('specialty')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors ${mode === 'specialty' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            <Scissors size={12} />Par spécialité
          </button>
          <button
            onClick={() => setMode('global')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors ${mode === 'global' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            <Trophy size={12} />Global
          </button>
        </div>

        {mode === 'specialty' ? (
          <>
            {/* Spécialité */}
            <div className="px-4 mb-3 flex gap-2 overflow-x-auto no-scrollbar">
              {specialties.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSpecialtyId(s.id)}
                  className={`flex-shrink-0 text-[12px] font-semibold px-3 py-2 rounded-xl border transition-all ${
                    specialtyId === s.id
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>

            {/* Zone — champ libre, vide par défaut (ville, département, région, pays) */}
            <div className="px-4 mb-3">
              <LocationChip value={geoValue} inputPlaceholder="Ville, département, région, pays" onSubmit={setGeoValue} />
            </div>

            <div className="px-4 mb-3">
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Basé sur les avis certifiés et l&apos;activité récente.
              </p>
            </div>

            {/* Votre position — visible même hors du top affiché, jamais dupliquée si déjà dans la liste */}
            {myProfileId && !iAmInVisibleResults && myRank && (
              <div className="px-4 mb-3">
                {myRank.ranked ? (
                  <div className="flex items-center justify-between bg-neutral-900 rounded-2xl px-4 py-3.5">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-white/40">Votre position</p>
                      <p className="text-sm font-bold text-white">#{myRank.rank} sur {myRank.total}</p>
                    </div>
                    {!!myRank.points_to_next && (
                      <p className="text-[12px] text-white/60 text-right max-w-[45%]">
                        {myRank.points_to_next} pt{myRank.points_to_next > 1 ? 's' : ''} avant la {(myRank.rank ?? 1) - 1}e place
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-neutral-50 rounded-2xl px-4 py-3.5">
                    <p className="text-[12px] text-neutral-400">Pas encore classé(e) dans cette vue.</p>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-neutral-100">
              {specialtyLoading ? (
                <div className="space-y-0">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-100 animate-pulse flex-shrink-0" />
                      <div className="w-10 h-10 rounded-full bg-neutral-100 animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-neutral-100 rounded animate-pulse w-32" />
                        <div className="h-2.5 bg-neutral-100 rounded animate-pulse w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : specialtyData && specialtyData.results.length > 0 ? (
                <div className="divide-y divide-neutral-50">
                  {specialtyData.results.map((entry) => (
                    <SpecialtyLeaderboardCard key={entry.id} entry={entry} isMe={entry.id === myProfileId} />
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center px-4">
                  <Award size={36} className="text-neutral-300 mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-sm font-semibold text-neutral-900 mb-1">Aucun résultat</p>
                  <p className="text-xs text-neutral-400">
                    {geoValue ? `Aucun coiffeur reconnu à "${geoValue}" pour l'instant.` : 'Aucun coiffeur reconnu dans cette spécialité pour l\'instant.'}
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Tabs type */}
            <div className="px-4 mb-3 flex gap-2 overflow-x-auto no-scrollbar">
              {TYPES.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveType(key)}
                  className={`flex-shrink-0 flex items-center gap-1.5 text-[12px] font-semibold px-3 py-2 rounded-xl border transition-all ${
                    activeType === key
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
                  }`}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>

            {/* Zone — champ libre, vide par défaut */}
            <div className="px-4 mb-3">
              <LocationChip value={city} inputPlaceholder="Ville ou pays" onSubmit={setCity} />
            </div>

            {/* Contexte */}
            <div className="px-4 mb-3">
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                {TYPES.find((t) => t.key === activeType)?.note}
              </p>
            </div>

            {/* Liste */}
            <div className="border-t border-neutral-100">
              {loading ? (
                <div className="space-y-0">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-100 animate-pulse flex-shrink-0" />
                      <div className="w-10 h-10 rounded-full bg-neutral-100 animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-neutral-100 rounded animate-pulse w-32" />
                        <div className="h-2.5 bg-neutral-100 rounded animate-pulse w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : data && data.results.length > 0 ? (
                <div className="divide-y divide-neutral-50">
                  {data.results.map((entry) => (
                    <LeaderboardCard key={entry.id} entry={entry} />
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center px-4">
                  <Trophy size={36} className="text-neutral-300 mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-sm font-semibold text-neutral-900 mb-1">Aucun résultat</p>
                  <p className="text-xs text-neutral-400">
                    {city ? `Aucun coiffeur à "${city}" pour l'instant.` : 'Aucun coiffeur actif pour l\'instant.'}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
