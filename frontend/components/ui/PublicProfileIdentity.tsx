'use client';

import Image from 'next/image';
import { MapPin, BadgeCheck, Star } from 'lucide-react';
import type { ApiHairdresserProfile } from '@/lib/types';
import { estimateLevelColor, LEVEL_RING, ringGradientClass } from '@/lib/chairLevel';
import { hasChairPlus } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { PremiumBadge } from './PremiumLock';
import StreakFlameBadge from './StreakFlameBadge';
import SpecialtyHighlights from './SpecialtyHighlights';
import PublicProfileOwnerActions from './PublicProfileOwnerActions';

function getSalonStatus(h: ApiHairdresserProfile): string {
  if (h.salon) return `Chez ${h.salon.name}`;
  if (h.is_independent) return 'Indépendant(e)';
  return '';
}

interface Props {
  hairdresser: ApiHairdresserProfile;
  avatarUrl: string | null;
}

// Bloc identité — composition compacte et hiérarchisée : avatar, nom,
// signaux de réputation (max 3), localisation/statut, puis note/abonnés.
// Objectif : compréhensible en moins de 3 secondes (cf. brief masterclass).
export default function PublicProfileIdentity({ hairdresser, avatarUrl }: Props) {
  const { user } = useAuth();
  const isOwnProfile = user?.hairdresser_profile?.id === hairdresser.id;
  const hasRating   = hairdresser.reviews_count > 0;
  const levelColor   = hairdresser.chair_level?.color ?? estimateLevelColor(hairdresser);
  const ring         = LEVEL_RING[levelColor] ?? LEVEL_RING.neutral;
  const streakDays   = hairdresser.chair_streak?.current_streak ?? 0;
  const streakActive = hairdresser.chair_streak?.is_active_today ?? false;
  const salonStatus  = getSalonStatus(hairdresser);

  const metaLine = [
    hairdresser.city,
    salonStatus || null,
    hairdresser.years_experience ? `${hairdresser.years_experience} ans d'exp.` : null,
  ].filter(Boolean).join('  ·  ');

  return (
    <div className="px-4">

      {/* Avatar + rating */}
      <div className="flex items-end justify-between -mt-12 mb-5 relative z-10">
        <div
          className="relative w-[82px] h-[82px] rounded-full p-[3px] flex-shrink-0"
          style={ring.show && ring.glow ? { boxShadow: ring.glow } : undefined}
        >
          {ring.show && (
            <div className={`absolute inset-0 rounded-full ${ringGradientClass(levelColor)}`} />
          )}
          <div className={`relative rounded-full overflow-hidden bg-neutral-200 shadow-md ${ring.show ? 'w-[calc(100%-6px)] h-[calc(100%-6px)] m-[3px]' : 'w-full h-full border-4 border-white'}`}>
            {avatarUrl ? (
              <Image src={avatarUrl} alt={hairdresser.user.name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                <span className="text-[24px] font-bold text-white/40">
                  {hairdresser.user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          {ring.show && (
            <div className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-bold tracking-[0.1em] uppercase whitespace-nowrap shadow-sm ${ring.pill}`}>
              {ring.label}
            </div>
          )}
          <StreakFlameBadge days={streakDays} active={streakActive} coiffeurName={hairdresser.user.name} />
          {isOwnProfile && <PublicProfileOwnerActions variant="avatar" />}
        </div>

        {hasRating && (
          <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 shadow-sm border border-neutral-100 mb-1">
            <Star size={13} className="fill-amber-400 stroke-none" />
            <span className="text-[15px] font-bold text-neutral-900">
              {parseFloat(hairdresser.avg_rating).toFixed(1)}
            </span>
            <span className="text-[12px] text-neutral-400">({hairdresser.reviews_count})</span>
          </div>
        )}
      </div>

      {/* Nom */}
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-[22px] font-bold text-neutral-900 leading-tight">{hairdresser.user.name}</h1>
        {hairdresser.is_verified && <BadgeCheck size={19} className="text-neutral-900 flex-shrink-0" />}
        {hasChairPlus(hairdresser) && <PremiumBadge size="md" />}
      </div>

      {/* "Pourquoi ce coiffeur est reconnu" — 1 à 3 signaux maximum */}
      <SpecialtyHighlights highlights={hairdresser.specialty_highlights ?? []} />

      {/* Localisation · statut · expérience */}
      {metaLine && (
        <p className="text-[13px] text-neutral-400 mb-2 leading-snug flex items-center gap-1 flex-wrap">
          {hairdresser.city && <MapPin size={11} className="flex-shrink-0" />}
          {metaLine}
        </p>
      )}

      {/* Tagline — accroche courte, 1 ligne */}
      {hairdresser.tagline && (
        <p className="text-[13px] text-neutral-500 italic mb-1 leading-snug line-clamp-1">
          {hairdresser.tagline}
        </p>
      )}

      {/* Abonnés */}
      <p className="text-[12px] text-neutral-400 mb-4">
        <span className="font-semibold text-neutral-700">{hairdresser.followers_count}</span> abonné{hairdresser.followers_count > 1 ? 's' : ''}
      </p>
    </div>
  );
}
