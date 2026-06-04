'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuth } from '@/contexts/AuthContext';
import { api, appointments as apptApi } from '@/lib/api';
import {
  resolveMediaUrl, getAfterImage,
  type ApiPost, type ApiStats, type ApiHairdresserProfile,
  type ApiAppointment, type ApiServiceCategory, type ApiScheduleDay,
  type ApiChairBadge, type ApiChairLevel,
  apptDateStr,
} from '@/lib/types';
import {
  ArrowLeft, User, ImageIcon, Camera, Scissors, CalendarDays, BarChart2,
  ChevronRight, Bell, Building2, UserPlus, Eye, Plus, Check, Zap,
  Clock, Star, Users, Bookmark, TrendingUp, LogOut, Crown,
} from 'lucide-react';
import { useNotificationCount } from '@/contexts/NotificationContext';
import DashboardNav from '@/components/layout/DashboardNav';
import { LEVEL_STYLES } from '@/lib/chairLevel';

// ── Score CHAIR ───────────────────────────────────────────────────────────────

interface ScoreItem {
  pts: number;
  label: string;
  href: string;
  done: boolean;
}

function computeScore(
  user: ReturnType<typeof useRequireAuth>['user'],
  fullProfile: ApiHairdresserProfile | null,
  stats: ApiStats | null,
  servicesCount: number,
  scheduleSet: boolean,
): { score: number; items: ScoreItem[] } {
  if (!user) return { score: 0, items: [] };
  const profile = user.hairdresser_profile;
  const postsCount = stats?.posts_count ?? profile?.posts_count ?? 0;
  const reviewsCount = stats?.reviews_count ?? profile?.reviews_count ?? 0;
  const specialtiesCount = fullProfile?.specialties?.length ?? 0;

  const all: ScoreItem[] = [
    {
      pts: 12, done: !!user.avatar,
      label: 'Ajoutez une photo de profil',
      href: '/dashboard/profil',
    },
    {
      pts: 10, done: !!fullProfile?.banner_image,
      label: 'Ajoutez une bannière',
      href: '/dashboard/profil',
    },
    {
      pts: 8, done: !!profile?.tagline,
      label: 'Ajoutez une accroche',
      href: '/dashboard/profil',
    },
    {
      pts: 8, done: !!user.bio,
      label: 'Écrivez votre bio',
      href: '/dashboard/profil',
    },
    {
      pts: 5, done: !!(profile?.city || user.city),
      label: 'Ajoutez votre ville',
      href: '/dashboard/profil',
    },
    {
      pts: 12, done: specialtiesCount >= 2,
      label: 'Ajoutez au moins 2 spécialités',
      href: '/dashboard/profil',
    },
    {
      pts: 20, done: postsCount >= 3,
      label: postsCount === 0 ? 'Publiez vos premières réalisations' : postsCount < 3 ? 'Publiez au moins 3 réalisations' : '',
      href: '/dashboard/realisations',
    },
    {
      pts: 10, done: servicesCount > 0,
      label: 'Ajoutez vos services',
      href: '/dashboard/services',
    },
    {
      pts: 10, done: scheduleSet,
      label: 'Définissez vos horaires',
      href: '/dashboard/planning',
    },
    {
      pts: 5, done: reviewsCount > 0,
      label: 'Recevez votre premier avis',
      href: '/dashboard/reservations',
    },
  ];

  const score = all.reduce((acc, item) => item.done ? acc + item.pts : acc, 0);
  const improvements = all.filter((i) => !i.done && i.label).slice(0, 3);
  return { score, items: improvements };
}

// ── Action prioritaire ────────────────────────────────────────────────────────

interface PriorityAction {
  icon: React.ElementType;
  title: string;
  desc: string;
  cta: string;
  href: string;
  urgent?: boolean;
}

function getPriorityAction(
  user: ReturnType<typeof useRequireAuth>['user'],
  fullProfile: ApiHairdresserProfile | null,
  stats: ApiStats | null,
  servicesCount: number,
  scheduleSet: boolean,
): PriorityAction {
  const profile = user?.hairdresser_profile;
  const postsCount = stats?.posts_count ?? profile?.posts_count ?? 0;

  if ((stats?.appointments_pending ?? 0) > 0) return {
    icon: CalendarDays, urgent: true,
    title: `${stats!.appointments_pending} demande${stats!.appointments_pending > 1 ? 's' : ''} en attente`,
    desc: 'Des clients attendent votre confirmation. Répondez rapidement pour ne pas les perdre.',
    cta: 'Voir les demandes',
    href: '/dashboard/reservations',
  };

  if (!user?.avatar) return {
    icon: Camera,
    title: 'Ajoutez votre photo de profil',
    desc: 'Les profils avec une photo reçoivent 5x plus de visites. C\'est la première chose que voient les clients.',
    cta: 'Ajouter ma photo',
    href: '/dashboard/profil',
  };

  if (postsCount === 0) return {
    icon: ImageIcon,
    title: 'Publiez votre première réalisation',
    desc: 'Montrez votre talent. Les clients choisissent leur coiffeur sur la qualité de son portfolio.',
    cta: 'Publier une réalisation',
    href: '/dashboard/realisations',
  };

  if (!profile?.tagline) return {
    icon: User,
    title: 'Ajoutez une accroche',
    desc: 'Une phrase qui résume ce que vous faites. Elle apparaît sur votre profil et dans les résultats de recherche.',
    cta: 'Modifier mon profil',
    href: '/dashboard/profil',
  };

  if (servicesCount === 0) return {
    icon: Scissors,
    title: 'Listez vos services',
    desc: 'Vos prestations apparaissent sur votre profil. Elles rassurent les clients avant de vous contacter.',
    cta: 'Ajouter mes services',
    href: '/dashboard/services',
  };

  if (!scheduleSet) return {
    icon: CalendarDays,
    title: 'Définissez vos horaires',
    desc: 'Les clients veulent savoir quand vous êtes disponible. Configurez vos jours et heures d\'ouverture.',
    cta: 'Configurer mes horaires',
    href: '/dashboard/planning',
  };

  if (postsCount < 3) return {
    icon: ImageIcon,
    title: 'Publiez plus de réalisations',
    desc: `Vous avez ${postsCount} réalisation${postsCount > 1 ? 's' : ''}. Les profils avec 3+ réalisations apparaissent en priorité dans la recherche.`,
    cta: 'Ajouter des réalisations',
    href: '/dashboard/realisations',
  };

  return {
    icon: TrendingUp,
    title: 'Partagez votre profil',
    desc: 'Votre profil est prêt. Partagez-le sur Instagram ou par message pour attirer vos premiers clients.',
    cta: 'Voir mon profil public',
    href: fullProfile ? `/coiffeur/${fullProfile.slug}` : '/dashboard',
  };
}

// ── Sidebar desktop ───────────────────────────────────────────────────────────

const NAV = [
  { href: '/dashboard',               label: 'Accueil',      icon: BarChart2 },
  { href: '/dashboard/profil',        label: 'Mon profil',   icon: User },
  { href: '/dashboard/realisations',  label: 'Réalisations', icon: ImageIcon },
  { href: '/dashboard/services',      label: 'Services',     icon: Scissors },
  { href: '/dashboard/planning',      label: 'Planning',     icon: CalendarDays },
  { href: '/dashboard/reservations',  label: 'Réservations', icon: Clock },
  { href: '/dashboard/statistiques',  label: 'Statistiques', icon: TrendingUp },
  { href: '/dashboard/badges',        label: 'Badges',       icon: Crown },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);
  const { logout } = useAuth();
  const { unreadCount } = useNotificationCount();

  const [fullProfile,   setFullProfile]   = useState<ApiHairdresserProfile | null>(null);
  const [stats,         setStats]         = useState<ApiStats | null>(null);
  const [posts,         setPosts]         = useState<ApiPost[]>([]);
  const [appointments,  setAppointments]  = useState<ApiAppointment[]>([]);
  const [servicesCount, setServicesCount] = useState(0);
  const [scheduleSet,   setScheduleSet]   = useState(false);
  const [dataLoading,   setDataLoading]   = useState(true);
  const [chairBadges,   setChairBadges]   = useState<ApiChairBadge[]>([]);
  const [chairBadgesAll,setChairBadgesAll]= useState<ApiChairBadge[]>([]);
  const [chairLevel,    setChairLevel]    = useState<ApiChairLevel | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.allSettled([
      api.get<ApiHairdresserProfile>('/profile'),
      apptApi.getStats(),
      api.get<ApiPost[]>('/posts'),
      api.get<ApiAppointment[]>('/appointments'),
      api.get<ApiServiceCategory[]>('/service-categories'),
      api.get<ApiScheduleDay[]>('/schedule'),
    ]).then(([prof, st, ps, apts, cats, sched]) => {
      if (prof.status === 'fulfilled') {
        const p = prof.value as ApiHairdresserProfile & {
          chair_badges?: ApiChairBadge[];
          chair_badges_all?: ApiChairBadge[];
          chair_level?: ApiChairLevel;
          profile?: ApiHairdresserProfile;
        };
        // /profile returns { user, profile, chair_badges, chair_level, ... }
        const profileData = (p as { profile?: ApiHairdresserProfile }).profile ?? p;
        setFullProfile(profileData as ApiHairdresserProfile);
        if ((p as { chair_badges?: ApiChairBadge[] }).chair_badges)      setChairBadges((p as { chair_badges: ApiChairBadge[] }).chair_badges);
        if ((p as { chair_badges_all?: ApiChairBadge[] }).chair_badges_all) setChairBadgesAll((p as { chair_badges_all: ApiChairBadge[] }).chair_badges_all);
        if ((p as { chair_level?: ApiChairLevel }).chair_level)           setChairLevel((p as { chair_level: ApiChairLevel }).chair_level);
      }
      if (st.status   === 'fulfilled')   setStats(st.value as ApiStats);
      if (ps.status   === 'fulfilled')   setPosts((ps.value as ApiPost[]).slice(0, 4));
      if (apts.status === 'fulfilled')   setAppointments(apts.value as ApiAppointment[]);
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

  const profile    = user.hairdresser_profile;
  const firstName  = user.name.split(' ')[0];
  const avatarUrl  = resolveMediaUrl(user.avatar);
  const { score, items: scoreImprovements } = computeScore(user, fullProfile, stats, servicesCount, scheduleSet);
  const action     = getPriorityAction(user, fullProfile, stats, servicesCount, scheduleSet);
  const ActionIcon = action.icon;

  // RDV filtrage
  const today      = new Date().toISOString().slice(0, 10);
  const tomorrow   = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const pending    = appointments.filter((a) => a.status === 'pending');
  const todayApts  = appointments.filter((a) => a.status === 'confirmed' && apptDateStr(a) === today);
  const tomorrowApts = appointments.filter((a) => a.status === 'confirmed' && apptDateStr(a) === tomorrow);

  const scoreColor = score >= 80 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-neutral-500';

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <DashboardNav />

      {/* ── Sidebar desktop ── */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-neutral-100 fixed top-0 bottom-0 left-0 z-10">
        <div className="px-5 py-5 border-b border-neutral-100 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-neutral-400 hover:text-neutral-700 transition-colors mr-auto">
            <ArrowLeft size={14} />
            <span className="text-xs font-medium">App</span>
          </Link>
          <Link href="/" className="text-lg font-bold tracking-[0.12em] uppercase text-neutral-900">Chair</Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === '/dashboard'
              ? typeof window !== 'undefined' && window.location.pathname === href
              : typeof window !== 'undefined' && window.location.pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <Icon size={16} strokeWidth={active ? 2.5 : 1.5} />
                {label}
              </Link>
            );
          })}
          <Link href="/notifications"
            className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-all"
          >
            <div className="flex items-center gap-3">
              <Bell size={16} strokeWidth={1.5} />
              Notifications
            </div>
            {unreadCount > 0 && (
              <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <div className="my-1 border-t border-neutral-100" />
          {profile?.salon_id ? (
            <Link href="/dashboard/salon" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-all">
              <Building2 size={16} strokeWidth={1.5} />Mon salon
            </Link>
          ) : (
            <Link href="/dashboard/rejoindre-salon" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-all">
              <UserPlus size={16} strokeWidth={1.5} />Rejoindre un salon
            </Link>
          )}
        </nav>

        <div className="px-4 py-4 border-t border-neutral-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative w-9 h-9 rounded-full overflow-hidden bg-neutral-200 flex-shrink-0">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={user.name} fill className="object-cover" sizes="36px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-neutral-500">
                  {firstName[0]}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-900 truncate">{user.name}</p>
              <p className="text-xs text-neutral-400 truncate">{user.email}</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-700 transition-colors w-full">
            <LogOut size={12} />Se déconnecter
          </button>
        </div>
      </aside>

      {/* ── Contenu principal ── */}
      <main className="flex-1 md:ml-60 pb-28 md:pb-10">

        {/* ── Mobile top bar ── */}
        <div className="md:hidden sticky top-0 z-20 bg-white border-b border-neutral-100 px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-900 transition-colors">
            <ArrowLeft size={16} />
            <span className="text-xs font-medium">Application</span>
          </Link>
          <span className="text-sm font-bold tracking-[0.12em] uppercase text-neutral-900 absolute left-1/2 -translate-x-1/2">CHAIR</span>
          <div className="flex items-center gap-2">
            <Link href="/notifications" className="relative">
              <Bell size={18} className="text-neutral-500" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[7px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <Link href={profile ? `/coiffeur/${profile.slug}` : '/dashboard'}>
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-neutral-200">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={user.name} fill className="object-cover" sizes="32px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-neutral-500">
                    {firstName[0]}
                  </div>
                )}
              </div>
            </Link>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 md:px-6 pt-5 md:pt-8 space-y-5">

          {/* ── HEADER ── */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Bonjour, {firstName}</h1>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {/* Score */}
                {!dataLoading && (
                  <span className={`text-sm font-semibold ${scoreColor}`}>
                    Score CHAIR · {score}/100
                  </span>
                )}
                {/* Résumé rapide */}
                {(stats?.appointments_pending ?? 0) > 0 && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    {stats!.appointments_pending} en attente
                  </span>
                )}
                {(todayApts.length > 0) && (
                  <span className="text-xs text-neutral-400">
                    {todayApts.length} RDV aujourd&apos;hui
                  </span>
                )}
              </div>
            </div>
            <Link
              href={profile ? `/coiffeur/${profile.slug}` : '/dashboard'}
              className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 border border-neutral-200 px-3 py-2 rounded-xl transition-colors"
            >
              <Eye size={13} />
              Mon profil
            </Link>
          </div>

          {/* ── ACTION PRIORITAIRE ── */}
          {!dataLoading && (
            <div className={`rounded-2xl p-5 ${action.urgent ? 'bg-red-950' : 'bg-neutral-900'}`}>
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${action.urgent ? 'bg-red-500' : 'bg-white/10'}`}>
                  <ActionIcon size={18} className="text-white" strokeWidth={1.5} />
                </div>
                <div>
                  {action.urgent && (
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-red-400 mb-0.5">Urgent</p>
                  )}
                  <h2 className="text-base font-bold text-white leading-tight">{action.title}</h2>
                  <p className="text-sm text-white/60 mt-1 leading-relaxed">{action.desc}</p>
                </div>
              </div>
              <Link
                href={action.href}
                className="block w-full text-center bg-white text-neutral-900 text-sm font-bold py-3 rounded-xl hover:bg-neutral-100 transition-colors"
              >
                {action.cta}
              </Link>
            </div>
          )}

          {/* ── SCORE CHAIR ── */}
          {!dataLoading && (
            <div className="bg-white rounded-2xl border border-neutral-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">Score CHAIR</p>
                  <p className="text-3xl font-bold text-neutral-900 mt-0.5">{score}<span className="text-lg text-neutral-300 font-normal">/100</span></p>
                </div>
                <div className="relative w-16 h-16">
                  {/* Cercle SVG */}
                  <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="#f5f5f5" strokeWidth="6" />
                    <circle
                      cx="32" cy="32" r="26" fill="none"
                      stroke={score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#0a0a0a'}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${(score / 100) * 163.4} 163.4`}
                    />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${scoreColor}`}>
                    {score}
                  </span>
                </div>
              </div>

              {/* Barre de progression */}
              <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden mb-4">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-neutral-900'}`}
                  style={{ width: `${score}%` }}
                />
              </div>

              {/* Améliorations */}
              {scoreImprovements.length > 0 ? (
                <div className="space-y-2">
                  {scoreImprovements.map((item) => (
                    <Link key={item.href + item.label} href={item.href}
                      className="flex items-center justify-between py-2 border-t border-neutral-50 hover:opacity-70 transition-opacity group"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-[11px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full w-[42px] text-center flex-shrink-0">
                          +{item.pts}
                        </span>
                        <span className="text-sm text-neutral-700">{item.label}</span>
                      </div>
                      <ChevronRight size={13} className="text-neutral-300 group-hover:text-neutral-600 flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-green-700 font-semibold pt-2 border-t border-neutral-50">
                  <Check size={15} className="text-green-500" />
                  Votre profil est prêt à recevoir des réservations
                </div>
              )}
            </div>
          )}

          {/* ── CHECKLIST ── */}
          {!dataLoading && (
            <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-50">
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">Checklist de démarrage</p>
              </div>
              {[
                { done: !!user.avatar,                   label: 'Photo de profil',          href: '/dashboard/profil' },
                { done: !!fullProfile?.banner_image,     label: 'Bannière',                 href: '/dashboard/profil' },
                { done: !!profile?.tagline,              label: 'Accroche',                 href: '/dashboard/profil' },
                { done: (fullProfile?.specialties?.length ?? 0) >= 2, label: 'Au moins 2 spécialités', href: '/dashboard/profil' },
                { done: (stats?.posts_count ?? profile?.posts_count ?? 0) >= 3, label: '3 réalisations publiées', href: '/dashboard/realisations' },
                { done: servicesCount > 0,               label: 'Services configurés',      href: '/dashboard/services' },
                { done: scheduleSet,                     label: 'Horaires définis',         href: '/dashboard/planning' },
              ].map(({ done, label, href }) => (
                <Link key={label} href={href}
                  className={`flex items-center gap-3 px-5 py-3.5 border-b border-neutral-50 last:border-0 transition-colors ${done ? '' : 'hover:bg-neutral-50'}`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${done ? 'bg-neutral-900 border-neutral-900' : 'border-neutral-200'}`}>
                    {done && <Check size={11} className="text-white" strokeWidth={3} />}
                  </div>
                  <span className={`text-sm ${done ? 'text-neutral-400 line-through' : 'text-neutral-800 font-medium'}`}>{label}</span>
                  {!done && <ChevronRight size={13} className="text-neutral-300 ml-auto" />}
                </Link>
              ))}
            </div>
          )}

          {/* ── RENDEZ-VOUS ── */}
          <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-neutral-50">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">Rendez-vous</p>
              <Link href="/dashboard/reservations" className="text-xs text-neutral-500 hover:text-neutral-900 font-medium transition-colors">
                Tout voir
              </Link>
            </div>

            {dataLoading ? (
              <div className="p-5 space-y-3">
                {[1, 2].map((i) => <div key={i} className="h-12 bg-neutral-100 rounded-xl animate-pulse" />)}
              </div>
            ) : pending.length === 0 && todayApts.length === 0 && tomorrowApts.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <CalendarDays size={28} className="text-neutral-200 mx-auto mb-2" />
                <p className="text-sm text-neutral-400">Aucun rendez-vous prévu</p>
                <Link href="/dashboard/planning" className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 mt-2 inline-block transition-colors">
                  Configurer mes horaires
                </Link>
              </div>
            ) : (
              <div>
                {pending.length > 0 && (
                  <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-amber-400 rounded-full" />
                      <span className="text-sm font-semibold text-amber-800">
                        {pending.length} demande{pending.length > 1 ? 's' : ''} en attente
                      </span>
                    </div>
                    <Link href="/dashboard/reservations" className="text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors">
                      Répondre
                    </Link>
                  </div>
                )}
                {todayApts.slice(0, 3).map((apt) => (
                  <Link key={apt.id} href="/dashboard/reservations"
                    className="flex items-center gap-3 px-5 py-3.5 border-b border-neutral-50 last:border-0 hover:bg-neutral-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-600 flex-shrink-0">
                      {apt.client_name?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-neutral-900 truncate">{apt.client_name}</p>
                      <p className="text-xs text-neutral-400 truncate">{apt.service}</p>
                    </div>
                    <span className="text-xs font-semibold text-neutral-500 flex-shrink-0">
                      {apt.appointment_time?.slice(0, 5) ?? 'Auj.'}
                    </span>
                  </Link>
                ))}
                {tomorrowApts.length > 0 && (
                  <div className="px-5 py-3 border-t border-neutral-50 flex items-center justify-between">
                    <span className="text-xs text-neutral-400">{tomorrowApts.length} RDV demain</span>
                    <Link href="/dashboard/reservations" className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors">Voir</Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── RÉALISATIONS ── */}
          <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-neutral-50">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">Réalisations</p>
              <div className="flex items-center gap-3">
                <Link href="/dashboard/realisations" className="text-xs text-neutral-500 hover:text-neutral-900 font-medium transition-colors">
                  Gérer
                </Link>
              </div>
            </div>

            {dataLoading ? (
              <div className="p-4 grid grid-cols-4 gap-2">
                {[1,2,3,4].map((i) => <div key={i} className="aspect-square rounded-xl bg-neutral-100 animate-pulse" />)}
              </div>
            ) : posts.length > 0 ? (
              <div className="p-4">
                <div className="grid grid-cols-4 gap-2">
                  {posts.map((post) => {
                    const img = getAfterImage(post);
                    const imgUrl = img
                      ? img.startsWith('/storage/')
                        ? `${(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/api$/, '')}${img}`
                        : img
                      : null;
                    return (
                      <Link key={post.id} href="/dashboard/realisations">
                        <div className="relative aspect-square rounded-xl overflow-hidden bg-neutral-100 group">
                          {imgUrl ? (
                            <Image src={imgUrl} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="80px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon size={16} className="text-neutral-300" />
                            </div>
                          )}
                          {(post.views_count > 0 || post.likes_count > 0) && (
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex items-center gap-1.5 text-[9px] text-white font-semibold">
                                {post.views_count > 0 && <span className="flex items-center gap-0.5"><Eye size={8} />{post.views_count}</span>}
                                {post.likes_count > 0 && <span className="flex items-center gap-0.5"><Star size={8} />{post.likes_count}</span>}
                              </div>
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                  {/* Add button */}
                  <Link href="/dashboard/realisations">
                    <div className="aspect-square rounded-xl border-2 border-dashed border-neutral-200 flex items-center justify-center hover:border-neutral-400 hover:bg-neutral-50 transition-all group">
                      <Plus size={20} className="text-neutral-300 group-hover:text-neutral-600 transition-colors" />
                    </div>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="px-5 py-8 text-center">
                <ImageIcon size={28} className="text-neutral-200 mx-auto mb-2" />
                <p className="text-sm text-neutral-400 mb-3">Aucune réalisation publiée</p>
                <Link
                  href="/dashboard/realisations"
                  className="inline-flex items-center gap-1.5 text-xs font-bold bg-neutral-900 text-white px-4 py-2.5 rounded-xl hover:bg-neutral-700 transition-colors"
                >
                  <Plus size={13} />
                  Publier ma première réalisation
                </Link>
              </div>
            )}
          </div>

          {/* ── STATS RAPIDES ── */}
          {(stats || profile) && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Users,    label: 'Abonnés',     value: stats?.followers_count ?? profile?.followers_count ?? 0 },
                { icon: Star,     label: 'Avis',        value: stats?.reviews_count ?? profile?.reviews_count ?? 0 },
                { icon: Bookmark, label: 'Favoris',     value: stats?.saved_count ?? 0 },
              ].map(({ icon: Icon, label, value }) => (
                <Link key={label} href="/dashboard/statistiques"
                  className="bg-white rounded-2xl border border-neutral-100 p-4 text-center hover:border-neutral-200 transition-colors"
                >
                  <Icon size={16} className="text-neutral-400 mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-xl font-bold text-neutral-900">{value}</p>
                  <p className="text-[10px] text-neutral-400 font-medium mt-0.5">{label}</p>
                </Link>
              ))}
            </div>
          )}

          {/* ── NIVEAU CHAIR — carte compacte ── */}
          {!dataLoading && chairLevel && (() => {
            const ls = LEVEL_STYLES[chairLevel.color] ?? LEVEL_STYLES.neutral;
            return (
              <Link href="/dashboard/badges"
                className="flex items-center gap-4 bg-white rounded-2xl border border-neutral-100 p-4 hover:border-neutral-200 hover:shadow-sm transition-all group"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${ls.bg}`}>
                  <Crown size={18} className={ls.text} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-neutral-900">{chairLevel.name}</p>
                    <span className="text-[10px] font-semibold text-neutral-400">{chairLevel.points} pts</span>
                  </div>
                  {chairLevel.next && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-neutral-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${ls.bar}`} style={{ width: `${chairLevel.progress}%` }} />
                      </div>
                      <span className="text-[10px] text-neutral-400 flex-shrink-0">{chairLevel.progress}% → {chairLevel.next.name}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-neutral-500 group-hover:text-neutral-900 transition-colors flex-shrink-0">
                  {chairBadgesAll.length} badge{chairBadgesAll.length !== 1 ? 's' : ''}
                  <ChevronRight size={13} />
                </div>
              </Link>
            );
          })()}

          {/* ── ACCÈS RAPIDE ── */}
          <div className="grid grid-cols-2 gap-3 pb-4">
            {[
              { href: '/dashboard/profil',       icon: User,        label: 'Mon profil',     sub: 'Photo, bio, spécialités' },
              { href: '/dashboard/services',      icon: Scissors,    label: 'Services',       sub: 'Mes prestations' },
              { href: '/dashboard/planning',      icon: CalendarDays,label: 'Planning',       sub: 'Horaires & agenda' },
              { href: '/dashboard/statistiques',  icon: TrendingUp,  label: 'Statistiques',   sub: 'Vues, clics, revenus' },
            ].map(({ href, icon: Icon, label, sub }) => (
              <Link key={href} href={href}
                className="bg-white rounded-2xl border border-neutral-100 p-4 flex items-center gap-3 hover:border-neutral-200 hover:shadow-sm transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-neutral-50 flex items-center justify-center flex-shrink-0 group-hover:bg-neutral-100 transition-colors">
                  <Icon size={16} className="text-neutral-600" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900">{label}</p>
                  <p className="text-[11px] text-neutral-400 truncate">{sub}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* ── Lien profil public mobile ── */}
          {profile && (
            <Link
              href={`/coiffeur/${profile.slug}`}
              className="flex items-center justify-center gap-2 w-full border border-neutral-200 rounded-2xl py-3.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors md:hidden"
            >
              <Eye size={15} />
              Voir mon profil public
            </Link>
          )}

          {/* ── Déconnexion mobile ── */}
          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 w-full py-3 text-xs text-neutral-400 hover:text-neutral-700 transition-colors md:hidden"
          >
            <LogOut size={13} />
            Se déconnecter
          </button>

        </div>
      </main>
    </div>
  );
}
