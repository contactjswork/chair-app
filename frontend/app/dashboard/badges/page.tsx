'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api, appointments as apptApi } from '@/lib/api';
import {
  type ApiHairdresserProfile, type ApiStats,
  type ApiChairBadge, type ApiChairLevel,
  type ApiServiceCategory, type ApiScheduleDay,
} from '@/lib/types';
import {
  Crown, Check, Lock, ChevronRight,
  Camera, Image as ImageIcon, Sparkles, Layout, Trophy,
  Users, Star, Zap, MessageSquare, ThumbsUp, Award,
  Scissors, Briefcase, Sprout, TrendingUp, Medal,
  BadgeCheck, ArrowLeft, QrCode, ShieldCheck,
} from 'lucide-react';
import { LEVEL_STYLES, LEVEL_RING, ringGradientClass } from '@/lib/chairLevel';
import DashboardNav from '@/components/layout/DashboardNav';

// ── Badge icons ───────────────────────────────────────────────────────────────

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

const TIER_BG: Record<number, string> = {
  1: 'bg-amber-50 border-amber-100 text-amber-700',
  2: 'bg-neutral-100 border-neutral-200 text-neutral-600',
  3: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  4: 'bg-neutral-900 border-neutral-900 text-white',
};

const TIER_ICON_BG: Record<number, string> = {
  1: 'bg-amber-100 text-amber-600',
  2: 'bg-neutral-200 text-neutral-500',
  3: 'bg-yellow-100 text-yellow-600',
  4: 'bg-white/10 text-white',
};

const TIER_LABEL: Record<number, string> = {
  1: 'Bronze', 2: 'Argent', 3: 'Or', 4: 'Légendaire',
};

// ── Critères avec progression ─────────────────────────────────────────────────

interface Criterion {
  icon: React.ElementType;
  label: string;
  desc: string;
  pts: number;
  done: boolean;
  current?: number;
  target?: number;
  href: string;
}

function getCriteria(
  user: ReturnType<typeof useRequireAuth>['user'],
  fullProfile: ApiHairdresserProfile | null,
  stats: ApiStats | null,
  servicesCount: number,
  scheduleSet: boolean,
  isIndependent: boolean,
  verifiedVisits: number,
): Criterion[] {
  if (!user) return [];
  const profile = user.hairdresser_profile;
  const posts    = stats?.posts_count    ?? profile?.posts_count    ?? 0;
  const reviews  = stats?.reviews_count  ?? profile?.reviews_count  ?? 0;
  const followers= stats?.followers_count?? profile?.followers_count?? 0;
  const visits   = stats?.visits_count   ?? 0;
  const specs    = fullProfile?.specialties?.length ?? 0;
  const rating   = parseFloat(stats?.avg_rating ?? profile?.avg_rating ?? '0');

  return [
    {
      icon: Camera, label: 'Photo de profil', pts: 12,
      desc: 'Les profils avec une photo reçoivent 5× plus de visites',
      done: !!user.avatar, href: '/dashboard/profil',
    },
    {
      icon: ImageIcon, label: 'Bannière', pts: 10,
      desc: 'Votre vitrine visuelle — la première chose qu\'on voit',
      done: !!fullProfile?.banner_image, href: '/dashboard/profil',
    },
    {
      icon: MessageSquare, label: 'Accroche', pts: 8,
      desc: 'Une phrase courte qui résume votre talent',
      done: !!profile?.tagline, href: '/dashboard/profil',
    },
    {
      icon: MessageSquare, label: 'Bio complète', pts: 8,
      desc: 'Parlez de vous, de votre parcours et de votre style',
      done: !!user.bio, href: '/dashboard/profil',
    },
    {
      icon: TrendingUp, label: 'Ville renseignée', pts: 5,
      desc: 'Indispensable pour apparaître dans les recherches locales',
      done: !!(profile?.city || user.city), href: '/dashboard/profil',
    },
    {
      icon: Sparkles, label: '2 spécialités', pts: 12,
      desc: 'Chaque spécialité = une nouvelle apparition dans la recherche',
      done: specs >= 2, current: Math.min(specs, 2), target: 2, href: '/dashboard/profil',
    },
    {
      icon: Trophy, label: '3 réalisations', pts: 20,
      desc: 'Les profils avec 3+ réalisations sont boostés dans la recherche',
      done: posts >= 3, current: Math.min(posts, 3), target: 3, href: '/dashboard/realisations',
    },
    {
      icon: Scissors, label: 'Services configurés', pts: 10,
      desc: 'Vos prestations rassurents les clients avant de vous contacter',
      done: servicesCount > 0, href: '/dashboard/services',
    },
    ...(isIndependent ? [{
      icon: Layout, label: 'Horaires définis', pts: 10,
      desc: 'Les clients veulent savoir quand vous êtes disponible',
      done: scheduleSet, href: '/dashboard/planning',
    }] : []),
    {
      icon: Star, label: 'Premier avis', pts: 5,
      desc: 'Un avis positif booste votre crédibilité instantanément',
      done: reviews >= 1, current: Math.min(reviews, 1), target: 1, href: '/dashboard/reservations',
    },
    // Badges progressifs
    {
      icon: Layout, label: '5 réalisations — Photographe', pts: 50,
      desc: 'Un portfolio solide attire les clients indécis',
      done: posts >= 5, current: Math.min(posts, 5), target: 5, href: '/dashboard/realisations',
    },
    {
      icon: Trophy, label: '20 réalisations — Portfolio Pro', pts: 100,
      desc: 'Vous faites partie des coiffeurs les plus actifs sur CHAIR',
      done: posts >= 20, current: Math.min(posts, 20), target: 20, href: '/dashboard/realisations',
    },
    {
      icon: Users, label: '30 abonnés — Populaire', pts: 60,
      desc: 'Une communauté commence à vous suivre',
      done: followers >= 30, current: Math.min(followers, 30), target: 30, href: '/dashboard',
    },
    {
      icon: Zap, label: '100 abonnés — Influenceur', pts: 120,
      desc: 'Vous avez une vraie audience sur CHAIR',
      done: followers >= 100, current: Math.min(followers, 100), target: 100, href: '/dashboard',
    },
    {
      icon: ThumbsUp, label: 'Note ≥ 4.5 · 5 avis — Bien noté', pts: 80,
      desc: 'Vos clients vous recommandent activement',
      done: reviews >= 5 && rating >= 4.5,
      current: reviews, target: 5, href: '/dashboard/reservations',
    },
    {
      icon: Award, label: 'Note ≥ 4.8 · 10 avis — Excellent', pts: 150,
      desc: 'Vous faites partie des meilleurs coiffeurs CHAIR',
      done: reviews >= 10 && rating >= 4.8,
      current: reviews, target: 10, href: '/dashboard/reservations',
    },
    {
      icon: Briefcase, label: '10 RDV réalisés — Pro confirmé', pts: 100,
      desc: 'Votre activité sur CHAIR est réelle et visible',
      done: visits >= 10, current: Math.min(visits, 10), target: 10, href: '/dashboard/reservations',
    },
    {
      icon: Crown, label: '50 RDV réalisés — Expert', pts: 250,
      desc: 'Vous êtes un coiffeur très actif sur la plateforme',
      done: visits >= 50, current: Math.min(visits, 50), target: 50, href: '/dashboard/reservations',
    },
    // Visites vérifiées QR
    {
      icon: QrCode, label: '10 visites QR — Actif certifié', pts: 30,
      desc: 'Activez votre QR Code et validez vos premières visites',
      done: verifiedVisits >= 10, current: Math.min(verifiedVisits, 10), target: 10, href: '/dashboard/mon-qr',
    },
    {
      icon: ShieldCheck, label: '50 visites QR — Pro certifié', pts: 80,
      desc: 'Vos clients valident leur passage — vous êtes actif',
      done: verifiedVisits >= 50, current: Math.min(verifiedVisits, 50), target: 50, href: '/dashboard/mon-qr',
    },
    {
      icon: ShieldCheck, label: '250 visites QR — Expert certifié', pts: 200,
      desc: 'Un des coiffeurs les plus actifs sur CHAIR',
      done: verifiedVisits >= 250, current: Math.min(verifiedVisits, 250), target: 250, href: '/dashboard/mon-qr',
    },
  ];
}

// ── Composant critère ────────────────────────────────────────────────────────

function CriterionRow({ c }: { c: Criterion }) {
  const Icon  = c.icon;
  const pct   = c.target ? Math.round(((c.current ?? 0) / c.target) * 100) : c.done ? 100 : 0;

  return (
    <Link href={c.href} className={`flex items-center gap-3 px-4 py-3.5 border-b border-neutral-50 last:border-0 transition-colors ${c.done ? '' : 'hover:bg-neutral-50'} group`}>
      {/* Status circle */}
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${c.done ? 'bg-neutral-900 border-neutral-900' : 'border-neutral-200'}`}>
        {c.done
          ? <Check size={11} className="text-white" strokeWidth={3} />
          : <Lock size={9} className="text-neutral-300" />
        }
      </div>

      {/* Icon */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${c.done ? 'bg-neutral-900' : 'bg-neutral-100'}`}>
        <Icon size={14} className={c.done ? 'text-white' : 'text-neutral-400'} strokeWidth={1.5} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className={`text-sm font-semibold ${c.done ? 'text-neutral-400 line-through' : 'text-neutral-900'}`}>{c.label}</p>
          <span className={`text-[10px] font-bold flex-shrink-0 ml-2 ${c.done ? 'text-neutral-300' : 'text-green-600'}`}>+{c.pts} pts</span>
        </div>
        <p className="text-[11px] text-neutral-400 leading-snug truncate">{c.desc}</p>
        {/* Barre de progression si critère partiel */}
        {!c.done && c.target !== undefined && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1 bg-neutral-100 rounded-full overflow-hidden">
              <div className="h-full bg-neutral-900 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-neutral-400 font-semibold flex-shrink-0">{c.current}/{c.target}</span>
          </div>
        )}
      </div>

      {!c.done && <ChevronRight size={13} className="text-neutral-300 group-hover:text-neutral-500 flex-shrink-0 transition-colors" />}
    </Link>
  );
}

// ── Composant badge card ──────────────────────────────────────────────────────

function BadgeCard({ badge, unlocked }: { badge: ApiChairBadge; unlocked: boolean }) {
  const Icon   = BADGE_ICONS[badge.code] ?? Award;
  const styles = unlocked ? TIER_BG[badge.tier] : 'bg-neutral-50 border-neutral-100 text-neutral-300';
  const iconBg = unlocked ? TIER_ICON_BG[badge.tier] : 'bg-neutral-100 text-neutral-300';

  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-2 ${styles}`}>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon size={18} strokeWidth={1.5} />
        </div>
        {unlocked
          ? <span className={`text-[9px] font-bold tracking-[0.1em] uppercase opacity-60`}>{TIER_LABEL[badge.tier]}</span>
          : <Lock size={12} className="text-neutral-300 mt-1" />
        }
      </div>
      <div>
        <p className={`text-sm font-bold leading-tight ${unlocked ? '' : 'text-neutral-300'}`}>{badge.name}</p>
        <p className={`text-[11px] mt-0.5 leading-snug ${unlocked ? 'opacity-70' : 'text-neutral-300'}`}>{badge.desc}</p>
      </div>
      {badge.pts > 0 && (
        <p className={`text-[10px] font-bold ${unlocked ? 'opacity-50' : 'text-neutral-300'}`}>+{badge.pts} pts</p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BadgesPage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);

  const [fullProfile,     setFullProfile]     = useState<ApiHairdresserProfile | null>(null);
  const [stats,           setStats]           = useState<ApiStats | null>(null);
  const [servicesCount,   setServicesCount]   = useState(0);
  const [scheduleSet,     setScheduleSet]     = useState(false);
  const [chairBadgesAll,  setChairBadgesAll]  = useState<ApiChairBadge[]>([]);
  const [chairLevel,      setChairLevel]      = useState<ApiChairLevel | null>(null);
  const [verifiedVisits,  setVerifiedVisits]  = useState(0);
  const [dataLoading,     setDataLoading]     = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.allSettled([
      api.get<ApiHairdresserProfile & {
        profile?: ApiHairdresserProfile;
        chair_badges_all?: ApiChairBadge[];
        chair_level?: ApiChairLevel;
      }>('/profile'),
      apptApi.getStats(),
      api.get<ApiServiceCategory[]>('/service-categories'),
      api.get<ApiScheduleDay[]>('/schedule'),
    ]).then(([prof, st, cats, sched]) => {
      if (prof.status === 'fulfilled') {
        const p = prof.value;
        const fp = (p.profile ?? p) as ApiHairdresserProfile;
        setFullProfile(fp);
        setVerifiedVisits(fp.verified_visits_count ?? 0);
        if (p.chair_badges_all) setChairBadgesAll(p.chair_badges_all);
        if (p.chair_level)      setChairLevel(p.chair_level);
      }
      if (st.status   === 'fulfilled') setStats(st.value as ApiStats);
      if (cats.status === 'fulfilled') {
        const total = (cats.value as ApiServiceCategory[]).reduce(
          (acc, c) => acc + ((c.all_services ?? c.services ?? []).length), 0
        );
        setServicesCount(total);
      }
      if (sched.status === 'fulfilled') {
        setScheduleSet((sched.value as ApiScheduleDay[]).some((d) => d.is_open && d.start_time));
      }
    }).finally(() => setDataLoading(false));
  }, [user]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  const isIndependent = user?.hairdresser_profile?.is_independent ?? true;
  const criteria   = getCriteria(user, fullProfile, stats, servicesCount, scheduleSet, isIndependent, verifiedVisits);
  const done       = criteria.filter((c) => c.done);
  const pending    = criteria.filter((c) => !c.done);
  const totalPts   = criteria.filter((c) => c.done).reduce((acc, c) => acc + c.pts, 0);

  // Séparation badges débloqués / verrouillés (tous les 21 badges)
  const ALL_BADGES_DEF: ApiChairBadge[] = chairBadgesAll; // débloqués
  const unlockedCodes = new Set(chairBadgesAll.map((b) => b.code));

  const levelColor  = chairLevel?.color ?? 'neutral';
  const levelStyle  = LEVEL_STYLES[levelColor] ?? LEVEL_STYLES.neutral;
  const ring        = LEVEL_RING[levelColor] ?? LEVEL_RING.neutral;

  const categories = [
    { key: 'profil',       label: 'Profil' },
    { key: 'contenu',      label: 'Réalisations' },
    { key: 'communauté',   label: 'Communauté' },
    { key: 'avis',         label: 'Avis' },
    { key: 'réservations', label: 'Réservations' },
    { key: 'visites',      label: 'Visites vérifiées' },
    { key: 'spécial',      label: 'Spécial' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <DashboardNav />

      {/* Mobile top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-neutral-100 px-4 h-14 flex items-center md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors mr-auto">
          <ArrowLeft size={16} />
          <span className="text-xs font-medium">Tableau de bord</span>
        </Link>
        <span className="text-sm font-bold tracking-tight text-neutral-900 absolute left-1/2 -translate-x-1/2">Mes badges</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-5 md:pt-10 pb-28 md:pb-10 space-y-6">

        {/* Desktop header */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-neutral-400 hover:text-neutral-700 transition-colors">
            <ArrowLeft size={14} />
            <span className="text-xs">Retour</span>
          </Link>
          <span className="text-neutral-200">/</span>
          <h1 className="text-lg font-bold text-neutral-900">Mes badges CHAIR</h1>
        </div>

        {/* ── HERO NIVEAU ── */}
        {dataLoading ? (
          <div className="h-40 bg-neutral-100 rounded-2xl animate-pulse" />
        ) : chairLevel ? (
          <div className={`rounded-2xl p-6 ${levelColor === 'diamond' ? 'bg-neutral-900' : levelColor === 'purple' ? 'bg-purple-600' : levelColor === 'gold' ? 'bg-gradient-to-br from-yellow-400 to-amber-500' : levelColor === 'silver' ? 'bg-gradient-to-br from-neutral-300 to-neutral-400' : levelColor === 'bronze' ? 'bg-gradient-to-br from-amber-400 to-amber-500' : 'bg-white border border-neutral-100'}`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className={`text-[10px] font-bold tracking-[0.2em] uppercase mb-1 ${levelColor === 'neutral' ? 'text-neutral-400' : 'text-white/70'}`}>
                  Niveau CHAIR
                </p>
                <h2 className={`text-3xl font-black tracking-tight ${levelColor === 'neutral' ? 'text-neutral-900' : 'text-white'}`}>
                  {chairLevel.name}
                </h2>
                <p className={`text-sm mt-0.5 ${levelColor === 'neutral' ? 'text-neutral-400' : 'text-white/70'}`}>
                  {chairLevel.points} points · {unlockedCodes.size} badge{unlockedCodes.size !== 1 ? 's' : ''} débloqué{unlockedCodes.size !== 1 ? 's' : ''}
                </p>
              </div>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${levelColor === 'neutral' ? 'bg-neutral-100' : 'bg-white/15'}`}>
                <Crown size={28} className={levelColor === 'neutral' ? 'text-neutral-400' : 'text-white'} strokeWidth={1.5} />
              </div>
            </div>

            {/* Barre progression */}
            {chairLevel.next ? (
              <div>
                <div className={`h-2 rounded-full overflow-hidden mb-2 ${levelColor === 'neutral' ? 'bg-neutral-100' : 'bg-white/20'}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${levelColor === 'neutral' ? 'bg-neutral-900' : 'bg-white'}`}
                    style={{ width: `${chairLevel.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className={`text-[11px] font-semibold ${levelColor === 'neutral' ? 'text-neutral-400' : 'text-white/60'}`}>
                    {chairLevel.progress}% vers {chairLevel.next.name}
                  </p>
                  <p className={`text-[11px] font-semibold ${levelColor === 'neutral' ? 'text-neutral-500' : 'text-white/60'}`}>
                    {chairLevel.next.min - chairLevel.points} pts restants
                  </p>
                </div>
              </div>
            ) : (
              <p className={`text-sm font-bold ${levelColor === 'neutral' ? 'text-neutral-500' : 'text-white/80'}`}>
                Niveau maximum atteint — vous êtes une légende
              </p>
            )}
          </div>
        ) : null}

        {/* ── CRITÈRES DE PROGRESSION ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">
              Progression — {done.length}/{criteria.length} critères
            </p>
            <span className="text-xs font-bold text-green-600">{totalPts} pts gagnés</span>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            {/* Pending en premier */}
            {pending.map((c) => <CriterionRow key={c.label} c={c} />)}
            {/* Done ensuite, pliés visuellement */}
            {done.length > 0 && (
              <details className="group">
                <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer text-[11px] font-semibold text-neutral-400 hover:bg-neutral-50 list-none select-none border-t border-neutral-50">
                  <Check size={12} className="text-neutral-300" />
                  {done.length} critère{done.length > 1 ? 's' : ''} complété{done.length > 1 ? 's' : ''}
                  <ChevronRight size={12} className="ml-auto group-open:rotate-90 transition-transform" />
                </summary>
                {done.map((c) => <CriterionRow key={c.label} c={c} />)}
              </details>
            )}
          </div>
        </div>

        {/* ── BADGES PAR CATÉGORIE ── */}
        {categories.map((cat) => {
          const catBadgesAll = [
            { code: 'photo_added', name: 'Première impression', desc: 'Photo de profil ajoutée', category: 'profil', pts: 20, tier: 1 as const, visible: false },
            { code: 'banner_added', name: 'Vitrine', desc: 'Bannière de profil ajoutée', category: 'profil', pts: 15, tier: 1 as const, visible: false },
            { code: 'full_profile', name: 'Profil complet', desc: 'Toutes les infos remplies', category: 'profil', pts: 50, tier: 2 as const, visible: true },
            { code: 'first_post', name: 'Première réalisation', desc: '1ère réalisation publiée', category: 'contenu', pts: 30, tier: 1 as const, visible: false },
            { code: 'portfolio_5', name: 'Photographe', desc: '5 réalisations publiées', category: 'contenu', pts: 50, tier: 2 as const, visible: true },
            { code: 'portfolio_20', name: 'Portfolio Pro', desc: '20 réalisations publiées', category: 'contenu', pts: 100, tier: 3 as const, visible: true },
            { code: 'portfolio_50', name: 'Artiste CHAIR', desc: '50 réalisations publiées', category: 'contenu', pts: 200, tier: 4 as const, visible: true },
            { code: 'first_follower', name: 'Premiers fans', desc: 'Premier abonné gagné', category: 'communauté', pts: 15, tier: 1 as const, visible: false },
            { code: 'popular_30', name: 'Populaire', desc: '30 abonnés', category: 'communauté', pts: 60, tier: 2 as const, visible: true },
            { code: 'influencer_100', name: 'Influenceur', desc: '100 abonnés', category: 'communauté', pts: 120, tier: 3 as const, visible: true },
            { code: 'star_500', name: 'Star CHAIR', desc: '500 abonnés', category: 'communauté', pts: 300, tier: 4 as const, visible: true },
            { code: 'first_review', name: 'Voix des clients', desc: 'Premier avis reçu', category: 'avis', pts: 25, tier: 1 as const, visible: false },
            { code: 'well_rated', name: 'Bien noté', desc: 'Note ≥ 4.5 avec 5+ avis', category: 'avis', pts: 80, tier: 2 as const, visible: true },
            { code: 'excellent', name: 'Excellent', desc: 'Note ≥ 4.8 avec 10+ avis', category: 'avis', pts: 150, tier: 3 as const, visible: true },
            { code: 'perfect', name: 'Perfectionniste', desc: 'Note 5.0 avec 5+ avis', category: 'avis', pts: 250, tier: 4 as const, visible: true },
            { code: 'first_booking', name: 'Premier client', desc: '1er rendez-vous terminé', category: 'réservations', pts: 50, tier: 1 as const, visible: false },
            { code: 'pro_10', name: 'Pro confirmé', desc: '10 rendez-vous réalisés', category: 'réservations', pts: 100, tier: 2 as const, visible: true },
            { code: 'expert_50', name: 'Expert', desc: '50 rendez-vous réalisés', category: 'réservations', pts: 250, tier: 3 as const, visible: true },
            { code: 'master_100', name: 'Maestro', desc: '100 rendez-vous réalisés', category: 'réservations', pts: 500, tier: 4 as const, visible: true },
            { code: 'visit_10',   name: 'Actif certifié',   desc: '10 visites vérifiées par QR CHAIR',   category: 'visites', pts: 30,  tier: 1 as const, visible: true },
            { code: 'visit_50',   name: 'Pro certifié',     desc: '50 visites vérifiées par QR CHAIR',   category: 'visites', pts: 80,  tier: 2 as const, visible: true },
            { code: 'visit_250',  name: 'Expert certifié',  desc: '250 visites vérifiées par QR CHAIR',  category: 'visites', pts: 200, tier: 3 as const, visible: true },
            { code: 'visit_1000', name: 'Maestro certifié', desc: '1000 visites vérifiées par QR CHAIR', category: 'visites', pts: 500, tier: 4 as const, visible: true },
            { code: 'verified', name: 'Certifié CHAIR', desc: 'Profil vérifié par CHAIR', category: 'spécial', pts: 100, tier: 3 as const, visible: true },
            { code: 'new_talent', name: 'Nouveau talent', desc: 'Nouveau sur la plateforme', category: 'spécial', pts: 0, tier: 1 as const, visible: true },
            { code: 'top_10', name: 'Top 10%', desc: 'Parmi les meilleurs coiffeurs CHAIR', category: 'spécial', pts: 150, tier: 4 as const, visible: true },
          ].filter((b) => b.category === cat.key);

          if (catBadgesAll.length === 0) return null;
          const catUnlocked = catBadgesAll.filter((b) => unlockedCodes.has(b.code));
          const catLocked   = catBadgesAll.filter((b) => !unlockedCodes.has(b.code));

          return (
            <div key={cat.key}>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">{cat.label}</p>
                <span className="text-[10px] font-bold text-neutral-300">{catUnlocked.length}/{catBadgesAll.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {catUnlocked.map((b) => <BadgeCard key={b.code} badge={b as ApiChairBadge} unlocked />)}
                {catLocked.map((b)   => <BadgeCard key={b.code} badge={b as ApiChairBadge} unlocked={false} />)}
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}
