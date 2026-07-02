'use client';

import { LEVEL_STYLES } from '@/lib/chairLevel';

import {
  Camera, Image as ImageIcon, Sparkles,
  Layout, Trophy, Crown, Users, Star, Zap,
  MessageSquare, ThumbsUp, Award, BadgeCheck,
  Scissors, Briefcase, Sprout, TrendingUp, Medal,
  Bookmark,
} from 'lucide-react';
import type { ApiChairBadge, ApiChairLevel } from '@/lib/types';

// ── Icon mapping ──────────────────────────────────────────────────────────────

const BADGE_ICONS: Record<string, React.ElementType> = {
  photo_added:    Camera,
  banner_added:   ImageIcon,
  full_profile:   Sparkles,
  first_post:     ImageIcon,
  portfolio_5:    Layout,
  portfolio_20:   Trophy,
  portfolio_50:   Crown,
  first_follower: Users,
  popular_30:     Star,
  influencer_100: Zap,
  star_500:       Crown,
  first_review:   MessageSquare,
  well_rated:     ThumbsUp,
  excellent:      Award,
  perfect:        Medal,
  first_booking:  Scissors,
  pro_10:         Briefcase,
  expert_50:      Trophy,
  master_100:     Crown,
  verified:       BadgeCheck,
  new_talent:     Sprout,
  top_10:         TrendingUp,
};

// ── Tier styles ───────────────────────────────────────────────────────────────

const TIER_STYLES: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  2: { bg: 'bg-neutral-100',text: 'text-neutral-600',  border: 'border-neutral-200' },
  3: { bg: 'bg-yellow-50',  text: 'text-yellow-700',   border: 'border-yellow-200' },
  4: { bg: 'bg-neutral-900',text: 'text-white',         border: 'border-neutral-900' },
};

// Re-export depuis lib/chairLevel (pas de 'use client' → utilisable partout)
export { LEVEL_STYLES, LEVEL_RING, estimateLevelColor, ringGradientClass } from '@/lib/chairLevel';

// ── Badge chip (compact) ──────────────────────────────────────────────────────

export function BadgeChip({ badge, showLabel = true }: { badge: ApiChairBadge; showLabel?: boolean }) {
  const Icon   = BADGE_ICONS[badge.code] ?? Award;
  const styles = TIER_STYLES[badge.tier] ?? TIER_STYLES[1];

  return (
    <div
      title={badge.desc}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold tracking-wide uppercase ${styles.bg} ${styles.text} ${styles.border}`}
    >
      <Icon size={10} strokeWidth={2.5} />
      {showLabel && badge.name}
    </div>
  );
}

// ── Badge icon only (grid) ────────────────────────────────────────────────────

export function BadgeIcon({ badge }: { badge: ApiChairBadge }) {
  const Icon   = BADGE_ICONS[badge.code] ?? Award;
  const styles = TIER_STYLES[badge.tier] ?? TIER_STYLES[1];

  return (
    <div
      title={`${badge.name} — ${badge.desc}`}
      className={`w-9 h-9 rounded-xl flex items-center justify-center border ${styles.bg} ${styles.text} ${styles.border}`}
    >
      <Icon size={15} strokeWidth={2} />
    </div>
  );
}

// ── Level badge ───────────────────────────────────────────────────────────────

export function LevelBadge({ level, compact = false }: { level: ApiChairLevel; compact?: boolean }) {
  const styles = LEVEL_STYLES[level.color] ?? LEVEL_STYLES.neutral;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-[0.15em] uppercase border border-neutral-200 ${styles.bg} ${styles.text}`}>
        {level.name}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${styles.bg} ${styles.text}`}>
      <Crown size={12} strokeWidth={2.5} />
      {level.name}
      <span className="opacity-60">· {level.points} pts</span>
    </div>
  );
}

// ── Profil badges (utilisé sur la page publique) ──────────────────────────────

export function ProfileBadgesRow({ badges, level }: { badges: ApiChairBadge[]; level?: ApiChairLevel }) {
  if (!badges.length && !level) return null;
  const topBadges = badges.slice(0, 4);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {level && level.level > 0 && <LevelBadge level={level} compact />}
      {topBadges.map((b) => (
        <BadgeChip key={b.code} badge={b} showLabel />
      ))}
    </div>
  );
}

// ── Dashboard badges grid complet ─────────────────────────────────────────────

export function BadgesGrid({
  badges,
  allBadges,
  level,
}: {
  badges: ApiChairBadge[];         // débloqués visibles
  allBadges: ApiChairBadge[];      // tous débloqués
  level: ApiChairLevel;
}) {
  const levelStyle = LEVEL_STYLES[level.color] ?? LEVEL_STYLES.neutral;
  const lockedCount = 21 - allBadges.length; // 21 badges total

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">

      {/* Header level */}
      <div className="px-5 py-4 border-b border-neutral-50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-1">Niveau CHAIR</p>
            <div className="flex items-center gap-2">
              <span className={`text-xl font-bold ${level.color === 'diamond' ? 'text-neutral-900' : LEVEL_STYLES[level.color]?.text}`}>
                {level.name}
              </span>
              <span className="text-sm text-neutral-400">{level.points} pts</span>
            </div>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${levelStyle.bg}`}>
            <Crown size={20} className={levelStyle.text} strokeWidth={2} />
          </div>
        </div>
        {/* Barre progression */}
        {level.next && (
          <div>
            <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1.5">
              <span>{level.progress}% vers {level.next.name}</span>
              <span>{level.next.min - level.points} pts restants</span>
            </div>
            <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${levelStyle.bar}`}
                style={{ width: `${level.progress}%` }}
              />
            </div>
          </div>
        )}
        {!level.next && (
          <p className="text-xs font-semibold text-neutral-500">Niveau maximum atteint</p>
        )}
      </div>

      {/* Badges débloqués */}
      {allBadges.length > 0 && (
        <div className="px-5 py-4 border-b border-neutral-50">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">
            {allBadges.length} badge{allBadges.length > 1 ? 's' : ''} débloqué{allBadges.length > 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            {allBadges.map((b) => (
              <div key={b.code} title={b.desc}>
                <BadgeChip badge={b} showLabel />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prochains badges */}
      {lockedCount > 0 && (
        <div className="px-5 py-4">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-2">
            {lockedCount} badge{lockedCount > 1 ? 's' : ''} à débloquer
          </p>
          <p className="text-xs text-neutral-400">
            Continuez à développer votre profil — publiez des réalisations, obtenez des avis et faites des réservations pour progresser.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Client achievements ───────────────────────────────────────────────────────

interface ClientAchievement {
  icon: React.ElementType;
  name: string;
  desc: string;
  done: boolean;
  pts: number;
}

export function computeClientAchievements(params: {
  hasAvatar: boolean;
  hasCity: boolean;
  savedCount: number;
  followsCount: number;
  reviewsCount: number;
  bookingsCount: number;
}): { achievements: ClientAchievement[]; points: number; level: string } {
  const { hasAvatar, hasCity, savedCount, followsCount, reviewsCount, bookingsCount } = params;

  const all: ClientAchievement[] = [
    { icon: Camera,       name: 'Profil complété',    desc: 'Photo et ville ajoutées',        done: hasAvatar && hasCity,    pts: 15 },
    { icon: Bookmark,     name: 'Explorateur',         desc: '1 coiffeur sauvegardé',          done: savedCount >= 1,          pts: 10 },
    { icon: Star,         name: 'Passionné',           desc: '5 coiffeurs sauvegardés',        done: savedCount >= 5,          pts: 25 },
    { icon: Crown,        name: 'Collectionneur',      desc: '10 coiffeurs sauvegardés',       done: savedCount >= 10,         pts: 50 },
    { icon: Users,        name: 'Abonné',              desc: 'Suit 3 coiffeurs ou plus',       done: followsCount >= 3,        pts: 15 },
    { icon: MessageSquare,name: 'Voix de confiance',   desc: '1er avis laissé',                done: reviewsCount >= 1,        pts: 30 },
    { icon: Award,        name: 'Expert CHAIR',        desc: '5 avis laissés',                 done: reviewsCount >= 5,        pts: 75 },
    { icon: Scissors,     name: 'Client',              desc: '1er rendez-vous réalisé',        done: bookingsCount >= 1,       pts: 40 },
    { icon: Trophy,       name: 'Habitué',             desc: '5 rendez-vous réalisés',         done: bookingsCount >= 5,       pts: 100 },
  ];

  const points = all.filter((a) => a.done).reduce((acc, a) => acc + a.pts, 0);
  const level = points >= 200 ? 'Expert CHAIR' : points >= 100 ? 'Régulier' : points >= 40 ? 'Découvreur' : 'Nouveau';

  return { achievements: all, points, level };
}

