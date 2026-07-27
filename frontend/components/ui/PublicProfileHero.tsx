'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { BadgeCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import BackButton from './BackButton';
import PublicProfileOwnerActions from './PublicProfileOwnerActions';

interface Props {
  hairdresserId: number;
  name: string;
  bannerUrl: string | null;
  isVerified: boolean;
}

// Bannière compacte (elle ne doit jamais dominer la page) + mini-header qui
// apparaît en fondu une fois la bannière sortie de l'écran, pour garder le
// nom du coiffeur visible pendant le scroll sans dupliquer le header global.
export default function PublicProfileHero({ hairdresserId, name, bannerUrl, isVerified }: Props) {
  const { user } = useAuth();
  const isOwnProfile = user?.hairdresser_profile?.id === hairdresserId;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [scrolledPast, setScrolledPast] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolledPast(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* ── Mini-header de scroll — nom du coiffeur, transition fluide ── */}
      <div
        className={`fixed inset-x-0 top-content-mobile md:top-[60px] z-40 h-12 bg-white/95 backdrop-blur-sm border-b border-neutral-100 flex items-center justify-center gap-1.5 px-12 transition-all duration-300 md:hidden ${
          scrolledPast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <p className="text-[14px] font-semibold text-neutral-900 truncate max-w-[70%]">{name}</p>
        {isVerified && <BadgeCheck size={14} className="text-neutral-900 flex-shrink-0" />}
      </div>

      {/* ── Bannière ── */}
      <div className="relative w-full overflow-hidden bg-neutral-900" style={{ height: '200px' }}>
        {bannerUrl ? (
          <Image src={bannerUrl} alt={name} fill priority className="object-cover" sizes="(max-width: 768px) 100vw, 672px" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/15" />
        <BackButton fallbackHref="/app/recherche" />
        {isOwnProfile && <PublicProfileOwnerActions variant="banner" />}
        <div ref={sentinelRef} className="absolute bottom-0 h-px w-full" />
      </div>
    </>
  );
}
