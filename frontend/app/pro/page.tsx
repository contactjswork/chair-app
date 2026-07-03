'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import ChairLogo from '@/components/ui/ChairLogo';
import { usePathname } from 'next/navigation';
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
  ChevronRight, Bell, Building2, Eye, Plus,
  Clock, Star, Users, Bookmark, TrendingUp, LogOut, Crown, QrCode,
  Pencil, Check, Mail,
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
  const isIndependent = profile?.is_independent !== false;
  const postsCount = stats?.posts_count ?? profile?.posts_count ?? 0;
  const reviewsCount = stats?.reviews_count ?? profile?.reviews_count ?? 0;
  const specialtiesCount = fullProfile?.specialties?.length ?? 0;

  const base: ScoreItem[] = [
    { pts: 12, done: !!user.avatar,              label: 'Ajoutez une photo de profil',    href: '/pro/profil' },
    { pts: 10, done: !!fullProfile?.banner_image, label: 'Ajoutez une bannière',           href: '/pro/profil' },
    { pts: 8,  done: !!profile?.tagline,          label: 'Ajoutez une accroche',           href: '/pro/profil' },
    { pts: 8,  done: !!user.bio,                  label: 'Écrivez votre bio',              href: '/pro/profil' },
    { pts: 5,  done: !!(profile?.city || user.city), label: 'Ajoutez votre ville',         href: '/pro/profil' },
    { pts: 12, done: specialtiesCount >= 2,        label: 'Ajoutez au moins 2 spécialités', href: '/pro/profil' },
    { pts: 20, done: postsCount >= 3,              label: postsCount === 0 ? 'Publiez vos premières réalisations' : 'Publiez au moins 3 réalisations', href: '/pro/portfolio' },
    { pts: 5,  done: reviewsCount > 0,             label: 'Recevez votre premier avis',    href: isIndependent ? '/pro/reservations' : '/pro/mon-qr' },
  ];
  const independentOnly: ScoreItem[] = [
    { pts: 10, done: servicesCount > 0, label: 'Ajoutez vos services',     href: '/pro/services' },
    { pts: 10, done: scheduleSet,        label: 'Définissez vos horaires', href: '/pro/planning' },
  ];
  const all = isIndependent ? [...base, ...independentOnly] : base;
  const score = all.reduce((acc, item) => item.done ? acc + item.pts : acc, 0);
  const items = all.filter((i) => !i.done && i.label).slice(0, 3);
  return { score, items };
}

// ── Sidebar desktop ───────────────────────────────────────────────────────────

const NAV_MAIN = [
  { href: '/pro',           label: 'Accueil',   icon: BarChart2 },
  { href: '/pro/agenda',    label: 'Agenda',    icon: CalendarDays },
  { href: '/pro/portfolio', label: 'Portfolio', icon: ImageIcon },
  { href: '/pro/business',  label: 'Business',  icon: TrendingUp },
  { href: '/pro/profil',    label: 'Profil',    icon: User },
];

const NAV_INDEPENDENT_SUB = [
  { href: '/pro/reservations', label: 'Réservations', icon: Clock },
  { href: '/pro/services',     label: 'Services',     icon: Scissors },
  { href: '/pro/statistiques', label: 'Statistiques', icon: BarChart2 },
  { href: '/pro/badges',       label: 'Badges',       icon: Crown },
];

const NAV_SALON_SUB = [
  { href: '/pro/services',     label: 'Expertises',   icon: Scissors },
  { href: '/pro/mon-qr',       label: 'Mon QR Code',  icon: QrCode },
  { href: '/pro/statistiques', label: 'Statistiques', icon: BarChart2 },
  { href: '/pro/badges',       label: 'Badges',       icon: Crown },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);
  const { logout } = useAuth();
  const { unreadCount } = useNotificationCount();
  const pathname = usePathname();

  const [fullProfile,   setFullProfile]   = useState<ApiHairdresserProfile | null>(null);
  const [stats,         setStats]         = useState<ApiStats | null>(null);
  const [posts,         setPosts]         = useState<ApiPost[]>([]);
  const [appointments,  setAppointments]  = useState<ApiAppointment[]>([]);
  const [servicesCount, setServicesCount] = useState(0);
  const [scheduleSet,   setScheduleSet]   = useState(false);
  const [dataLoading,   setDataLoading]   = useState(true);
  const [chairLevel,    setChairLevel]    = useState<ApiChairLevel | null>(null);
  const [chairBadgesAll,setChairBadgesAll]= useState<ApiChairBadge[]>([]);

  const isIndependent = user?.hairdresser_profile?.is_independent !== false;
  const hasSalon      = !!user?.hairdresser_profile?.salon_id;

  useEffect(() => {
    if (!user) return;
    const independent = user.hairdresser_profile?.is_independent !== false;
    const requests: Promise<unknown>[] = [
      api.get<ApiHairdresserProfile>('/profile'),
      apptApi.getStats(),
      api.get<ApiPost[]>('/posts'),
    ];
    if (independent) {
      requests.push(
        api.get<ApiAppointment[]>('/appointments'),
        api.get<ApiServiceCategory[]>('/service-categories'),
        api.get<ApiScheduleDay[]>('/schedule'),
      );
    }
    Promise.allSettled(requests).then(([prof, st, ps, apts, cats, sched]) => {
      if (prof.status === 'fulfilled') {
        const p = prof.value as ApiHairdresserProfile & {
          chair_badges_all?: ApiChairBadge[];
          chair_level?: ApiChairLevel;
          profile?: ApiHairdresserProfile;
        };
        const profileData = (p as { profile?: ApiHairdresserProfile }).profile ?? p;
        setFullProfile(profileData as ApiHairdresserProfile);
        if (p.chair_badges_all) setChairBadgesAll(p.chair_badges_all);
        if (p.chair_level)      setChairLevel(p.chair_level);
      }
      if (st.status  === 'fulfilled') setStats(st.value as ApiStats);
      if (ps.status  === 'fulfilled' && Array.isArray(ps.value)) setPosts((ps.value as ApiPost[]).slice(0, 6));
      if (apts?.status === 'fulfilled' && Array.isArray(apts.value)) setAppointments(apts.value as ApiAppointment[]);
      if (cats?.status === 'fulfilled' && Array.isArray(cats.value)) {
        const total = (cats.value as ApiServiceCategory[]).reduce(
          (acc, c) => acc + ((c.all_services ?? c.services ?? []).length), 0
        );
        setServicesCount(total);
      }
      if (sched?.status === 'fulfilled' && Array.isArray(sched.value)) {
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

  const profile   = user.hairdresser_profile;
  const firstName = user.name.split(' ')[0];
  const avatarUrl = resolveMediaUrl(user.avatar);
  const NAV_SUB   = isIndependent ? NAV_INDEPENDENT_SUB : NAV_SALON_SUB;

  const { score, items: scoreImprovements } = computeScore(user, fullProfile, stats, servicesCount, scheduleSet);

  const today    = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const pending      = appointments.filter((a) => a.status === 'pending');
  const todayApts    = appointments.filter((a) => a.status === 'confirmed' && apptDateStr(a) === today);
  const tomorrowApts = appointments.filter((a) => a.status === 'confirmed' && apptDateStr(a) === tomorrow);

  const todayDateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const ls = chairLevel ? (LEVEL_STYLES[chairLevel.color] ?? LEVEL_STYLES.neutral) : null;

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <DashboardNav />

      {/* ── Sidebar desktop ── */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-neutral-100 fixed top-0 bottom-0 left-0 z-10">
        <div className="px-5 py-5 border-b border-neutral-100 flex items-center justify-between">
          <ChairLogo href="/pro" size="sm" pro />
          <Link href="/app" className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-700 transition-colors">
            <ArrowLeft size={12} /><span>App</span>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {/* Navigation principale */}
          <div className="space-y-0.5 mb-4">
            {NAV_MAIN.map(({ href, label, icon: Icon }) => {
              const active = href === '/pro' ? pathname === href : pathname.startsWith(href);
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
          </div>

          {/* Séparateur + sous-pages */}
          <div className="border-t border-neutral-100 pt-3 mb-1">
            <p className="px-3 text-[9px] font-bold tracking-[0.2em] uppercase text-neutral-300 mb-1.5">Outils</p>
          </div>
          <div className="space-y-0.5 mb-4">
            {NAV_SUB.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link key={href} href={href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    active ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <Icon size={15} strokeWidth={1.5} />
                  {label}
                </Link>
              );
            })}
            <Link href="/pro/notifications"
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                pathname.startsWith('/pro/notifications') ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell size={15} strokeWidth={1.5} />Notifications
              </div>
              {unreadCount > 0 && (
                <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          </div>

          {/* Salon / Invitations */}
          <div className="border-t border-neutral-100 pt-3">
            {hasSalon ? (
              <Link href="/pro/salon" className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                pathname.startsWith('/pro/salon') ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50'
              }`}>
                <Building2 size={15} strokeWidth={1.5} />Mon salon
              </Link>
            ) : isIndependent ? (
              <Link href="/pro/invitations" className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                pathname.startsWith('/pro/invitations') ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50'
              }`}>
                <Mail size={15} strokeWidth={1.5} />Invitations
              </Link>
            ) : null}
          </div>
        </nav>
        <div className="px-4 py-4 border-t border-neutral-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative w-9 h-9 rounded-full overflow-hidden bg-neutral-200 flex-shrink-0">
              {avatarUrl
                ? <Image src={avatarUrl} alt={user.name} fill className="object-cover" sizes="36px" />
                : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-neutral-500">{firstName[0]}</div>
              }
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

        <div className="max-w-2xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-4">

          {/* ── Bonjour ── */}
          <div>
            <p className="text-xs text-neutral-400 capitalize">{todayDateStr}</p>
            <h1 className="text-2xl font-bold text-neutral-900 mt-0.5">Bonjour, {firstName}</h1>
          </div>

          {/* ── Alerte demandes en attente ── */}
          {isIndependent && !dataLoading && pending.length > 0 && (
            <Link href="/pro/agenda"
              className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5 hover:bg-amber-100 transition-colors"
            >
              <div className="w-8 h-8 bg-amber-400 rounded-xl flex items-center justify-center flex-shrink-0">
                <CalendarDays size={15} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-900">
                  {pending.length} demande{pending.length > 1 ? 's' : ''} en attente
                </p>
                <p className="text-xs text-amber-600">Répondez pour ne pas perdre ces clients</p>
              </div>
              <ChevronRight size={16} className="text-amber-500 flex-shrink-0" />
            </Link>
          )}

          {/* ── Stats rapides ── */}
          {!dataLoading && (
            <div className="grid grid-cols-4 gap-2.5">
              {[
                { icon: Users,    label: 'Abonnés',  value: stats?.followers_count ?? 0 },
                { icon: Star,     label: 'Avis',     value: stats?.reviews_count ?? 0 },
                { icon: Eye,      label: 'Visites',  value: stats?.visits_count ?? 0 },
                { icon: Bookmark, label: 'Favoris',  value: stats?.saved_count ?? 0 },
              ].map(({ icon: Icon, label, value }) => (
                <Link key={label} href="/pro/business"
                  className="bg-white rounded-2xl border border-neutral-100 p-3 text-center hover:border-neutral-200 transition-colors"
                >
                  <p className="text-xl font-bold text-neutral-900 leading-none">{value}</p>
                  <p className="text-[9px] text-neutral-400 font-medium mt-1.5 uppercase tracking-wide">{label}</p>
                </Link>
              ))}
            </div>
          )}
          {dataLoading && (
            <div className="grid grid-cols-4 gap-2.5">
              {[1,2,3,4].map((i) => <div key={i} className="h-16 bg-neutral-100 rounded-2xl animate-pulse" />)}
            </div>
          )}

          {/* ── Aujourd'hui (indépendant) ── */}
          {isIndependent && (
            <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between">
                <p className="text-sm font-bold text-neutral-900">Aujourd&apos;hui</p>
                <Link href="/pro/agenda" className="text-neutral-300 hover:text-neutral-600 transition-colors">
                  <ChevronRight size={16} />
                </Link>
              </div>

              {dataLoading ? (
                <div className="px-5 pb-4 space-y-2">
                  <div className="h-10 bg-neutral-100 rounded-xl animate-pulse" />
                </div>
              ) : todayApts.length === 0 && pending.length === 0 ? (
                <div className="px-5 pb-5 flex items-center gap-3 text-sm text-neutral-400">
                  <div className="w-10 h-10 rounded-xl bg-neutral-50 flex items-center justify-center flex-shrink-0">
                    <Clock size={16} className="text-neutral-300" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 font-medium">Aucun RDV aujourd&apos;hui</p>
                    {tomorrowApts.length > 0 && (
                      <p className="text-xs text-neutral-400">{tomorrowApts.length} RDV demain</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-neutral-50 border-t border-neutral-50">
                  {todayApts.slice(0, 3).map((apt) => (
                    <Link key={apt.id} href="/pro/agenda"
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-neutral-50 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-600 flex-shrink-0">
                        {apt.client_name?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 truncate">{apt.client_name}</p>
                        <p className="text-xs text-neutral-400 truncate">{apt.service}</p>
                      </div>
                      <span className="text-sm font-bold text-neutral-700 flex-shrink-0">
                        {apt.appointment_time?.slice(0, 5) ?? ''}
                      </span>
                    </Link>
                  ))}
                  {todayApts.length > 3 && (
                    <div className="px-5 py-3 text-xs text-neutral-400 text-center">
                      +{todayApts.length - 3} autres RDV
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Actions rapides ── */}
          <div className="grid grid-cols-3 gap-2.5">
            <Link href="/pro/portfolio"
              className="bg-white rounded-2xl border border-neutral-100 p-4 flex flex-col items-center gap-2 hover:border-neutral-200 hover:shadow-sm transition-all text-center"
            >
              <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center">
                <Plus size={18} className="text-white" />
              </div>
              <p className="text-xs font-semibold text-neutral-700 leading-tight">Ajouter<br />réalisation</p>
            </Link>
            {profile && (
              <Link href={`/app/coiffeur/${profile.slug}`} target="_blank" rel="noopener noreferrer"
                className="bg-white rounded-2xl border border-neutral-100 p-4 flex flex-col items-center gap-2 hover:border-neutral-200 hover:shadow-sm transition-all text-center"
              >
                <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center">
                  <Eye size={18} className="text-neutral-600" />
                </div>
                <p className="text-xs font-semibold text-neutral-700 leading-tight">Voir mon<br />profil</p>
              </Link>
            )}
            <Link href="/pro/profil"
              className="bg-white rounded-2xl border border-neutral-100 p-4 flex flex-col items-center gap-2 hover:border-neutral-200 hover:shadow-sm transition-all text-center"
            >
              <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center">
                <Pencil size={18} className="text-neutral-600" />
              </div>
              <p className="text-xs font-semibold text-neutral-700 leading-tight">Modifier<br />profil</p>
            </Link>
          </div>

          {/* ── Score CHAIR ── */}
          {!dataLoading && (
            <div className="bg-white rounded-2xl border border-neutral-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-neutral-900">Score CHAIR</p>
                <span className={`text-sm font-bold ${score >= 80 ? 'text-green-600' : score >= 50 ? 'text-amber-500' : 'text-neutral-500'}`}>
                  {score}<span className="text-neutral-300 font-normal">/100</span>
                </span>
              </div>
              <div className="h-2 bg-neutral-100 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-amber-400' : 'bg-neutral-400'}`}
                  style={{ width: `${score}%` }}
                />
              </div>
              {scoreImprovements.length > 0 ? (
                <div className="space-y-1.5">
                  {scoreImprovements.map((item) => (
                    <Link key={item.href + item.label} href={item.href}
                      className="flex items-center gap-2.5 group"
                    >
                      <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full w-9 text-center flex-shrink-0">
                        +{item.pts}
                      </span>
                      <span className="text-xs text-neutral-500 group-hover:text-neutral-900 transition-colors truncate">{item.label}</span>
                      <ChevronRight size={11} className="text-neutral-300 ml-auto flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-semibold text-green-600">
                  <Check size={13} />
                  {isIndependent ? 'Profil prêt pour les réservations' : 'Profil complet'}
                </div>
              )}
            </div>
          )}

          {/* ── Portfolio preview ── */}
          {!dataLoading && posts.length > 0 && (
            <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between border-b border-neutral-50">
                <p className="text-sm font-bold text-neutral-900">Portfolio</p>
                <Link href="/pro/portfolio" className="text-neutral-300 hover:text-neutral-600 transition-colors">
                  <ChevronRight size={16} />
                </Link>
              </div>
              <div className="p-3 grid grid-cols-3 gap-2">
                {posts.slice(0, 5).map((post) => {
                  const img = getAfterImage(post);
                  const BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/api$/, '');
                  const imgUrl = img ? (img.startsWith('/storage/') ? `${BASE}${img}` : img) : null;
                  return (
                    <Link key={post.id} href="/pro/portfolio">
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-neutral-100">
                        {imgUrl
                          ? <Image src={imgUrl} alt="" fill className="object-cover hover:scale-105 transition-transform duration-300" sizes="80px" />
                          : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={14} className="text-neutral-300" /></div>
                        }
                      </div>
                    </Link>
                  );
                })}
                <Link href="/pro/portfolio">
                  <div className="aspect-square rounded-xl border-2 border-dashed border-neutral-200 flex items-center justify-center hover:border-neutral-400 transition-colors">
                    <Plus size={18} className="text-neutral-300" />
                  </div>
                </Link>
              </div>
            </div>
          )}
          {!dataLoading && posts.length === 0 && (
            <Link href="/pro/portfolio"
              className="flex items-center gap-4 bg-white rounded-2xl border border-dashed border-neutral-200 p-5 hover:border-neutral-400 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-neutral-50 flex items-center justify-center flex-shrink-0">
                <Camera size={20} className="text-neutral-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-neutral-900">Aucune réalisation</p>
                <p className="text-xs text-neutral-400 mt-0.5">Publiez des photos pour construire votre portfolio</p>
              </div>
              <ChevronRight size={16} className="text-neutral-300" />
            </Link>
          )}

          {/* ── Niveau CHAIR ── */}
          {!dataLoading && chairLevel && ls && (
            <Link href="/pro/badges"
              className="flex items-center gap-4 bg-white rounded-2xl border border-neutral-100 p-4 hover:border-neutral-200 hover:shadow-sm transition-all group"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${ls.bg}`}>
                <Crown size={18} className={ls.text} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-bold text-neutral-900">{chairLevel.name}</p>
                  <span className="text-[10px] text-neutral-400">{chairLevel.points} pts</span>
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
              <div className="flex items-center gap-1 text-xs font-semibold text-neutral-400 group-hover:text-neutral-700 flex-shrink-0">
                {chairBadgesAll.length} badge{chairBadgesAll.length !== 1 ? 's' : ''}
                <ChevronRight size={13} />
              </div>
            </Link>
          )}

          {/* ── Déconnexion mobile ── */}
          <div className="pb-2 md:hidden text-center">
            <button onClick={logout} className="text-xs text-neutral-300 hover:text-neutral-500 transition-colors py-2">
              <LogOut size={12} className="inline mr-1.5" />Se déconnecter
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
