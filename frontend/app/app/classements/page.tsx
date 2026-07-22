'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import Image from 'next/image';
import Link from 'next/link';
import { leaderboard, api } from '@/lib/api';
import type { ApiLeaderboard, ApiLeaderboardEntry, ApiSpecialty, ApiSpecialtyLeaderboard, ApiSpecialtyLeaderboardEntry } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/types';
import { Trophy, Star, TrendingUp, ImageIcon, Users, BadgeCheck, Crown, Scissors, MapPin, Award } from 'lucide-react';

const TYPES = [
  { key: 'engagement', label: 'Engagement',  icon: Trophy },
  { key: 'reviews',    label: 'Avis',         icon: Star },
  { key: 'posts',      label: 'Réalisations', icon: ImageIcon },
  { key: 'progression',label: 'Progression',  icon: TrendingUp },
];

const GEO_LEVELS: { key: 'city' | 'department' | 'region' | 'country'; label: string }[] = [
  { key: 'city',       label: 'Ville' },
  { key: 'department', label: 'Département' },
  { key: 'region',     label: 'Région' },
  { key: 'country',    label: 'France' },
];

const LEVEL_PILL: Record<string, string> = {
  neutral: 'bg-neutral-100 text-neutral-500',
  bronze:  'bg-amber-100 text-amber-700',
  silver:  'bg-neutral-200 text-neutral-700',
  gold:    'bg-yellow-100 text-yellow-700',
  purple:  'bg-purple-100 text-purple-700',
  diamond: 'bg-neutral-900 text-white',
};

function SpecialtyLeaderboardCard({ entry }: { entry: ApiSpecialtyLeaderboardEntry }) {
  const avatar = resolveMediaUrl(entry.avatar);
  const initial = (entry.name ?? '?').charAt(0).toUpperCase();
  const isTop3 = entry.rank <= 3;

  return (
    <Link
      href={`/coiffeur/${entry.slug}`}
      className={`flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors ${entry.rank === 1 ? 'bg-yellow-50/60' : ''}`}
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
  const [mode, setMode] = useState<'global' | 'specialty'>('specialty');

  // ── Classement global (existant) ──
  const [activeType, setActiveType] = useState('engagement');
  const [city, setCity] = useState('');
  const [cityInput, setCityInput] = useState('');
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

  function handleCitySubmit(e: React.FormEvent) {
    e.preventDefault();
    setCity(cityInput.trim());
  }

  // ── Classement par spécialité ──
  const [specialties, setSpecialties] = useState<ApiSpecialty[]>([]);
  const [specialtyId, setSpecialtyId] = useState<number | null>(null);
  const [geo, setGeo] = useState<'city' | 'department' | 'region' | 'country'>('city');
  const [geoValueInput, setGeoValueInput] = useState('');
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
    leaderboard.bySpecialty({ specialtyId, geo, geoValue: geo === 'country' ? undefined : (geoValue || undefined), limit: 30 })
      .then(setSpecialtyData)
      .catch(() => setSpecialtyData(null))
      .finally(() => setSpecialtyLoading(false));
  }, [mode, specialtyId, geo, geoValue]);

  function handleGeoValueSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGeoValue(geoValueInput.trim());
  }

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

            {/* Niveau géographique + valeur */}
            <div className="px-4 mb-3 space-y-2">
              <div className="flex gap-2">
                {GEO_LEVELS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => { setGeo(key); if (key === 'country') { setGeoValue(''); setGeoValueInput(''); } }}
                    className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold py-2 rounded-xl border transition-all ${
                      geo === key
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
                    }`}
                  >
                    <MapPin size={10} />{label}
                  </button>
                ))}
              </div>
              {geo !== 'country' && (
                <form onSubmit={handleGeoValueSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={geoValueInput}
                    onChange={(e) => setGeoValueInput(e.target.value)}
                    placeholder={geo === 'city' ? 'Ex : Haguenau' : geo === 'department' ? 'Ex : Bas-Rhin' : 'Ex : Alsace, Grand Est'}
                    className="flex-1 border border-neutral-200 rounded-xl px-3 py-2.5 text-[13px] focus:outline-none focus:border-neutral-400 placeholder:text-neutral-400"
                  />
                  <button type="submit" className="bg-neutral-900 text-white text-[12px] font-semibold px-4 py-2.5 rounded-xl">OK</button>
                </form>
              )}
            </div>

            <div className="px-4 mb-3">
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Classé sur le score de spécialité (avis certifiés, réalisations, visites) — pondéré par l&apos;activité récente, pas manipulable par un simple pic ponctuel.
                {specialtyData?.geo_value && ` · ${specialtyData.geo_value}`}
              </p>
            </div>

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
                    <SpecialtyLeaderboardCard key={entry.id} entry={entry} />
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center px-4">
                  <Award size={36} className="text-neutral-300 mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-sm font-semibold text-neutral-900 mb-1">Aucun résultat</p>
                  <p className="text-xs text-neutral-400">
                    {geoValue ? `Aucun coiffeur reconnu ici pour l'instant.` : 'Choisissez une spécialité et une zone.'}
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
        {/* Filtre ville */}
        <div className="px-4 mb-4">
          <form onSubmit={handleCitySubmit} className="flex gap-2">
            <input
              type="text"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder="Filtrer par ville…"
              className="flex-1 border border-neutral-200 rounded-xl px-3 py-2.5 text-[13px] focus:outline-none focus:border-neutral-400 placeholder:text-neutral-400"
            />
            <button
              type="submit"
              className="bg-neutral-900 text-white text-[12px] font-semibold px-4 py-2.5 rounded-xl"
            >
              OK
            </button>
            {city && (
              <button
                type="button"
                onClick={() => { setCity(''); setCityInput(''); }}
                className="text-[12px] text-neutral-400 hover:text-neutral-700 px-2"
              >
                Tout
              </button>
            )}
          </form>
        </div>

        {/* Tabs type */}
        <div className="px-4 mb-4 flex gap-2 overflow-x-auto no-scrollbar">
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

        {/* Context note */}
        <div className="px-4 mb-3">
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            {activeType === 'engagement' && 'Combinaison abonnés, avis, réalisations et activité. Plafonds pour équilibrer petits et grands comptes.'}
            {activeType === 'reviews' && 'Qualité de la note × nombre d\'avis. Un 4.9 avec 20 avis prime sur un 5.0 avec 1 avis.'}
            {activeType === 'posts' && 'Nombre de réalisations publiées.'}
            {activeType === 'progression' && 'Progression rapide par rapport à l\'ancienneté. Avantage aux nouveaux talents.'}
            {city && ` · Ville : ${city}`}
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
