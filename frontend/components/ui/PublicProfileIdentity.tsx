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

// Bloc identité — ordre de lecture imposé : photo + nom + ville, puis
// spécialité, puis note/avis, puis classement.
//
// Avant, l'avatar occupait une ligne entière pour lui seul avec la note en
// pastille flottante à l'opposé (ombre + bordure, aucun ancrage), le nom
// arrivait en dessous, et le nombre d'abonnés terminait en ligne grise
// orpheline tout en bas. Trois informations chiffrées de même nature
// éparpillées sur trois hauteurs différentes, plus ~90px de vertical perdu.
//
// Maintenant : nom et ville remontent à côté de l'avatar (le nom devient
// lisible sans scroller), et note / avis / abonnés sont regroupés dans un
// seul bandeau chiffré à filets — sobre, éditorial, et enfin comparable
// d'un profil à l'autre.
export default function PublicProfileIdentity({ hairdresser, avatarUrl }: Props) {
  const { user } = useAuth();
  const isOwnProfile = user?.hairdresser_profile?.id === hairdresser.id;
  const hasRating    = hairdresser.reviews_count > 0;
  const levelColor   = hairdresser.chair_level?.color ?? estimateLevelColor(hairdresser);
  const ring         = LEVEL_RING[levelColor] ?? LEVEL_RING.neutral;
  const streakDays   = hairdresser.chair_streak?.current_streak ?? 0;
  const streakActive = hairdresser.chair_streak?.is_active_today ?? false;
  const salonStatus  = getSalonStatus(hairdresser);

  const metaLine = [
    hairdresser.city,
    salonStatus || null,
    hairdresser.years_experience ? `${hairdresser.years_experience} ans d'exp.` : null,
  ].filter(Boolean).join(' · ');

  // Accroche : les mots du coiffeur en priorité, sinon ses spécialités —
  // plutôt qu'un blanc, qui est exactement ce qui donne l'impression de
  // "gros blocs vides".
  const accroche = hairdresser.tagline?.trim()
    || hairdresser.specialties.slice(0, 2).map((s) => s.name).join(' · ')
    || null;

  const stats: { value: string; label: string; star?: boolean }[] = [
    ...(hasRating
      ? [
          { value: parseFloat(hairdresser.avg_rating).toFixed(1), label: 'Note', star: true },
          { value: String(hairdresser.reviews_count), label: 'Avis' },
        ]
      : []),
    { value: String(hairdresser.followers_count), label: hairdresser.followers_count > 1 ? 'Abonnés' : 'Abonné' },
  ];

  return (
    <div className="px-4">

      {/* ── 1. Photo + nom + ville ── */}
      <div className="flex items-end gap-4 -mt-11 mb-4 relative z-10">
        <div
          className="relative w-[78px] h-[78px] rounded-full p-[3px] flex-shrink-0"
          style={ring.show && ring.glow ? { boxShadow: ring.glow } : undefined}
        >
          {ring.show && (
            <div className={`absolute inset-0 rounded-full ${ringGradientClass(levelColor)}`} />
          )}
          <div className={`relative rounded-full overflow-hidden bg-neutral-200 ${ring.show ? 'w-[calc(100%-6px)] h-[calc(100%-6px)] m-[3px]' : 'w-full h-full border-4 border-white'}`}>
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

        <div className="flex-1 min-w-0 pb-1.5">
          <div className="flex items-center gap-1.5">
            <h1 className="text-[21px] font-bold text-neutral-900 leading-tight truncate">{hairdresser.user.name}</h1>
            {hairdresser.is_verified && <BadgeCheck size={18} className="text-neutral-900 flex-shrink-0" />}
            {hasChairPlus(hairdresser) && <PremiumBadge size="md" />}
          </div>
          {metaLine && (
            <p className="text-[13px] text-neutral-500 mt-1 leading-snug flex items-center gap-1 truncate">
              {hairdresser.city && <MapPin size={11} className="flex-shrink-0" />}
              <span className="truncate">{metaLine}</span>
            </p>
          )}
        </div>
      </div>

      {/* ── 2. Spécialité / accroche ── */}
      {accroche && (
        <p className="text-[14px] text-neutral-700 leading-relaxed line-clamp-2">{accroche}</p>
      )}

      {/* ── 3. Note + avis (+ abonnés) ── */}
      <div className="flex items-stretch border-y border-neutral-100 mt-4 mb-4">
        {stats.map((s, i) => (
          <div key={s.label} className={`flex-1 py-3 text-center ${i > 0 ? 'border-l border-neutral-100' : ''}`}>
            <p className="flex items-center justify-center gap-1 text-[17px] font-bold text-neutral-900 leading-none">
              {s.star && <Star size={13} className="fill-neutral-900 stroke-none" />}
              {s.value}
            </p>
            <p className="text-[11px] text-neutral-400 mt-1.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── 4. Classement / signaux de réputation ── */}
      <SpecialtyHighlights highlights={hairdresser.specialty_highlights ?? []} />
    </div>
  );
}
