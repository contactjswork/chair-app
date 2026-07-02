'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, ChevronRight, BadgeCheck } from 'lucide-react';
import { getStoredLocation } from '@/hooks/useGeolocation';
import { resolveMediaUrl } from '@/lib/types';
import type { ApiHairdresserProfile, PaginatedResponse } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

function HDCard({ h, badge, badgeCls }: { h: ApiHairdresserProfile; badge?: string; badgeCls?: string }) {
  const avatar = resolveMediaUrl(h.user.avatar);
  const banner = resolveMediaUrl(h.banner_image);
  const bg = banner ?? avatar;
  const hasRating = h.reviews_count > 0;
  const spec = h.specialties[0]?.name;
  return (
    <Link href={`/app/coiffeur/${h.slug}`} className="relative flex-shrink-0 w-[155px] md:w-[170px] block group">
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
          <div className="absolute top-2.5 right-2.5 z-10 w-5 h-5 rounded-full bg-white/95 flex items-center justify-center shadow">
            <BadgeCheck size={11} className="text-neutral-900" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center pb-12">
          <div className="relative w-[62px] h-[62px] rounded-full overflow-hidden ring-2 ring-white/25 shadow-xl group-hover:scale-105 transition-transform duration-300">
            {avatar ? (
              <Image src={avatar} alt={h.user.name} fill className="object-cover" sizes="62px" />
            ) : (
              <div className="w-full h-full bg-neutral-700 flex items-center justify-center">
                <span className="text-2xl font-bold text-white/40">{h.user.name.charAt(0)}</span>
              </div>
            )}
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

function SectionHeader({ tag, title, subtitle, href }: { tag?: string; title: string; subtitle?: string; href?: string }) {
  return (
    <div className="px-4 md:px-8 max-w-6xl md:mx-auto mb-5 flex items-end justify-between gap-3">
      <div>
        {tag && <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-neutral-400 mb-1.5">{tag}</p>}
        <h2 className="text-[20px] md:text-[22px] font-bold text-neutral-900 tracking-tight leading-tight">{title}</h2>
        {subtitle && <p className="text-[12px] text-neutral-400 mt-1 leading-relaxed max-w-sm">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors">
          <ChevronRight size={16} strokeWidth={2.5} className="text-neutral-900" />
        </Link>
      )}
    </div>
  );
}

function HDStrip({ hairdressers, badge, badgeCls }: { hairdressers: ApiHairdresserProfile[]; badge?: string; badgeCls?: string }) {
  return (
    <div className="flex gap-3 overflow-x-auto px-4 md:px-8 pb-3 no-scrollbar">
      {hairdressers.map((h) => <HDCard key={h.id} h={h} badge={badge} badgeCls={badgeCls} />)}
    </div>
  );
}

function FeaturedAvatarStrip({ hairdressers }: { hairdressers: ApiHairdresserProfile[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto px-4 md:px-8 pb-2 no-scrollbar">
      {hairdressers.map((h) => {
        const avatar = resolveMediaUrl(h.user.avatar);
        const spec = h.specialties[0]?.name;
        const hasRating = h.reviews_count > 0;
        return (
          <Link key={h.id} href={`/app/coiffeur/${h.slug}`} className="flex-shrink-0 flex flex-col items-center gap-2 group" style={{ width: 76 }}>
            <div className="relative w-[66px] h-[66px] rounded-full overflow-hidden bg-neutral-100 ring-2 ring-neutral-100 group-hover:ring-neutral-300 transition-all shadow-sm">
              {avatar ? (
                <Image src={avatar} alt={h.user.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="66px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neutral-200">
                  <span className="text-xl font-bold text-neutral-400">{h.user.name.charAt(0)}</span>
                </div>
              )}
              {h.is_verified && (
                <div className="absolute bottom-0 right-0 w-[18px] h-[18px] rounded-full bg-white shadow flex items-center justify-center">
                  <BadgeCheck size={10} className="text-neutral-900" />
                </div>
              )}
            </div>
            <div className="text-center w-full">
              <p className="text-[11px] font-bold text-neutral-900 truncate leading-tight">{h.user.name.split(' ')[0]}</p>
              {spec && <p className="text-[10px] text-neutral-400 truncate leading-tight mt-0.5">{spec}</p>}
              {hasRating && (
                <p className="flex items-center justify-center gap-0.5 text-[10px] font-semibold text-neutral-500 mt-0.5">
                  <Star size={8} className="fill-neutral-500 stroke-none" />
                  {parseFloat(h.avg_rating).toFixed(1)}
                </p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ── Coup de cœur CHAIR ────────────────────────────────────────────────────────

export function CoupDeCoeurStrip({ fallback }: { fallback: ApiHairdresserProfile[] }) {
  const [hairdressers, setHairdressers] = useState<ApiHairdresserProfile[]>(fallback);
  const [isGeo, setIsGeo] = useState(false);

  useEffect(() => {
    const loc = getStoredLocation();
    if (!loc) return;
    setIsGeo(true);
    const params = new URLSearchParams({ lat: String(loc.latitude), lng: String(loc.longitude), radius: '100', per_page: '10' });
    fetch(`${API}/hairdressers?${params}`)
      .then((r) => r.json())
      .then((d: PaginatedResponse<ApiHairdresserProfile>) => { if (d.data?.length) setHairdressers(d.data); })
      .catch(() => {});
  }, []);

  if (!hairdressers.length) return null;
  return (
    <section className="pt-10">
      <SectionHeader
        tag="Sélection éditoriale"
        title={isGeo ? 'Coups de cœur près de vous' : 'Coup de cœur CHAIR'}
        subtitle={isGeo ? 'Les profils qu\'on adore dans votre région' : 'Les profils que notre équipe adore'}
        href="/app/recherche"
      />
      <FeaturedAvatarStrip hairdressers={hairdressers} />
    </section>
  );
}

// ── Les plus demandés ─────────────────────────────────────────────────────────

export function PopularStrip({ fallback }: { fallback: ApiHairdresserProfile[] }) {
  const [hairdressers, setHairdressers] = useState<ApiHairdresserProfile[]>(fallback);
  const [isGeo, setIsGeo] = useState(false);

  useEffect(() => {
    const loc = getStoredLocation();
    if (!loc) return;
    setIsGeo(true);
    const params = new URLSearchParams({ lat: String(loc.latitude), lng: String(loc.longitude), radius: '80', per_page: '8' });
    fetch(`${API}/hairdressers?${params}`)
      .then((r) => r.json())
      .then((d: PaginatedResponse<ApiHairdresserProfile>) => { if (d.data?.length) setHairdressers(d.data); })
      .catch(() => {});
  }, []);

  if (!hairdressers.length) return null;
  return (
    <section className="pt-10">
      <SectionHeader
        tag="Tendance"
        title={isGeo ? 'Les plus demandés près de vous' : 'Les plus demandés'}
        subtitle={isGeo ? 'Les coiffeurs qui cartonnent dans votre secteur' : 'Les coiffeurs qui cartonnent en ce moment'}
        href="/app/recherche"
      />
      <HDStrip hairdressers={hairdressers} badge="Tendance" badgeCls="bg-white/90 !text-neutral-900" />
    </section>
  );
}

// ── Nouveaux talents ──────────────────────────────────────────────────────────

export function NewTalentsStrip({ fallback }: { fallback: ApiHairdresserProfile[] }) {
  const [hairdressers, setHairdressers] = useState<ApiHairdresserProfile[]>(fallback);
  const [isGeo, setIsGeo] = useState(false);

  useEffect(() => {
    const loc = getStoredLocation();
    if (!loc) return;
    setIsGeo(true);
    const params = new URLSearchParams({ lat: String(loc.latitude), lng: String(loc.longitude), radius: '50', per_page: '8', days: '60' });
    fetch(`${API}/hairdressers?${params}`)
      .then((r) => r.json())
      .then((d: PaginatedResponse<ApiHairdresserProfile>) => { if (d.data?.length) setHairdressers(d.data); })
      .catch(() => {});
  }, []);

  if (!hairdressers.length) return null;
  return (
    <section className="pt-10">
      <SectionHeader
        tag="À découvrir"
        title={isGeo ? 'Nouveaux talents près de vous' : 'Nouveaux talents'}
        subtitle={isGeo ? 'Les nouvelles têtes de votre région' : 'Ils viennent de rejoindre CHAIR'}
        href="/app/recherche"
      />
      <HDStrip hairdressers={hairdressers} badge="Nouveau" badgeCls="bg-neutral-900" />
    </section>
  );
}

// ── Default export (legacy) ───────────────────────────────────────────────────

interface Props {
  fallbackNew:      ApiHairdresserProfile[];
  fallbackPopular:  ApiHairdresserProfile[];
  fallbackFeatured: ApiHairdresserProfile[];
}

export default function HomeGeoStrips({ fallbackNew, fallbackPopular, fallbackFeatured }: Props) {
  return (
    <>
      <CoupDeCoeurStrip fallback={fallbackFeatured} />
      <PopularStrip fallback={fallbackPopular} />
      <NewTalentsStrip fallback={fallbackNew} />
    </>
  );
}
