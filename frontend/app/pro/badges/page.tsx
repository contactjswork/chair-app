'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api, appointments as apptApi } from '@/lib/api';
import {
  type ApiHairdresserProfile, type ApiStats,
  type ApiChairBadge, type ApiChairLevel,
} from '@/lib/types';
import {
  Crown, Check, Lock, ChevronDown, ChevronRight, X,
  Camera, Image as ImageIcon, Sparkles, Layout, Trophy,
  Users, Star, Zap, MessageSquare, ThumbsUp, Award,
  Scissors, Briefcase, Sprout, TrendingUp, Medal,
  BadgeCheck, ArrowLeft, QrCode, ShieldCheck, Flame, MapPin,
} from 'lucide-react';
import DashboardNav from '@/components/layout/DashboardNav';

// ── Icons par badge ───────────────────────────────────────────────────────────

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
  visit_10:       QrCode,
  visit_50:       ShieldCheck,
  visit_250:      ShieldCheck,
  visit_1000:     Crown,
};

// ── Styles par tier ───────────────────────────────────────────────────────────

const TIER_STYLES: Record<number, { bg: string; icon: string; ring: string; label: string }> = {
  1: { bg: 'bg-amber-50',   icon: 'bg-amber-100 text-amber-600',      ring: 'ring-amber-200',   label: 'Bronze' },
  2: { bg: 'bg-slate-50',   icon: 'bg-slate-100 text-slate-500',       ring: 'ring-slate-200',   label: 'Argent' },
  3: { bg: 'bg-yellow-50',  icon: 'bg-yellow-100 text-yellow-600',     ring: 'ring-yellow-200',  label: 'Or' },
  4: { bg: 'bg-neutral-900',icon: 'bg-white/10 text-white',            ring: 'ring-neutral-700', label: 'Légendaire' },
};

// ── Progression d'un badge ────────────────────────────────────────────────────

interface BadgeProgress {
  badge: ApiChairBadge;
  current: number;
  target: number;
  pct: number;
}

function getBadgeProgress(
  badge: ApiChairBadge,
  stats: ApiStats | null,
  profile: ReturnType<typeof useRequireAuth>['user'],
  fullProfile: ApiHairdresserProfile | null,
  verifiedVisits: number,
): BadgeProgress | null {
  const hp = profile?.hairdresser_profile;
  const posts     = stats?.posts_count     ?? hp?.posts_count     ?? 0;
  const followers = stats?.followers_count ?? hp?.followers_count ?? 0;
  const reviews   = stats?.reviews_count   ?? hp?.reviews_count   ?? 0;
  const visits    = stats?.visits_count    ?? 0;

  const TARGETS: Record<string, { current: number; target: number }> = {
    portfolio_5:    { current: Math.min(posts, 5),          target: 5 },
    portfolio_20:   { current: Math.min(posts, 20),         target: 20 },
    portfolio_50:   { current: Math.min(posts, 50),         target: 50 },
    popular_30:     { current: Math.min(followers, 30),     target: 30 },
    influencer_100: { current: Math.min(followers, 100),    target: 100 },
    star_500:       { current: Math.min(followers, 500),    target: 500 },
    first_review:   { current: Math.min(reviews, 1),        target: 1 },
    well_rated:     { current: Math.min(reviews, 5),        target: 5 },
    excellent:      { current: Math.min(reviews, 10),       target: 10 },
    pro_10:         { current: Math.min(visits, 10),        target: 10 },
    expert_50:      { current: Math.min(visits, 50),        target: 50 },
    master_100:     { current: Math.min(visits, 100),       target: 100 },
    visit_10:       { current: Math.min(verifiedVisits, 10),  target: 10 },
    visit_50:       { current: Math.min(verifiedVisits, 50),  target: 50 },
    visit_250:      { current: Math.min(verifiedVisits, 250), target: 250 },
    visit_1000:     { current: Math.min(verifiedVisits, 1000),target: 1000 },
  };

  const t = TARGETS[badge.code];
  if (!t) return null;
  const pct = Math.round((t.current / t.target) * 100);
  return { badge, current: t.current, target: t.target, pct };
}

// ── Rareté label ─────────────────────────────────────────────────────────────

function rarityLabel(pct: number): { label: string; cls: string } {
  if (pct <= 5)  return { label: 'Ultra rare',   cls: 'bg-amber-100 text-amber-700 border-amber-200' };
  if (pct <= 15) return { label: 'Rare',          cls: 'bg-orange-50 text-orange-600 border-orange-200' };
  if (pct <= 35) return { label: 'Peu commun',    cls: 'bg-sky-50 text-sky-600 border-sky-200' };
  return              { label: 'Commun',          cls: 'bg-neutral-100 text-neutral-400 border-neutral-200' };
}

// ── Composant badge obtenu ────────────────────────────────────────────────────

function EarnedBadge({ badge }: { badge: ApiChairBadge }) {
  const Icon        = BADGE_ICONS[badge.code] ?? Award;
  const styles      = TIER_STYLES[badge.tier] ?? TIER_STYLES[1];
  const isDark      = badge.tier === 4;
  const rarity      = BADGE_RARITY[badge.code] ?? 50;
  const isUltraRare = rarity <= 5;
  const { label: rarLabel, cls: rarCls } = rarityLabel(rarity);

  return (
    <div className={`relative rounded-2xl overflow-hidden flex flex-col ring-1 ${styles.bg} ${styles.ring}`}>
      {/* Accent top bar par tier */}
      <div className={`h-1 w-full ${badge.tier === 1 ? 'bg-amber-400' : badge.tier === 2 ? 'bg-slate-400' : badge.tier === 3 ? 'bg-yellow-400' : 'bg-neutral-900'}`} />

      <div className="p-4 flex flex-col gap-3">
        {/* Icon + check */}
        <div className="flex items-start justify-between">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${styles.icon}`}>
            <Icon size={22} strokeWidth={1.5} />
          </div>
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-sm mt-0.5">
            <Check size={11} className="text-white" strokeWidth={3} />
          </div>
        </div>

        {/* Nom + desc */}
        <div>
          <p className={`text-[13px] font-bold leading-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>{badge.name}</p>
          <p className={`text-[11px] mt-0.5 leading-snug ${isDark ? 'text-white/60' : 'text-neutral-400'}`}>{badge.desc}</p>
        </div>

        {/* Footer : pts + rareté */}
        <div className="flex items-center justify-between mt-auto pt-1">
          {badge.pts > 0 ? (
            <span className={`text-[10px] font-bold ${isDark ? 'text-white/40' : 'text-neutral-300'}`}>+{badge.pts} pts</span>
          ) : <span />}
          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${rarCls}`}>
            {rarLabel} · {rarity}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Composant badge verrouillé (card) ─────────────────────────────────────────

function LockedBadgeCard({ badge }: { badge: ApiChairBadge }) {
  const Icon   = BADGE_ICONS[badge.code] ?? Award;
  const rarity = BADGE_RARITY[badge.code] ?? 50;
  const { label: rarLabel, cls: rarCls } = rarityLabel(rarity);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-neutral-100 bg-white flex flex-col">
      <div className="h-1 w-full bg-neutral-100" />
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center">
            <Icon size={22} className="text-neutral-300" strokeWidth={1.5} />
          </div>
          <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center mt-0.5">
            <Lock size={10} className="text-neutral-300" strokeWidth={2} />
          </div>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-neutral-400 leading-tight">{badge.name}</p>
          <p className="text-[11px] mt-0.5 text-neutral-300 leading-snug">{badge.desc}</p>
        </div>
        <div className="flex items-center justify-between mt-auto pt-1">
          {badge.pts > 0 ? (
            <span className="text-[10px] font-bold text-neutral-200">+{badge.pts} pts</span>
          ) : <span />}
          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${rarCls} opacity-60`}>
            {rarLabel} · {rarity}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Composant badge en progression ───────────────────────────────────────────

function ProgressBadge({ prog, href }: { prog: BadgeProgress; href: string }) {
  const Icon = BADGE_ICONS[prog.badge.code] ?? Award;

  return (
    <Link href={href} className="bg-white border border-neutral-100 rounded-2xl p-4 flex items-center gap-3.5 hover:border-neutral-200 hover:shadow-sm transition-all group">
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-xl bg-neutral-50 flex items-center justify-center group-hover:bg-neutral-100 transition-colors">
          <Icon size={20} className="text-neutral-500" strokeWidth={1.5} />
        </div>
        {/* Arc de progression */}
        <svg className="absolute -inset-1 w-14 h-14 -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="24" fill="none" stroke="#f5f5f5" strokeWidth="3" />
          <circle
            cx="28" cy="28" r="24" fill="none"
            stroke="#0a0a0a" strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${(prog.pct / 100) * 150.8} 150.8`}
          />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-neutral-900 truncate">{prog.badge.name}</p>
        <p className="text-[11px] text-neutral-400 truncate">{prog.badge.desc}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div className="h-full bg-neutral-900 rounded-full transition-all duration-500" style={{ width: `${prog.pct}%` }} />
          </div>
          <span className="text-[10px] font-bold text-neutral-500 flex-shrink-0">{prog.current}/{prog.target}</span>
        </div>
      </div>
      <ChevronRight size={14} className="text-neutral-300 group-hover:text-neutral-500 flex-shrink-0 transition-colors" />
    </Link>
  );
}


// ── Définition statique de tous les badges ────────────────────────────────────

const ALL_BADGES_DEF: ApiChairBadge[] = [
  { code: 'photo_added',    name: 'Première impression', desc: 'Photo de profil ajoutée',              category: 'profil',       pts: 20,  tier: 1, visible: false },
  { code: 'banner_added',   name: 'Vitrine',             desc: 'Bannière de profil ajoutée',            category: 'profil',       pts: 15,  tier: 1, visible: false },
  { code: 'full_profile',   name: 'Profil complet',      desc: 'Toutes les infos remplies',             category: 'profil',       pts: 50,  tier: 2, visible: true  },
  { code: 'first_post',     name: 'Première réalisation',desc: '1ère réalisation publiée',              category: 'contenu',      pts: 30,  tier: 1, visible: false },
  { code: 'portfolio_5',    name: 'Photographe',         desc: '5 réalisations publiées',               category: 'contenu',      pts: 50,  tier: 2, visible: true  },
  { code: 'portfolio_20',   name: 'Portfolio Pro',       desc: '20 réalisations publiées',              category: 'contenu',      pts: 100, tier: 3, visible: true  },
  { code: 'portfolio_50',   name: 'Artiste CHAIR',       desc: '50 réalisations publiées',              category: 'contenu',      pts: 200, tier: 4, visible: true  },
  { code: 'first_follower', name: 'Premiers fans',       desc: 'Premier abonné gagné',                  category: 'communauté',   pts: 15,  tier: 1, visible: false },
  { code: 'popular_30',     name: 'Populaire',           desc: '30 abonnés',                            category: 'communauté',   pts: 60,  tier: 2, visible: true  },
  { code: 'influencer_100', name: 'Influenceur',         desc: '100 abonnés',                           category: 'communauté',   pts: 120, tier: 3, visible: true  },
  { code: 'star_500',       name: 'Star CHAIR',          desc: '500 abonnés',                           category: 'communauté',   pts: 300, tier: 4, visible: true  },
  { code: 'first_review',   name: 'Voix des clients',    desc: 'Premier avis reçu',                     category: 'avis',         pts: 25,  tier: 1, visible: false },
  { code: 'well_rated',     name: 'Bien noté',           desc: 'Note ≥ 4.5 avec 5+ avis',              category: 'avis',         pts: 80,  tier: 2, visible: true  },
  { code: 'excellent',      name: 'Excellent',           desc: 'Note ≥ 4.8 avec 10+ avis',             category: 'avis',         pts: 150, tier: 3, visible: true  },
  { code: 'perfect',        name: 'Perfectionniste',     desc: 'Note 5.0 avec 5+ avis',                 category: 'avis',         pts: 250, tier: 4, visible: true  },
  { code: 'first_booking',  name: 'Premier client',      desc: '1er rendez-vous terminé',               category: 'réservations', pts: 50,  tier: 1, visible: false },
  { code: 'pro_10',         name: 'Pro confirmé',        desc: '10 rendez-vous réalisés',               category: 'réservations', pts: 100, tier: 2, visible: true  },
  { code: 'expert_50',      name: 'Expert',              desc: '50 rendez-vous réalisés',               category: 'réservations', pts: 250, tier: 3, visible: true  },
  { code: 'master_100',     name: 'Maestro',             desc: '100 rendez-vous réalisés',              category: 'réservations', pts: 500, tier: 4, visible: true  },
  { code: 'visit_10',       name: 'Actif certifié',      desc: '10 visites vérifiées par QR CHAIR',     category: 'visites',      pts: 30,  tier: 1, visible: true  },
  { code: 'visit_50',       name: 'Pro certifié',        desc: '50 visites vérifiées par QR CHAIR',     category: 'visites',      pts: 80,  tier: 2, visible: true  },
  { code: 'visit_250',      name: 'Expert certifié',     desc: '250 visites vérifiées par QR CHAIR',    category: 'visites',      pts: 200, tier: 3, visible: true  },
  { code: 'visit_1000',     name: 'Maestro certifié',    desc: '1000 visites vérifiées par QR CHAIR',   category: 'visites',      pts: 500, tier: 4, visible: true  },
  { code: 'verified',       name: 'Certifié CHAIR',      desc: 'Profil vérifié par CHAIR',              category: 'spécial',      pts: 100, tier: 3, visible: true  },
  { code: 'new_talent',     name: 'Nouveau talent',      desc: 'Nouveau sur la plateforme',             category: 'spécial',      pts: 0,   tier: 1, visible: true  },
  { code: 'top_10',         name: 'Top 10%',             desc: 'Parmi les meilleurs coiffeurs CHAIR',   category: 'spécial',      pts: 150, tier: 4, visible: true  },
];

// ── Rareté des badges (% de coiffeurs qui l'ont) ─────────────────────────────

const BADGE_RARITY: Record<string, number> = {
  photo_added: 82,    banner_added: 58,   full_profile: 43,
  first_post: 71,     portfolio_5: 38,    portfolio_20: 14,  portfolio_50: 3,
  first_follower: 67, popular_30: 19,     influencer_100: 7, star_500: 1,
  first_review: 52,   well_rated: 23,     excellent: 9,      perfect: 2,
  first_booking: 48,  pro_10: 21,         expert_50: 7,      master_100: 2,
  visit_10: 28,       visit_50: 11,       visit_250: 3,      visit_1000: 1,
  verified: 11,       new_talent: 100,    top_10: 10,
};

// ── Avantages par niveau ──────────────────────────────────────────────────────

const LEVEL_PERKS: Record<string, string[]> = {
  neutral: ['Profil visible sur CHAIR'],
  bronze:  ['Apparaît dans les résultats de recherche', 'Ring "Actif" sur votre carte publique'],
  silver:  ['Mis en avant dans "Coiffeurs à la une"', 'Badge Confirmé affiché sur votre carte', 'Priorité affichage local'],
  gold:    ['Priorité dans les recherches locales', 'Badge Expert doré visible par les clients', 'Accès section "Top coiffeurs"'],
  purple:  ['Featured en homepage CHAIR', 'Badge Elite violet exclusif', 'Profil mis en avant dans votre ville'],
  diamond: ['Profil épinglé en tête des résultats', 'Statut Légende CHAIR à vie', 'Badge légendaire ultra-exclusif'],
};

// ── Href d'action par badge ───────────────────────────────────────────────────

const BADGE_HREF: Record<string, string> = {
  photo_added: '/pro/profil', banner_added: '/pro/profil',
  full_profile: '/pro/profil',
  first_post: '/pro/realisations', portfolio_5: '/pro/realisations',
  portfolio_20: '/pro/realisations', portfolio_50: '/pro/realisations',
  first_follower: '/pro', popular_30: '/pro',
  influencer_100: '/pro', star_500: '/pro',
  first_review: '/pro/reservations', well_rated: '/pro/reservations',
  excellent: '/pro/reservations', perfect: '/pro/reservations',
  first_booking: '/pro/reservations', pro_10: '/pro/reservations',
  expert_50: '/pro/reservations', master_100: '/pro/reservations',
  visit_10: '/pro/mon-qr', visit_50: '/pro/mon-qr',
  visit_250: '/pro/mon-qr', visit_1000: '/pro/mon-qr',
  verified: '/pro/profil', new_talent: '/pro/realisations',
  top_10: '/pro',
};

// ── Définition des paliers CHAIR ─────────────────────────────────────────────

const LEVELS_DEF = [
  { color: 'neutral', name: 'Débutant',      minPts: 0,    tier: 0 },
  { color: 'bronze',  name: 'Actif',         minPts: 100,  tier: 1 },
  { color: 'silver',  name: 'Confirmé',      minPts: 250,  tier: 2 },
  { color: 'gold',    name: 'Expert',        minPts: 500,  tier: 3 },
  { color: 'purple',  name: 'Elite',         minPts: 1000, tier: 4 },
  { color: 'diamond', name: 'Légende CHAIR', minPts: 2500, tier: 5 },
] as const;

// Badges associés à chaque palier par tier (badge.tier = 0 → Débutant, 1 → Actif, etc.)
const BADGE_TIER_MAP: Record<number, string[]> = {
  0: ['new_talent'],
  1: ['photo_added', 'banner_added', 'first_post', 'first_follower', 'first_review', 'first_booking'],
  2: ['full_profile', 'portfolio_5', 'popular_30', 'well_rated', 'pro_10', 'visit_10'],
  3: ['portfolio_20', 'influencer_100', 'excellent', 'expert_50', 'visit_50', 'verified'],
  4: ['portfolio_50', 'star_500', 'perfect', 'master_100', 'visit_250', 'top_10'],
  5: ['visit_1000'],
};

const LEVEL_HERO: Record<string, { bg: string; dot: string; text: string; pill: string }> = {
  neutral: { bg: 'bg-neutral-100',  dot: 'bg-neutral-300',  text: 'text-neutral-500',  pill: 'bg-neutral-200 text-neutral-600' },
  bronze:  { bg: 'bg-amber-400',    dot: 'bg-amber-400',    text: 'text-amber-700',    pill: 'bg-amber-400 text-white'         },
  silver:  { bg: 'bg-neutral-300',  dot: 'bg-neutral-400',  text: 'text-neutral-600',  pill: 'bg-neutral-300 text-neutral-800' },
  gold:    { bg: 'bg-yellow-400',   dot: 'bg-yellow-400',   text: 'text-yellow-700',   pill: 'bg-yellow-400 text-neutral-900'  },
  purple:  { bg: 'bg-purple-500',   dot: 'bg-purple-500',   text: 'text-purple-700',   pill: 'bg-purple-500 text-white'        },
  diamond: { bg: 'bg-neutral-900',  dot: 'bg-neutral-900',  text: 'text-neutral-900',  pill: 'bg-neutral-900 text-white'       },
};

// ── Roadmap modal ─────────────────────────────────────────────────────────────

function RoadmapSheet({
  open,
  onClose,
  currentColor,
  currentPts,
  unlockedCodes,
}: {
  open: boolean;
  onClose: () => void;
  currentColor: string;
  currentPts: number;
  unlockedCodes: Set<string>;
}) {
  const currentIdx = LEVELS_DEF.findIndex((l) => l.color === currentColor);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out max-h-[90vh] flex flex-col ${open ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Handle + header */}
        <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-neutral-100">
          <div className="w-10 h-1 rounded-full bg-neutral-200 mx-auto mb-4" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-neutral-400">Roadmap CHAIR</p>
              <h2 className="text-lg font-black text-neutral-900 leading-tight">Tous les paliers</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors"
            >
              <X size={14} className="text-neutral-500" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-0">
          {LEVELS_DEF.map((level, idx) => {
            const hero      = LEVEL_HERO[level.color];
            const isPast    = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const isFuture  = idx > currentIdx;
            const isLast    = idx === LEVELS_DEF.length - 1;

            const levelBadges = (BADGE_TIER_MAP[idx] ?? [])
              .map((code) => ALL_BADGES_DEF.find((b) => b.code === code))
              .filter(Boolean) as ApiChairBadge[];

            const earnedInLevel  = levelBadges.filter((b) => unlockedCodes.has(b.code));
            const lockedInLevel  = levelBadges.filter((b) => !unlockedCodes.has(b.code));

            return (
              <div key={level.color} className="flex gap-4">
                {/* Timeline colonne gauche */}
                <div className="flex flex-col items-center flex-shrink-0 w-9">
                  {/* Dot */}
                  <div
                    className={`relative w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                      isCurrent
                        ? `${hero.bg} border-transparent shadow-lg`
                        : isPast
                        ? 'bg-green-500 border-transparent'
                        : 'bg-neutral-100 border-neutral-200'
                    }`}
                  >
                    {isPast ? (
                      <Check size={14} className="text-white" strokeWidth={3} />
                    ) : isCurrent ? (
                      <MapPin size={14} className="text-white" strokeWidth={2.5} />
                    ) : (
                      <Lock size={11} className="text-neutral-300" strokeWidth={2} />
                    )}
                  </div>
                  {/* Ligne verticale */}
                  {!isLast && (
                    <div className={`w-0.5 flex-1 mt-1 mb-1 rounded-full min-h-[20px] ${isPast || isCurrent ? 'bg-neutral-200' : 'bg-neutral-100'}`} />
                  )}
                </div>

                {/* Contenu droite */}
                <div className={`pb-6 flex-1 min-w-0 ${isLast ? 'pb-2' : ''}`}>
                  {/* Titre palier */}
                  <div className="flex items-center gap-2 mb-2 mt-1.5">
                    <span className={`text-[14px] font-black tracking-tight ${isFuture ? 'text-neutral-300' : 'text-neutral-900'}`}>
                      {level.name}
                    </span>
                    {isCurrent && (
                      <span className="text-[8px] font-bold tracking-[0.15em] uppercase bg-neutral-900 text-white px-2 py-0.5 rounded-full">
                        Actuel
                      </span>
                    )}
                    <span className={`ml-auto text-[11px] font-semibold ${isFuture ? 'text-neutral-200' : 'text-neutral-400'}`}>
                      {level.minPts > 0 ? `${level.minPts} pts` : 'Départ'}
                    </span>
                  </div>

                  {/* Badges de ce palier */}
                  {levelBadges.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {earnedInLevel.map((b) => {
                        const Icon = BADGE_ICONS[b.code] ?? Award;
                        return (
                          <div
                            key={b.code}
                            title={b.name}
                            className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 border border-green-100"
                          >
                            <Check size={8} className="text-green-500" strokeWidth={3} />
                            <Icon size={10} className="text-green-600" strokeWidth={2} />
                            <span className="text-[9px] font-bold text-green-700 leading-none">{b.name}</span>
                          </div>
                        );
                      })}
                      {lockedInLevel.map((b) => {
                        const Icon = BADGE_ICONS[b.code] ?? Award;
                        return (
                          <div
                            key={b.code}
                            title={b.desc}
                            className={`flex items-center gap-1 px-2 py-1 rounded-full border ${isFuture ? 'bg-neutral-50 border-neutral-100 opacity-40' : 'bg-neutral-50 border-neutral-100'}`}
                          >
                            <Lock size={7} className="text-neutral-300" strokeWidth={2} />
                            <Icon size={10} className="text-neutral-300" strokeWidth={2} />
                            <span className="text-[9px] font-semibold text-neutral-300 leading-none">{b.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Avantages du niveau */}
                  {LEVEL_PERKS[level.color] && LEVEL_PERKS[level.color].length > 0 && (
                    <div className={`mt-2.5 space-y-1 ${isFuture ? 'opacity-30' : ''}`}>
                      {LEVEL_PERKS[level.color].map((perk, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <Star size={8} className={isPast || isCurrent ? 'text-amber-400' : 'text-neutral-300'} fill={isPast || isCurrent ? 'currentColor' : 'none'} />
                          <span className={`text-[10px] font-medium ${isPast || isCurrent ? 'text-neutral-500' : 'text-neutral-300'}`}>{perk}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pts gagnés sur ce palier si actuel */}
                  {isCurrent && (
                    <p className="text-[10px] text-neutral-400 mt-2 font-semibold">
                      {currentPts} pts · {earnedInLevel.length}/{levelBadges.length} badges débloqués
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BadgesPage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);

  const [fullProfile,    setFullProfile]    = useState<ApiHairdresserProfile | null>(null);
  const [stats,          setStats]          = useState<ApiStats | null>(null);
  const [chairBadgesAll, setChairBadgesAll] = useState<ApiChairBadge[]>([]);
  const [chairLevel,     setChairLevel]     = useState<ApiChairLevel | null>(null);
  const [verifiedVisits, setVerifiedVisits] = useState(0);
  const [dataLoading,    setDataLoading]    = useState(true);
  const [lockedOpen,     setLockedOpen]     = useState(false);
  const [showRoadmap,    setShowRoadmap]    = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.allSettled([
      api.get<ApiHairdresserProfile & {
        profile?: ApiHairdresserProfile;
        chair_badges_all?: ApiChairBadge[];
        chair_level?: ApiChairLevel;
      }>('/profile'),
      apptApi.getStats(),
    ]).then(([prof, st]) => {
      if (prof.status === 'fulfilled') {
        const p = prof.value;
        const fp = (p.profile ?? p) as ApiHairdresserProfile;
        setFullProfile(fp);
        setVerifiedVisits(fp.verified_visits_count ?? 0);
        if (p.chair_badges_all) setChairBadgesAll(p.chair_badges_all);
        if (p.chair_level)      setChairLevel(p.chair_level);
      }
      if (st.status === 'fulfilled') setStats(st.value as ApiStats);
    }).finally(() => setDataLoading(false));
  }, [user]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  const unlockedCodes = new Set(chairBadgesAll.map((b) => b.code));
  const earnedBadges  = ALL_BADGES_DEF.filter((b) => unlockedCodes.has(b.code));
  const lockedBadges  = ALL_BADGES_DEF.filter((b) => !unlockedCodes.has(b.code));

  // Badges en progression : locked, avec une cible définie, triés par % de progression décroissant
  const inProgress: BadgeProgress[] = lockedBadges
    .map((b) => getBadgeProgress(b as ApiChairBadge, stats, user, fullProfile, verifiedVisits))
    .filter((p): p is BadgeProgress => p !== null && p.pct > 0 && p.pct < 100)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4);

  // Prochains badges à atteindre (0% de progression, les plus proches par tier)
  const nextTargets: BadgeProgress[] = lockedBadges
    .map((b) => getBadgeProgress(b as ApiChairBadge, stats, user, fullProfile, verifiedVisits))
    .filter((p): p is BadgeProgress => p !== null && p.pct === 0)
    .sort((a, b) => (a.badge.pts - b.badge.pts))
    .slice(0, 3);

  const levelColor = chairLevel?.color ?? 'neutral';

  // Couleurs du hero niveau
  const heroClass: Record<string, string> = {
    neutral: 'bg-neutral-900',
    bronze:  'bg-gradient-to-br from-amber-500 to-amber-600',
    silver:  'bg-gradient-to-br from-slate-400 to-slate-500',
    gold:    'bg-gradient-to-br from-yellow-400 to-amber-500',
    purple:  'bg-gradient-to-br from-purple-500 to-purple-700',
    diamond: 'bg-gradient-to-br from-neutral-800 to-neutral-900',
  };
  const heroBg = heroClass[levelColor] ?? heroClass.neutral;

  return (
    <div className="min-h-screen bg-neutral-50">
      <DashboardNav />

      {/* Mobile top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-neutral-100 px-4 h-14 flex items-center md:hidden">
        <Link href="/pro" className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors mr-auto">
          <ArrowLeft size={16} />
          <span className="text-xs font-medium">Tableau de bord</span>
        </Link>
        <span className="text-sm font-bold tracking-tight text-neutral-900 absolute left-1/2 -translate-x-1/2">Badges</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-5 md:pt-10 pb-28 md:pb-10 space-y-5">

        {/* Desktop header */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/pro" className="flex items-center gap-1.5 text-neutral-400 hover:text-neutral-700 transition-colors">
            <ArrowLeft size={14} />
            <span className="text-xs">Retour</span>
          </Link>
          <span className="text-neutral-200">/</span>
          <h1 className="text-lg font-bold text-neutral-900">Badges CHAIR</h1>
        </div>

        {/* ── HERO NIVEAU ── */}
        {dataLoading ? (
          <div className="h-44 bg-neutral-200 rounded-2xl animate-pulse" />
        ) : chairLevel ? (
          <button
            onClick={() => setShowRoadmap(true)}
            className={`w-full text-left rounded-2xl p-6 ${heroBg} active:scale-[0.98] transition-transform`}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/50 mb-1">Niveau CHAIR</p>
                <h2 className="text-4xl font-black text-white tracking-tight leading-none">{chairLevel.name}</h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm font-semibold text-white/70">{chairLevel.points} pts</span>
                  <span className="w-1 h-1 rounded-full bg-white/30" />
                  <span className="text-sm font-semibold text-white/70">
                    {earnedBadges.length} badge{earnedBadges.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {/* Badge le plus rare obtenu */}
                {(() => {
                  const rarest = [...earnedBadges].sort((a, b) =>
                    (BADGE_RARITY[a.code] ?? 100) - (BADGE_RARITY[b.code] ?? 100)
                  )[0];
                  if (!rarest || (BADGE_RARITY[rarest.code] ?? 100) > 20) return null;
                  return (
                    <div className="flex items-center gap-1.5 mt-2 bg-white/10 rounded-full px-2.5 py-1 w-fit">
                      <Star size={9} className="text-amber-300" fill="currentColor" />
                      <span className="text-[9px] font-bold text-white/80">
                        {rarest.name} — top {BADGE_RARITY[rarest.code]}% des coiffeurs
                      </span>
                    </div>
                  );
                })()}
              </div>
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <Crown size={28} className="text-white" strokeWidth={1.5} />
              </div>
            </div>

            {/* Barre progression */}
            {chairLevel.next ? (
              <div>
                <div className="h-2.5 bg-white/15 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-700"
                    style={{ width: `${chairLevel.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-white/50">
                    {chairLevel.next.min - chairLevel.points} pts pour atteindre <span className="text-white/80">{chairLevel.next.name}</span>
                  </p>
                  <p className="text-[11px] font-bold text-white/50">{chairLevel.progress}%</p>
                </div>
              </div>
            ) : (
              <p className="text-sm font-bold text-white/60">Niveau maximum — vous êtes une légende</p>
            )}

            {/* Hint tap */}
            <div className="flex items-center gap-1 mt-3 opacity-50">
              <TrendingUp size={10} className="text-white" />
              <span className="text-[9px] font-semibold text-white tracking-[0.1em] uppercase">Voir la roadmap</span>
            </div>
          </button>
        ) : null}

        {/* ── BADGES OBTENUS ── */}
        {!dataLoading && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={14} className="text-neutral-400" strokeWidth={1.5} />
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">
                Badges obtenus
              </p>
              <span className="ml-auto text-[10px] font-bold text-neutral-300">{earnedBadges.length}/{ALL_BADGES_DEF.length}</span>
            </div>

            {earnedBadges.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {earnedBadges.map((b) => (
                  <EarnedBadge key={b.code} badge={b as ApiChairBadge} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-neutral-100 px-5 py-10 text-center">
                <Trophy size={28} className="text-neutral-200 mx-auto mb-2" />
                <p className="text-sm font-semibold text-neutral-400">Aucun badge encore</p>
                <p className="text-[12px] text-neutral-300 mt-1">Complétez votre profil pour débloquer vos premiers badges</p>
                <Link href="/pro/profil" className="inline-block mt-4 text-xs font-bold bg-neutral-900 text-white px-4 py-2.5 rounded-xl">
                  Compléter mon profil
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── EN COURS DE PROGRESSION ── */}
        {!dataLoading && inProgress.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Flame size={14} className="text-neutral-400" strokeWidth={1.5} />
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">En cours</p>
            </div>
            <div className="space-y-2.5">
              {inProgress.map((prog) => (
                <ProgressBadge
                  key={prog.badge.code}
                  prog={prog}
                  href={BADGE_HREF[prog.badge.code] ?? '/pro'}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── PROCHAINS OBJECTIFS ── */}
        {!dataLoading && nextTargets.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-neutral-400" strokeWidth={1.5} />
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">Prochains objectifs</p>
            </div>
            <div className="space-y-2.5">
              {nextTargets.map((prog) => (
                <ProgressBadge
                  key={prog.badge.code}
                  prog={prog}
                  href={BADGE_HREF[prog.badge.code] ?? '/pro'}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── BADGES VERROUILLÉS ── */}
        {!dataLoading && lockedBadges.length > 0 && (
          <div>
            <button
              onClick={() => setLockedOpen((v) => !v)}
              className="flex items-center gap-2 w-full text-left mb-3 group"
            >
              <Lock size={14} className="text-neutral-300" strokeWidth={1.5} />
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-300 group-hover:text-neutral-500 transition-colors">
                À débloquer ({lockedBadges.length})
              </p>
              <ChevronDown
                size={14}
                className={`ml-auto text-neutral-300 transition-transform group-hover:text-neutral-500 ${lockedOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {lockedOpen && (
              <div className="grid grid-cols-2 gap-3">
                {lockedBadges.map((b) => (
                  <LockedBadgeCard key={b.code} badge={b as ApiChairBadge} />
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── ROADMAP SHEET ── */}
      <RoadmapSheet
        open={showRoadmap}
        onClose={() => setShowRoadmap(false)}
        currentColor={levelColor}
        currentPts={chairLevel?.points ?? 0}
        unlockedCodes={unlockedCodes}
      />
    </div>
  );
}
