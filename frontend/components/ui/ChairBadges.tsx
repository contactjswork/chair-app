'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { LEVEL_STYLES } from '@/lib/chairLevel';

import {
  Camera, Image as ImageIcon, Sparkles,
  Layout, Trophy, Crown, Users, Star, Zap,
  MessageSquare, Award, BadgeCheck,
  Scissors, Briefcase, Sprout, TrendingUp, Medal,
  Bookmark, ShieldCheck, GraduationCap, Target, Flame, X, ChevronDown, BookOpen,
  CalendarClock, Rocket, Globe, Heart,
} from 'lucide-react';
import type { ApiChairBadge, ApiChairLevel } from '@/lib/types';

// ── Icon mapping ──────────────────────────────────────────────────────────────

export const BADGE_ICONS: Record<string, React.ElementType> = {
  photo_added:    Camera,
  banner_added:   ImageIcon,
  full_profile:   Sparkles,
  first_post:     ImageIcon,
  portfolio_10:   Layout,
  portfolio_50:   Trophy,
  portfolio_300:  Crown,
  follower_100:   Users,
  follower_500:   Star,
  follower_2500:  Zap,
  follower_15000: Crown,
  veteran_3m:     CalendarClock,
  veteran_1y:     CalendarClock,
  veteran_3y:     CalendarClock,
  veteran_7y:     CalendarClock,
  verified:       BadgeCheck,
  new_talent:     Sprout,
  top_10_local:        TrendingUp,
  top_1_percent:       Medal,
  pioneer_chair:       Rocket,
  national_reference:  Globe,
  ambassador_program:  Heart,
  ambassador_national: Heart,
  identity_verified: ShieldCheck,
  siret_verified:    ShieldCheck,
  formation_badge:   BookOpen,
  diploma_added:     GraduationCap,
  pro_active:        Briefcase,
  streak_7:          Flame,
  streak_30:         Flame,
  streak_100:        Flame,
  streak_365:        Flame,
  weekly_4:          Flame,
  perfect_day_1:     Target,
  perfect_week_7:    Target,
  perfect_month_30:  Target,
  perfect_100:       Target,
};

// ── Icônes des paliers MÉTIER par spécialité (badges dynamiques) ────────────

export const METIER_LEVEL_ICONS: Record<number, React.ElementType> = {
  2: Scissors,
  3: Award,
  4: MessageSquare,
  5: Crown,
};

// ── Tier styles (chips / pills) ─────────────────────────────────────────────

const TIER_STYLES: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  2: { bg: 'bg-neutral-100',text: 'text-neutral-600',  border: 'border-neutral-200' },
  3: { bg: 'bg-yellow-50',  text: 'text-yellow-700',   border: 'border-yellow-200' },
  4: { bg: 'bg-neutral-900',text: 'text-white',         border: 'border-neutral-900' },
};

// ── Medaillon de badge — icône premium, dégradé métal par tier ──────────────
// Remplace les carrés plats colorés par une pièce/médaille avec relief,
// cohérent partout où un badge est affiché (dashboard, profil public).

const TIER_MEDAL: Record<number, { gradient: string; icon: string; ringCls: string; label: string }> = {
  1: { gradient: 'bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700',    icon: 'text-white',        ringCls: 'ring-amber-200',   label: 'Bronze' },
  2: { gradient: 'bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600',    icon: 'text-white',        ringCls: 'ring-slate-200',   label: 'Argent' },
  3: { gradient: 'bg-gradient-to-br from-yellow-200 via-amber-400 to-yellow-600',  icon: 'text-neutral-900',  ringCls: 'ring-yellow-200',  label: 'Or' },
  4: { gradient: 'bg-gradient-to-br from-neutral-600 via-neutral-900 to-black',    icon: 'text-white',        ringCls: 'ring-neutral-400', label: 'Légendaire' },
};

export function BadgeMedallion({
  code, tier, size = 44, locked = false,
}: { code: string; tier: 1 | 2 | 3 | 4; size?: number; locked?: boolean }) {
  const Icon = BADGE_ICONS[code] ?? Award;

  if (locked) {
    return (
      <div
        className="relative rounded-full flex items-center justify-center bg-neutral-100 ring-1 ring-neutral-200 flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <Icon size={size * 0.42} className="text-neutral-300" strokeWidth={1.5} />
      </div>
    );
  }

  const medal = TIER_MEDAL[tier] ?? TIER_MEDAL[1];

  return (
    <div
      className={`relative rounded-full flex items-center justify-center shadow-md ring-2 flex-shrink-0 ${medal.gradient} ${medal.ringCls}`}
      style={{ width: size, height: size }}
    >
      {/* Reflet — donne le relief "médaille" */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/45 via-transparent to-black/25" />
      <Icon size={size * 0.42} className={`relative ${medal.icon}`} strokeWidth={2} />
    </div>
  );
}

// ── Fenêtre d'explication d'un badge ─────────────────────────────────────────
// Un client qui voit "Maestro certifié" ne sait pas ce que ça veut dire.
// Cliquer sur n'importe quel badge ouvre ce volet — icône + nom + une phrase
// qui raconte concrètement ce que LE coiffeur a fait pour l'obtenir (pas la
// règle générique, pas les points/tier — jargon réservé au coiffeur).

const BADGE_STORY: Record<string, string> = {
  photo_added:    '{name} a ajouté une photo de profil.',
  banner_added:   '{name} a ajouté une photo de couverture à son profil.',
  full_profile:   '{name} a complété toutes les informations de son profil CHAIR.',
  first_post:     '{name} a publié sa première réalisation sur CHAIR.',
  portfolio_10:   '{name} a publié 10 réalisations, toutes spécialités confondues.',
  portfolio_50:   '{name} a publié 50 réalisations, toutes spécialités confondues.',
  portfolio_300:  '{name} a publié 300 réalisations — des années de travail documentées.',
  follower_100:   '{name} est suivi par 100 personnes sur CHAIR.',
  follower_500:   '{name} est suivi par 500 personnes sur CHAIR.',
  follower_2500:  '{name} est suivi par 2 500 personnes sur CHAIR.',
  follower_15000: '{name} est suivi par 15 000 personnes sur CHAIR — une icône de la plateforme.',
  veteran_3m:     '{name} est sur CHAIR depuis 3 mois.',
  veteran_1y:     '{name} est sur CHAIR depuis 1 an.',
  veteran_3y:     '{name} est sur CHAIR depuis 3 ans.',
  veteran_7y:     '{name} est sur CHAIR depuis 7 ans — un pilier de la plateforme.',
  verified:       '{name} est abonné CHAIR+.',
  new_talent:     '{name} vient de rejoindre CHAIR et a publié sa première réalisation.',
  top_10_local:   '{name} fait partie des 10 coiffeurs les mieux classés d’une spécialité, dans sa ville.',
  top_1_percent:  '{name} fait partie du 1% des coiffeurs les mieux classés sur toute la plateforme CHAIR.',
  pioneer_chair:  '{name} fait partie des 200 premiers coiffeurs à avoir rejoint CHAIR.',
  national_reference:  '{name} fait partie du 1% des meilleurs coiffeurs de sa spécialité, à l’échelle de la France entière.',
  ambassador_program:  '{name} a parrainé 20 personnes sur CHAIR.',
  ambassador_national: '{name} a parrainé 100 personnes sur CHAIR — a fait grandir le réseau à l’échelle nationale.',
  identity_verified: 'L’identité de {name} a été confirmée par CHAIR.',
  siret_verified:    'Le SIRET du salon de {name} a été vérifié.',
  formation_badge:   '{name} a indiqué avoir suivi une formation professionnelle.',
  pro_active:        '{name} publie et travaille régulièrement sur CHAIR.',
  diploma_added:     '{name} a renseigné son diplôme officiel de coiffure (CAP, BP, BM...).',
  streak_7:       '{name} a été actif sur CHAIR 7 jours d’affilée.',
  streak_30:      '{name} a été actif sur CHAIR 30 jours d’affilée.',
  streak_100:     '{name} a été actif sur CHAIR 100 jours d’affilée.',
  streak_365:     '{name} a été actif sur CHAIR 365 jours d’affilée, sans interruption.',
  weekly_4:       '{name} a été actif 4 semaines d’affilée sur CHAIR.',
  perfect_day_1:     '{name} a atteint tous ses objectifs du jour au moins une fois.',
  perfect_week_7:    '{name} a atteint tous ses objectifs du jour, 7 fois au total.',
  perfect_month_30:  '{name} a atteint tous ses objectifs du jour, 30 fois au total.',
  perfect_100:       '{name} a atteint tous ses objectifs du jour, 100 fois au total.',
};

export function BadgeExplainSheet({
  badge, onClose, coiffeurName,
}: { badge: ApiChairBadge | null; onClose: () => void; coiffeurName?: string }) {
  if (!badge) return null;
  const medal = TIER_MEDAL[badge.tier] ?? TIER_MEDAL[1];
  const firstName = coiffeurName?.split(' ')[0] || 'Ce coiffeur';
  const story = BADGE_STORY[badge.code]?.replace('{name}', firstName) ?? badge.desc;

  // Portalé dans body, z-index au-dessus de la bottom nav (z-[60]) : un badge
  // peut être affiché n'importe où sur la page (dont des conteneurs
  // `relative z-10`) — sans ça le volet peut se retrouver piégé sous un CTA
  // sticky ou la bottom nav, et son texte coupé.
  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl shadow-2xl px-5 pt-5 pb-8 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[16px] font-bold text-neutral-900">Badge débloqué</p>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors flex-shrink-0"
          >
            <X size={15} />
          </button>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <BadgeMedallion code={badge.code} tier={badge.tier} size={52} />
          <div>
            <p className="text-[15px] font-bold text-neutral-900">{badge.name}</p>
            <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-300">{medal.label}</span>
          </div>
        </div>
        <p className="text-[13px] text-neutral-500 leading-relaxed">{story}</p>
      </div>
    </div>,
    document.body
  );
}

// ── Trophées — tous les badges visibles du coiffeur, en bas du profil public ──
// Plutôt qu'un chiffre compressé ("· 39") à côté de la photo, le détail
// complet vit ici : une vraie vitrine à trophées, chacun cliquable.

const COLLAPSED_COUNT = 8;

export function BadgeTrophyCase({ badges, coiffeurName }: { badges: ApiChairBadge[]; coiffeurName?: string }) {
  const [selected, setSelected] = useState<ApiChairBadge | null>(null);
  const [expanded, setExpanded] = useState(false);
  if (!badges.length) return null;

  // Meilleur en premier : tier le plus élevé (légendaire > or > argent > bronze),
  // puis le plus de points à tier égal — le client voit d'abord ce qui impressionne.
  const sorted = [...badges].sort((a, b) => (b.tier - a.tier) || (b.pts - a.pts));
  const hasMore = sorted.length > COLLAPSED_COUNT;
  const visible = expanded ? sorted : sorted.slice(0, COLLAPSED_COUNT);

  return (
    <div>
      <div className="grid grid-cols-4 gap-x-2 gap-y-5">
        {visible.map((b) => (
          <button
            key={b.code}
            onClick={() => setSelected(b)}
            className="flex flex-col items-center gap-1.5 text-center active:scale-95 transition-transform"
          >
            <BadgeMedallion code={b.code} tier={b.tier} size={48} />
            <span className="text-[10px] font-semibold text-neutral-600 leading-tight line-clamp-2">{b.name}</span>
          </button>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center justify-center gap-1.5 w-full mt-5 py-2.5 text-[12px] font-semibold text-neutral-500 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors"
        >
          {expanded ? 'Voir moins' : `Voir les ${sorted.length - COLLAPSED_COUNT} autres badges`}
          <ChevronDown size={13} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}

      <BadgeExplainSheet badge={selected} onClose={() => setSelected(null)} coiffeurName={coiffeurName} />
    </div>
  );
}

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
  return (
    <div title={`${badge.name} — ${badge.desc}`}>
      <BadgeMedallion code={badge.code} tier={badge.tier} size={36} />
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

// ── Badges "confiance client" (page profil public) ─────────────────────────────
// Tous les badges débloqués ne se valent pas pour un client qui hésite à
// réserver : "Nouveau talent" ou un streak interne ne rassurent personne.
// On ne montre que ceux qui répondent à "il a déjà fait ses preuves",
// classés du plus impressionnant au moins, et jamais plus de 3 — la
// crédibilité vient de la sélection, pas de la quantité.
const CLIENT_TRUST_PRIORITY: string[] = [
  'perfect', 'master_100', 'visit_1000', 'star_500',
  'excellent', 'expert_50', 'visit_250', 'identity_verified', 'siret_verified', 'verified', 'top_10',
  'influencer_100', 'portfolio_50', 'diploma_added',
  'well_rated', 'pro_10', 'visit_50', 'popular_30', 'portfolio_20', 'formation_badge',
  'visit_10',
];

const TRUST_TIER_STYLES: Record<number, { bg: string; text: string }> = {
  1: { bg: 'bg-white', text: 'text-neutral-700' },
  2: { bg: 'bg-white', text: 'text-neutral-700' },
  3: { bg: 'bg-white', text: 'text-neutral-900' },
  4: { bg: 'bg-neutral-900 border-neutral-900', text: 'text-white' },
};

function TrustBadgeCard({ badge }: { badge: ApiChairBadge }) {
  const styles = TRUST_TIER_STYLES[badge.tier] ?? TRUST_TIER_STYLES[1];

  return (
    <div
      title={badge.desc}
      className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border border-neutral-100 shadow-sm flex-shrink-0 ${styles.bg}`}
    >
      <BadgeMedallion code={badge.code} tier={badge.tier} size={24} />
      <span className={`text-[11px] font-semibold whitespace-nowrap ${styles.text}`}>{badge.name}</span>
    </div>
  );
}

export function TrustBadgesRow({ badges, coiffeurName }: { badges: ApiChairBadge[]; coiffeurName?: string }) {
  const [selected, setSelected] = useState<ApiChairBadge | null>(null);

  const curated = CLIENT_TRUST_PRIORITY
    .map((code) => badges.find((b) => b.code === code))
    .filter((b): b is ApiChairBadge => !!b)
    .slice(0, 3);

  if (curated.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {curated.map((b) => (
        <button key={b.code} onClick={() => setSelected(b)}>
          <TrustBadgeCard badge={b} />
        </button>
      ))}
      <BadgeExplainSheet badge={selected} onClose={() => setSelected(null)} coiffeurName={coiffeurName} />
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

