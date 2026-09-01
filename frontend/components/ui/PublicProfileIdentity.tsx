'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { MapPin, BadgeCheck, Star } from 'lucide-react';
import type { ApiHairdresserProfile } from '@/lib/types';
import { LEVEL_RING, ringGradientClass } from '@/lib/chairLevel';
import { useAuth } from '@/contexts/AuthContext';
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

  // Compteur d'abonnés vivant : ProfileActions (composant frère) émet un
  // événement à chaque follow/unfollow réussi — le bandeau de stats se met à
  // jour immédiatement au lieu d'attendre un rechargement de page.
  const [followerDelta, setFollowerDelta] = useState(0);
  useEffect(() => {
    function onFollowChange(e: Event) {
      const detail = (e as CustomEvent<{ hairdresserId: number; delta: number }>).detail;
      if (detail?.hairdresserId === hairdresser.id) setFollowerDelta((v) => v + detail.delta);
    }
    window.addEventListener('chair:follow-change', onFollowChange);
    return () => window.removeEventListener('chair:follow-change', onFollowChange);
  }, [hairdresser.id]);
  const followersLive = Math.max(0, hairdresser.followers_count + followerDelta);
  // L'anneau raconte la MEILLEURE SPÉCIALITÉ (seule échelle de niveau depuis
  // la refonte du 31/08/2026) : couleur du palier, pastille « 1ᵉʳ · Coupe »
  // quand le rang local est fort (échantillon ≥ 5, sinon un « Top 1 » parmi
  // 1 seul coiffeur mentirait), « Expert · Coupe » sinon. Aucun anneau pour
  // un palier Nouveau — l'absence de distinction est une information honnête.
  const top          = hairdresser.specialty_highlights?.[0] ?? null;
  const levelColor   = top?.level_color ?? 'neutral';
  const ring         = LEVEL_RING[levelColor] ?? LEVEL_RING.neutral;
  const specCourt    = top?.specialty_name
    ? (top.specialty_name.length <= 12 ? top.specialty_name : top.specialty_name.split(' ')[0])
    : '';
  const pillLabel    = top && top.local_rank != null && top.local_rank <= 3 && (top.local_total ?? 0) >= 5
    ? `${top.local_rank}${top.local_rank === 1 ? 'ᵉʳ' : 'ᵉ'} · ${specCourt}`
    : top && top.level >= 1
      ? `${top.level_name} · ${specCourt}`
      : null;
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
    { value: String(followersLive), label: followersLive > 1 ? 'Abonnés' : 'Abonné' },
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
          {ring.show && pillLabel && (
            <div className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-bold tracking-[0.1em] uppercase whitespace-nowrap shadow-sm ${ring.pill}`}>
              {pillLabel}
            </div>
          )}
          <StreakFlameBadge days={streakDays} active={streakActive} coiffeurName={hairdresser.user.name} />
          {isOwnProfile && <PublicProfileOwnerActions variant="avatar" />}
        </div>

        <div className="flex-1 min-w-0 pb-1.5">
          {/* Nom TOUJOURS entier — jusqu'à 2 lignes. Vérification en sceau
              plein façon Twitter/Instagram (retour Julien : plus de pastille
              CHAIR+ ici, un seul beau badge de vérification) : BadgeCheck
              rempli noir, coche blanche — le rendu "sceau officiel". */}
          <h1 className="text-[20px] font-bold text-neutral-900 leading-tight break-words [overflow-wrap:anywhere] line-clamp-2">
            {hairdresser.user.name}
            {hairdresser.is_verified && (
              <BadgeCheck
                size={19}
                className="inline-block ml-1.5 -mt-0.5 fill-neutral-900 text-white"
                aria-label="Profil vérifié"
              />
            )}
          </h1>
          {metaLine && (
            <p className="text-[13px] text-neutral-500 mt-1 leading-snug flex items-center gap-1 min-w-0">
              {hairdresser.city && <MapPin size={11} className="flex-shrink-0" />}
              <span className="truncate">{metaLine}</span>
            </p>
          )}
        </div>
      </div>

      {/* ── 2. Spécialité / accroche ── */}
      {accroche && (
        <p className="text-[14px] text-neutral-700 leading-relaxed line-clamp-2 break-words [overflow-wrap:anywhere]">{accroche}</p>
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
