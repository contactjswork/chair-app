'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, MapPin, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { resolveMediaUrl } from '@/lib/types';
import { SectionHeader } from './HomeGeoStrips';
import Reveal from './Reveal';
import { getUserGeo, getUserSpecialtySlugs } from '@/lib/homeFilters';
import { getRankingRadiusTiers } from '@/lib/appConfig';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

export interface RankedEntry {
  rank: number;
  id: number;
  slug: string;
  name: string;
  avatar: string | null;
  city: string | null;
  specialty?: string | null;
  avg_rating?: number;
  reviews_count?: number;
  is_verified: boolean;
  // Présents uniquement sur un classement scopé "spécialité" (/leaderboard?specialty_id=)
  score?: number;
  level_name?: string;
  level_color?: string;
}

const RANK_TONE: Record<number, string> = {
  1: 'bg-amber-400 text-white',
  2: 'bg-neutral-300 text-white',
  3: 'bg-orange-400 text-white',
};

// Le podium (top 3) se détache par relief plutôt que rester visuellement
// identique au reste de la liste — retour de Julien : le classement se lisait
// comme une liste plate sans hiérarchie visuelle.
const ROW_TONE: Record<number, string> = {
  1: 'bg-gradient-to-r from-amber-50 to-white ring-amber-100',
  2: 'bg-white ring-neutral-100',
  3: 'bg-white ring-neutral-100',
};

/**
 * Classement LOCALISÉ sur la position réelle du compte — scopé sur la
 * spécialité choisie par l'utilisateur quand elle existe (pas un classement
 * national "engagement" générique), sinon sur le classement général, mais
 * jamais un classement France entière tant qu'un cercle plus proche a des
 * résultats.
 */
export default function HomeRankingSection({
  fallback, titleOverride, limit = 5,
}: { fallback: RankedEntry[]; titleOverride?: string | null; limit?: number }) {
  const { user, isLoading } = useAuth();
  const [entries, setEntries] = useState<RankedEntry[]>(fallback);
  const [title, setTitle] = useState<string | null>(null);
  const effectiveLimit = limit && limit > 0 ? limit : 5;

  useEffect(() => {
    if (isLoading || !user) return;

    let cancelled = false;
    const geo = getUserGeo(user);

    (async () => {
      // Paliers configurables (Super Admin) — repli intégral sur 50km/200km
      // si absent/invalide, voir lib/appConfig.ts.
      const radiusTiers = await getRankingRadiusTiers();
      if (cancelled) return;

      // 1) Spécialité choisie : localisée en priorité (rayon 50km → 200km),
      // France seulement si vraiment personne dans ce rayon.
      try {
        const specRes = await fetch(`${API}/specialties`);
        const specialties: { id: number; slug: string; name: string }[] = await specRes.json();
        const slugs = getUserSpecialtySlugs();
        const chosen = slugs.map((s) => specialties.find((sp) => sp.slug === s)).find(Boolean);

        if (chosen && !cancelled) {
          if (geo) {
            for (const { km, label } of radiusTiers) {
              const params = new URLSearchParams({
                specialty_id: String(chosen.id), geo: 'radius', limit: String(effectiveLimit),
                lat: String(geo.lat), lng: String(geo.lng), radius_km: String(km),
              });
              const res = await fetch(`${API}/leaderboard?${params}`);
              const data: { results: RankedEntry[] } = await res.json();
              if (!cancelled && data.results?.length) {
                setEntries(data.results.map((r) => ({ ...r, specialty: chosen.name })));
                setTitle(`Top ${chosen.name} ${label}`);
                return;
              }
            }
          }
          const params = new URLSearchParams({ specialty_id: String(chosen.id), geo: 'country', limit: String(effectiveLimit) });
          const res = await fetch(`${API}/leaderboard?${params}`);
          const data: { results: RankedEntry[] } = await res.json();
          if (!cancelled && data.results?.length) {
            setEntries(data.results.map((r) => ({ ...r, specialty: chosen.name })));
            setTitle(`Top ${chosen.name} en France`);
            return;
          }
        }
      } catch { /* tente le classement général ci-dessous */ }

      // 2) Pas de spécialité pertinente (ou rien trouvé dedans) → classement
      // général, mais toujours localisé d'abord — le fallback SSR (déjà
      // France entière) reste en place si même le rayon élargi ne donne rien.
      if (cancelled || !geo) return;
      try {
        for (const { km, label } of radiusTiers) {
          const params = new URLSearchParams({
            type: 'engagement', limit: String(effectiveLimit),
            lat: String(geo.lat), lng: String(geo.lng), radius_km: String(km),
          });
          const res = await fetch(`${API}/leaderboard?${params}`);
          const data: { results: RankedEntry[] } = await res.json();
          if (!cancelled && data.results?.length) {
            setEntries(data.results);
            setTitle(`Les meilleurs coiffeurs ${label}`);
            return;
          }
        }
      } catch { /* garde le fallback */ }
    })();

    return () => { cancelled = true; };
  }, [user, isLoading, effectiveLimit]);

  if (!entries.length) return null;

  return (
    <section className="pt-10">
      <Reveal>
        <SectionHeader
          tag="Classement"
          tagIcon={<Trophy size={11} className="text-amber-500" />}
          title={titleOverride ?? title ?? 'Les meilleurs coiffeurs CHAIR'}
          href="/app/classements"
        />
      </Reveal>
      <div className="px-4 md:px-8 max-w-6xl md:mx-auto space-y-2">
        {/* Cascade ligne par ligne (délai croissant, borné à 5 crans) — un
            podium qui se révèle dans l'ordre se lit mieux qu'une liste qui
            apparaît d'un bloc, et rappelle qu'il s'agit bien d'un classement. */}
        {entries.slice(0, effectiveLimit).map((h, i) => {
          const avatar = resolveMediaUrl(h.avatar);
          const rankCls = RANK_TONE[h.rank] ?? 'bg-neutral-100 text-neutral-500';
          const rowCls = ROW_TONE[h.rank] ?? 'bg-white ring-neutral-100';
          const isTop = h.rank <= 3;
          return (
            <Reveal key={h.id} delay={(i % 5) * 60}>
              <Link
                href={`/app/coiffeur/${h.slug}`}
                className={`flex items-center gap-3.5 rounded-2xl ring-1 px-4 shadow-[0_2px_10px_-4px_rgba(10,10,10,0.08)] hover:shadow-[0_6px_18px_-6px_rgba(10,10,10,0.14)] active:scale-[0.98] transition-all ${rowCls} ${isTop ? 'py-4' : 'py-3.5'}`}
              >
                <span className={`rounded-full flex items-center justify-center font-bold flex-shrink-0 ${rankCls} ${isTop ? 'w-8 h-8 text-[13px] shadow-sm' : 'w-6 h-6 text-[11px]'}`}>
                  {h.rank}
                </span>
                <div className={`relative rounded-full overflow-hidden bg-neutral-100 flex-shrink-0 ${isTop ? 'w-12 h-12 ring-2 ring-white shadow-sm' : 'w-11 h-11'}`}>
                  {avatar ? (
                    <Image src={avatar} alt={h.name} fill className="object-cover" sizes="48px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-neutral-200">
                      <span className="font-bold text-neutral-400">{h.name.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`font-bold text-neutral-900 truncate ${isTop ? 'text-[15px]' : 'text-[14px]'}`}>{h.name}</p>
                    {h.is_verified && <BadgeCheck size={13} className="text-neutral-900 flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {h.city && (
                      <span className="flex items-center gap-0.5 text-[11px] text-neutral-400">
                        <MapPin size={9} />{h.city}
                      </span>
                    )}
                    {h.specialty && <span className="text-[11px] text-neutral-400 truncate">{h.specialty}</span>}
                  </div>
                </div>
                {h.reviews_count != null && h.reviews_count > 0 ? (
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[15px] font-bold text-neutral-900">{(h.avg_rating ?? 0).toFixed(1)}</p>
                    <p className="text-[10px] text-neutral-400">{h.reviews_count} avis</p>
                  </div>
                ) : h.level_name ? (
                  <span className="flex-shrink-0 text-[10px] font-bold text-neutral-500 bg-neutral-100 px-2 py-1 rounded-full">
                    {h.level_name}
                  </span>
                ) : null}
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
