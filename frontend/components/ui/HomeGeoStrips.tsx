'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, ChevronRight, BadgeCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { resolveMediaUrl } from '@/lib/types';
import type { ApiHairdresserProfile } from '@/lib/types';
import { estimateLevelColor, LEVEL_RING, ringGradientClass } from '@/lib/chairLevel';
import { getUserGeo, getUserSpecialtySlugs } from '@/lib/homeFilters';
import { fetchHairdressersProgressive } from '@/lib/homeFetch';
import { useDedupedList } from '@/contexts/HomeDedupeContext';
import Reveal from './Reveal';

function HDCard({ h, badge, badgeCls }: { h: ApiHairdresserProfile; badge?: string; badgeCls?: string }) {
  const avatar = resolveMediaUrl(h.user.avatar);
  const banner = resolveMediaUrl(h.banner_image);
  const bg = banner ?? avatar;
  const hasRating = h.reviews_count > 0;
  const spec = h.specialties[0]?.name;
  const levelColor = h.chair_level?.color ?? estimateLevelColor(h);
  const ring = LEVEL_RING[levelColor] ?? LEVEL_RING.neutral;
  return (
    <Link href={`/app/coiffeur/${h.slug}`} className="relative flex-shrink-0 w-[155px] md:w-[170px] block group active:scale-[0.98] transition-transform duration-150">
      <div className="relative rounded-2xl overflow-hidden bg-neutral-900 aspect-[3/4]">
        {bg && (
          <Image
            src={bg} alt={h.user.name} fill
            className="object-cover scale-110 blur-sm brightness-50 group-hover:brightness-60 transition-all duration-500"
            sizes="170px"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-black/15" />
        {badge && (
          <span className={`absolute top-2.5 left-2.5 z-10 text-[8px] font-bold tracking-[0.12em] uppercase text-white px-2 py-1 rounded-full ${badgeCls ?? 'bg-neutral-900'}`}>
            {badge}
          </span>
        )}
        {h.is_verified && (
          <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1">
            <div className="w-5 h-5 rounded-full bg-white/95 flex items-center justify-center shadow">
              <BadgeCheck size={11} className="text-neutral-900" />
            </div>
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center pb-12">
          <div
            className="relative w-[62px] h-[62px] rounded-full p-[2px] shadow-xl group-hover:scale-105 transition-transform duration-300"
            style={ring.show && ring.glow ? { boxShadow: ring.glow } : undefined}
          >
            {ring.show && <div className={`absolute inset-0 rounded-full ${ringGradientClass(levelColor)}`} />}
            <div className={`relative rounded-full overflow-hidden ${ring.show ? 'w-[calc(100%-4px)] h-[calc(100%-4px)] m-[2px]' : 'w-full h-full ring-2 ring-white/25'}`}>
              {avatar ? (
                <Image src={avatar} alt={h.user.name} fill className="object-cover" sizes="62px" />
              ) : (
                <div className="w-full h-full bg-neutral-700 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white/40">{h.user.name.charAt(0)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {spec && <p className="text-[8px] font-bold text-white/55 tracking-[0.14em] uppercase mb-1">{spec}</p>}
          <h3 className="text-white font-bold text-[13px] leading-tight truncate">{h.user.name}</h3>
          <div className="flex items-center justify-between mt-1">
            <p className="text-white/45 text-[10px] truncate">{h.city ?? ''}</p>
            {hasRating && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Star size={9} className="fill-white stroke-none" />
                <span className="text-white text-[10px] font-bold">{parseFloat(h.avg_rating).toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// En-tête de section partagé — repris tel quel (même markup) dans page.tsx,
// HomePersonalized.tsx et HomeRankingSection.tsx, qui recréaient chacun la
// même structure tag/titre/sous-titre/chevron à la main. `tagIcon` couvre le
// seul cas qui différait réellement (le trophée devant "Classement").
export function SectionHeader({
  tag, tagIcon, title, subtitle, href, badge,
}: { tag?: string; tagIcon?: ReactNode; title: string; subtitle?: string; href?: string; badge?: string }) {
  return (
    <div className="px-4 md:px-8 max-w-6xl md:mx-auto mb-5 flex items-end justify-between gap-3">
      <div>
        {tag && (
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-neutral-400 mb-1.5 flex items-center gap-1.5">
            {tagIcon}{tag}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-[20px] md:text-[22px] font-bold text-neutral-900 tracking-tight leading-tight">{title}</h2>
          {/* Repli géo honnête — jamais laisser croire à de la proximité quand
              on a dû élargir le rayon (voir RecommendationFallback côté contrat). */}
          {badge && (
            <span className="text-[9px] font-bold tracking-[0.08em] uppercase text-neutral-500 bg-neutral-100 px-2 py-1 rounded-full whitespace-nowrap">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-[12px] text-neutral-400 mt-1 leading-relaxed max-w-sm">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 active:scale-90 transition-all">
          <ChevronRight size={16} strokeWidth={2.5} className="text-neutral-900" />
        </Link>
      )}
    </div>
  );
}

function HDStrip({ hairdressers, badge, badgeCls }: { hairdressers: ApiHairdresserProfile[]; badge?: string; badgeCls?: string }) {
  return (
    <div className="flex gap-3 overflow-x-auto px-4 md:px-8 pb-3 no-scrollbar">
      {hairdressers.map((h, i) => (
        <Reveal key={h.id} delay={(i % 4) * 70} className="flex-shrink-0">
          <HDCard h={h} badge={badge} badgeCls={badgeCls} />
        </Reveal>
      ))}
    </div>
  );
}

function FeaturedAvatarStrip({ hairdressers }: { hairdressers: ApiHairdresserProfile[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto px-4 md:px-8 pb-2 no-scrollbar">
      {hairdressers.map((h, i) => {
        const avatar = resolveMediaUrl(h.user.avatar);
        const spec = h.specialties[0]?.name;
        const hasRating = h.reviews_count > 0;
        const levelColor = h.chair_level?.color ?? estimateLevelColor(h);
        const ring = LEVEL_RING[levelColor] ?? LEVEL_RING.neutral;
        return (
          <Reveal key={h.id} delay={(i % 4) * 70} className="flex-shrink-0">
            <Link href={`/app/coiffeur/${h.slug}`} className="flex flex-col items-center gap-2 group active:scale-[0.94] transition-transform duration-150" style={{ width: 76 }}>
              <div
                className="relative w-[66px] h-[66px] rounded-full p-[2px] shadow-sm"
                style={ring.show && ring.glow ? { boxShadow: ring.glow } : undefined}
              >
                {ring.show && <div className={`absolute inset-0 rounded-full ${ringGradientClass(levelColor)}`} />}
                <div className={`relative rounded-full overflow-hidden bg-neutral-100 group-hover:scale-105 transition-transform duration-300 ${ring.show ? 'w-[calc(100%-4px)] h-[calc(100%-4px)] m-[2px]' : 'w-full h-full ring-2 ring-neutral-100 group-hover:ring-neutral-300 transition-all'}`}>
                  {avatar ? (
                    <Image src={avatar} alt={h.user.name} fill className="object-cover" sizes="66px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-neutral-200">
                      <span className="text-xl font-bold text-neutral-400">{h.user.name.charAt(0)}</span>
                    </div>
                  )}
                  {/* Pas de pastille « vérifié » sur ces avatars ronds : à
                      62 px, une pastille de 18 px mange le visage et empile un
                      signal de plus sur un anneau de niveau déjà présent. La
                      vérification reste visible là où elle compte — sur la
                      fiche du coiffeur et sur les grandes cartes. */}
                </div>
              </div>
              <div className="text-center w-full">
                <p className="flex items-center justify-center gap-1 text-[11px] font-bold text-neutral-900 leading-tight">
                  <span className="truncate">{h.user.name.split(' ')[0]}</span>
                </p>
                {spec && <p className="text-[10px] text-neutral-400 truncate leading-tight mt-0.5">{spec}</p>}
                {hasRating && (
                  <p className="flex items-center justify-center gap-0.5 text-[10px] font-semibold text-neutral-500 mt-0.5">
                    <Star size={8} className="fill-neutral-500 stroke-none" />
                    {parseFloat(h.avg_rating).toFixed(1)}
                  </p>
                )}
              </div>
            </Link>
          </Reveal>
        );
      })}
    </div>
  );
}

// ── Coup de cœur CHAIR ────────────────────────────────────────────────────────

export function CoupDeCoeurStrip({
  fallback, titleOverride, limit = 10,
}: { fallback: ApiHairdresserProfile[]; titleOverride?: string | null; limit?: number }) {
  const { user, isLoading } = useAuth();
  const [hairdressers, setHairdressers] = useState<ApiHairdresserProfile[]>(fallback);
  const [isGeo, setIsGeo] = useState(false);
  const effectiveLimit = limit && limit > 0 ? limit : 10;

  useEffect(() => {
    if (isLoading || !user) return;
    fetchHairdressersProgressive(getUserSpecialtySlugs(), getUserGeo(user), effectiveLimit)
      .then(({ results, isGeo: geoHit }) => { setHairdressers(results); setIsGeo(geoHit); });
  }, [user, isLoading, effectiveLimit]);

  // Exclut les coiffeurs déjà affichés par "Pour vous" (voir HomeDedupeContext)
  // — jamais le même visage deux fois de suite sur la home.
  const displayed = useDedupedList(hairdressers, (h) => h.id, effectiveLimit);

  if (!displayed.length) return null;
  return (
    <section className="pt-10">
      <Reveal>
        <SectionHeader
          tag="Sélection CHAIR"
          title={titleOverride ?? (isGeo ? 'Coups de cœur près de chez vous' : 'Coup de cœur CHAIR')}
          href="/app/recherche"
        />
      </Reveal>
      <FeaturedAvatarStrip hairdressers={displayed} />
    </section>
  );
}

// ── Nouveaux talents ──────────────────────────────────────────────────────────

export function NewTalentsStrip({
  fallback, titleOverride, limit = 8,
}: { fallback: ApiHairdresserProfile[]; titleOverride?: string | null; limit?: number }) {
  const { user, isLoading } = useAuth();
  const [hairdressers, setHairdressers] = useState<ApiHairdresserProfile[]>(fallback);
  const [isGeo, setIsGeo] = useState(false);
  const effectiveLimit = limit && limit > 0 ? limit : 8;

  useEffect(() => {
    if (isLoading || !user) return;
    fetchHairdressersProgressive(getUserSpecialtySlugs(), getUserGeo(user), effectiveLimit, { days: '60' })
      .then(({ results, isGeo: geoHit }) => { setHairdressers(results); setIsGeo(geoHit); });
  }, [user, isLoading, effectiveLimit]);

  // Exclut les coiffeurs déjà affichés par "Pour vous" ET "Coup de cœur"
  // (voir HomeDedupeContext) — dernière section de la home à filtrer, elle
  // a donc la vue la plus complète de ce qui a déjà été montré.
  const displayed = useDedupedList(hairdressers, (h) => h.id, effectiveLimit);

  if (!displayed.length) return null;
  return (
    <section className="pt-10">
      <Reveal>
        <SectionHeader
          tag="Nouveau sur CHAIR"
          title={titleOverride ?? (isGeo ? 'Nouveaux talents autour de vous' : 'Nouveaux talents')}
          href="/app/recherche"
        />
      </Reveal>
      <HDStrip hairdressers={displayed} badge="Nouveau" badgeCls="bg-neutral-900" />
    </section>
  );
}
