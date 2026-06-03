'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuth } from '@/contexts/AuthContext';
import { api, appointments as apptApi } from '@/lib/api';
import { resolveMediaUrl, getAfterImage, type ApiPost, type ApiStats } from '@/lib/types';
import {
  LayoutDashboard, User, ImageIcon,
  BarChart2, Users, ChevronRight, LogOut, Plus, Scissors, CalendarDays, BookOpen, Bell, Compass, Eye, Building2, UserPlus
} from 'lucide-react';
import { useNotificationCount } from '@/contexts/NotificationContext';
import DashboardNav from '@/components/layout/DashboardNav';

const navItems = [
  { href: '/dashboard',                   label: 'Accueil',       icon: LayoutDashboard },
  { href: '/dashboard/profil',            label: 'Mon profil',    icon: User },
  { href: '/dashboard/realisations',      label: 'Réalisations',  icon: ImageIcon },
  { href: '/dashboard/services',          label: 'Services',      icon: Scissors },
  { href: '/dashboard/planning',          label: 'Planning',      icon: CalendarDays },
  { href: '/dashboard/reservations',      label: 'Réservations',  icon: BookOpen },
  { href: '/dashboard/statistiques',      label: 'Statistiques',  icon: BarChart2 },
];

export default function DashboardPage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);
  const { logout } = useAuth();
  const pathname = usePathname();
  const { unreadCount } = useNotificationCount();
  const [recentPosts, setRecentPosts] = useState<ApiPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [liveStats, setLiveStats] = useState<ApiStats | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<ApiPost[]>('/posts')
      .then((posts) => setRecentPosts(posts.slice(0, 3)))
      .catch(() => {})
      .finally(() => setPostsLoading(false));
    apptApi.getStats()
      .then((data) => setLiveStats(data as ApiStats))
      .catch(() => {});
  }, [user]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-sm text-neutral-400">Chargement...</div>
      </div>
    );
  }

  const profile = user.hairdresser_profile;
  const firstName = user.name.split(' ')[0];
  const avatarUrl = resolveMediaUrl(user.avatar);

  const isProfileIncomplete = !user.avatar || !profile?.tagline || (profile?.posts_count ?? 0) === 0;

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <DashboardNav />
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-neutral-100 fixed top-0 bottom-0 left-0">
        <div className="px-5 py-5 border-b border-neutral-100">
          <Link href="/" className="text-lg font-bold tracking-[0.1em] uppercase text-neutral-900">Chair</Link>
          <p className="text-xs text-neutral-400 mt-0.5">Espace coiffeur</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <Icon size={17} strokeWidth={active ? 2.5 : 1.5} />
                {label}
              </Link>
            );
          })}
          {/* Notifications */}
          <Link
            href="/notifications"
            className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              pathname === '/notifications' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Bell size={17} strokeWidth={pathname === '/notifications' ? 2.5 : 1.5} />
              Notifications
            </div>
            {unreadCount > 0 && (
              <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          {/* Salon */}
          <div className="my-1 border-t border-neutral-100" />
          {profile?.salon_id ? (
            <Link
              href="/dashboard/salon"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                pathname.startsWith('/dashboard/salon') ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Building2 size={17} strokeWidth={pathname.startsWith('/dashboard/salon') ? 2.5 : 1.5} />
              Mon salon
            </Link>
          ) : (
            <Link
              href="/dashboard/rejoindre-salon"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                pathname.startsWith('/dashboard/rejoindre-salon') ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <UserPlus size={17} strokeWidth={pathname.startsWith('/dashboard/rejoindre-salon') ? 2.5 : 1.5} />
              Rejoindre un salon
            </Link>
          )}

          {/* Séparateur + retour app */}
          <div className="my-1 border-t border-neutral-100" />
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 transition-all"
          >
            <Compass size={17} strokeWidth={1.5} />
            Application CHAIR
          </Link>
        </nav>

        <div className="px-4 py-4 border-t border-neutral-100 space-y-3">
          <Link href="/compte" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="relative w-9 h-9 rounded-full overflow-hidden bg-neutral-200 flex-shrink-0 flex items-center justify-center">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={user.name} fill className="object-cover" sizes="36px" />
              ) : (
                <User size={16} className="text-neutral-400" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-900 truncate">{user.name}</p>
              <p className="text-xs text-neutral-400 truncate">{user.email}</p>
            </div>
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <LogOut size={13} />
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-60 px-4 md:px-8 py-6 pb-24 md:pb-6">
        {/* Mobile header */}
        <div className="flex items-center justify-between mb-5 md:hidden">
          <Link href="/" className="text-xl font-bold tracking-[0.1em] uppercase">Chair</Link>
          <button onClick={logout} className="text-xs text-neutral-400 hover:text-neutral-700 flex items-center gap-1.5">
            <LogOut size={15} />
            Se déconnecter
          </button>
        </div>

        {/* Onboarding banner si profil incomplet */}
        {isProfileIncomplete && (
          <div className="bg-neutral-900 text-white rounded-2xl p-5 mb-6">
            <p className="text-xs font-semibold tracking-wide uppercase text-neutral-400 mb-1">Démarrer</p>
            <h2 className="font-bold text-base mb-1">Complétez votre profil</h2>
            <p className="text-sm text-neutral-400 mb-4">
              Un profil complet attire 3x plus de clients. Ajoutez votre photo, une accroche et votre première réalisation.
            </p>
            <div className="flex flex-wrap gap-2">
              {!user.avatar && (
                <Link href="/dashboard/profil" className="text-xs font-semibold bg-white text-neutral-900 px-3 py-1.5 rounded-full hover:bg-neutral-100 transition-colors">
                  Ajouter une photo
                </Link>
              )}
              {!profile?.tagline && (
                <Link href="/dashboard/profil" className="text-xs font-semibold bg-white text-neutral-900 px-3 py-1.5 rounded-full hover:bg-neutral-100 transition-colors">
                  Ajouter une accroche
                </Link>
              )}
              {(profile?.posts_count ?? 0) === 0 && (
                <Link href="/dashboard/realisations" className="text-xs font-semibold bg-white text-neutral-900 px-3 py-1.5 rounded-full hover:bg-neutral-100 transition-colors">
                  Publier une realisation
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Welcome + Voir mon profil public */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Bonjour, {firstName}</h1>
            <p className="text-sm text-neutral-400 mt-1">Voici l'état de votre activité CHAIR</p>
          </div>
          {profile && (
            <a
              href={`/coiffeur/${profile.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 flex items-center gap-1.5 bg-neutral-900 text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-neutral-700 transition-colors"
            >
              <Eye size={13} />
              Mon profil
            </a>
          )}
        </div>

        {/* Aujourd'hui */}
        {liveStats && (
          <div className="mb-5">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-2">
              Aujourd'hui
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/dashboard/planning"
                className="bg-neutral-900 text-white rounded-2xl p-4 flex flex-col gap-1 hover:bg-neutral-800 transition-colors"
              >
                <CalendarDays size={18} strokeWidth={1.5} className="text-neutral-400 mb-1" />
                <p className="text-2xl font-bold">{liveStats.appointments_confirmed + liveStats.appointments_pending}</p>
                <p className="text-[11px] text-neutral-400">
                  {liveStats.appointments_pending > 0
                    ? `${liveStats.appointments_pending} en attente`
                    : 'Rendez-vous'}
                </p>
              </Link>
              <Link
                href="/notifications"
                className="bg-white border border-neutral-100 rounded-2xl p-4 flex flex-col gap-1 hover:bg-neutral-50 transition-colors relative"
              >
                <Bell size={18} strokeWidth={1.5} className="text-neutral-400 mb-1" />
                <p className="text-2xl font-bold text-neutral-900">{unreadCount}</p>
                <p className="text-[11px] text-neutral-400">
                  {unreadCount === 0 ? 'Aucune alerte' : `Notification${unreadCount > 1 ? 's' : ''}`}
                </p>
                {unreadCount > 0 && (
                  <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </Link>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Abonnes',      value: liveStats?.followers_count ?? profile?.followers_count ?? 0, icon: Users },
            { label: 'Avis',         value: liveStats?.reviews_count   ?? profile?.reviews_count   ?? 0, icon: Users, sub: (liveStats?.reviews_count ?? profile?.reviews_count ?? 0) > 0 ? `Moy. ${liveStats?.avg_rating ?? profile?.avg_rating}` : undefined },
            { label: 'Realisations', value: liveStats?.posts_count     ?? profile?.posts_count     ?? 0, icon: ImageIcon },
          ].map(({ label, value, icon: Icon, sub }) => (
            <div key={label} className="bg-white rounded-2xl border border-neutral-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] text-neutral-400 font-medium">{label}</span>
                <div className="w-7 h-7 rounded-lg bg-neutral-50 flex items-center justify-center">
                  <Icon size={14} className="text-neutral-500" />
                </div>
              </div>
              <p className="text-2xl font-bold text-neutral-900">{value}</p>
              {sub && <p className="text-[11px] text-neutral-400 mt-1">{sub}</p>}
            </div>
          ))}
        </div>

        {/* Actions rapides */}
        <div className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-50 mb-4">
          <Link
            href="/dashboard/profil"
            className="flex items-center justify-between px-4 py-4 hover:bg-neutral-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-neutral-50 flex items-center justify-center">
                <User size={15} className="text-neutral-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">Modifier mon profil</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">Photo, bio, specialites, ville</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-neutral-300 group-hover:text-neutral-600 transition-colors" />
          </Link>

          <Link
            href="/dashboard/services"
            className="flex items-center justify-between px-4 py-4 hover:bg-neutral-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-neutral-50 flex items-center justify-center">
                <Scissors size={15} className="text-neutral-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">Gerer mes services</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">Categories, prix, durees</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-neutral-300 group-hover:text-neutral-600 transition-colors" />
          </Link>

          <Link
            href="/dashboard/planning"
            className="flex items-center justify-between px-4 py-4 hover:bg-neutral-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-neutral-50 flex items-center justify-center">
                <CalendarDays size={15} className="text-neutral-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">Mon planning</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">Rendez-vous et horaires</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-neutral-300 group-hover:text-neutral-600 transition-colors" />
          </Link>

          <Link
            href="/dashboard/realisations"
            className="flex items-center justify-between px-4 py-4 hover:bg-neutral-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-neutral-50 flex items-center justify-center">
                <ImageIcon size={15} className="text-neutral-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">Gerer mes realisations</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">Ajouter, modifier, supprimer</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-neutral-300 group-hover:text-neutral-600 transition-colors" />
          </Link>

          {profile && (
            <a
              href={`/coiffeur/${profile.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-4 hover:bg-neutral-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-neutral-900 flex items-center justify-center">
                  <Eye size={15} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">Voir mon profil public</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Comme le voient vos clients</p>
                </div>
              </div>
              <ChevronRight size={14} className="text-neutral-300 group-hover:text-neutral-600 transition-colors" />
            </a>
          )}
          <Link
            href="/"
            className="flex items-center justify-between px-4 py-4 hover:bg-neutral-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-neutral-50 flex items-center justify-center">
                <Plus size={15} className="text-neutral-600 rotate-45" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">Retour à l'application</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">Découvrir, rechercher, explorer</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-neutral-300 group-hover:text-neutral-600 transition-colors" />
          </Link>
        </div>

        {/* Realisations recentes */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-neutral-900">Realisations recentes</h2>
            <Link href="/dashboard/realisations" className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors">
              Voir tout
            </Link>
          </div>

          {postsLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {[1,2,3].map(i => <div key={i} className="aspect-square rounded-xl bg-neutral-100 animate-pulse" />)}
            </div>
          ) : recentPosts.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {recentPosts.map((post) => {
                const img = getAfterImage(post);
                const imgUrl = img
                  ? (img.startsWith('/storage/') ? `${(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/api$/, '')}${img}` : img)
                  : null;
                return (
                  <Link key={post.id} href="/dashboard/realisations">
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-neutral-100">
                      {imgUrl ? (
                        <Image src={imgUrl} alt="" fill className="object-cover" sizes="120px" />
                      ) : (
                        <div className="w-full h-full bg-neutral-100 flex items-center justify-center">
                          <ImageIcon size={16} className="text-neutral-300" />
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-neutral-50 flex items-center justify-center mb-3">
                <ImageIcon size={20} className="text-neutral-300" />
              </div>
              <p className="text-sm text-neutral-500 mb-3">Aucune realisation publiee</p>
              <Link
                href="/dashboard/realisations"
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-neutral-900 text-white px-4 py-2 rounded-xl hover:bg-neutral-700 transition-colors"
              >
                <Plus size={13} />
                Ajouter
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
