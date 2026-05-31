'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { resolveMediaUrl, getAfterImage, type ApiPost } from '@/lib/types';
import {
  LayoutDashboard, User, ImageIcon, Star, Calendar,
  BarChart2, Settings, Users, ChevronRight, LogOut, Lock, Plus
} from 'lucide-react';
import DashboardNav from '@/components/layout/DashboardNav';

const navItems = [
  { href: '/dashboard',              label: 'Accueil',       icon: LayoutDashboard, available: true },
  { href: '/dashboard/profil',       label: 'Mon profil',    icon: User,            available: true },
  { href: '/dashboard/realisations', label: 'Réalisations',  icon: ImageIcon,       available: true },
  { href: null,                      label: 'Avis',          icon: Star,            available: false },
  { href: null,                      label: 'Agenda',        icon: Calendar,        available: false },
  { href: null,                      label: 'Statistiques',  icon: BarChart2,       available: false },
  { href: null,                      label: 'Paramètres',    icon: Settings,        available: false },
];

export default function DashboardPage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);
  const { logout } = useAuth();
  const pathname = usePathname();
  const [recentPosts, setRecentPosts] = useState<ApiPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get<ApiPost[]>('/posts')
      .then((posts) => setRecentPosts(posts.slice(0, 3)))
      .catch(() => {})
      .finally(() => setPostsLoading(false));
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

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon, available }) => {
            const active = href && (pathname === href);
            if (!available) {
              return (
                <div key={label} className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-neutral-300 cursor-not-allowed select-none">
                  <div className="flex items-center gap-3">
                    <Icon size={17} strokeWidth={1.5} />
                    {label}
                  </div>
                  <Lock size={11} className="text-neutral-200" />
                </div>
              );
            }
            return (
              <Link
                key={href!}
                href={href!}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <Icon size={17} strokeWidth={active ? 2.5 : 1.5} />
                {label}
              </Link>
            );
          })}
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
        <div className="flex items-center justify-between mb-6 md:hidden">
          <Link href="/" className="text-xl font-bold tracking-[0.1em] uppercase">Chair</Link>
          <button onClick={logout} className="text-xs text-neutral-400 hover:text-neutral-700 flex items-center gap-1.5">
            <LogOut size={15} />
            Déconnexion
          </button>
        </div>

        {/* Onboarding banner si profil incomplet */}
        {isProfileIncomplete && (
          <div className="bg-neutral-900 text-white rounded-2xl p-5 mb-6">
            <p className="text-xs font-semibold tracking-wide uppercase text-neutral-400 mb-1">Démarrer</p>
            <h2 className="font-bold text-base mb-1">Complétez votre profil</h2>
            <p className="text-sm text-neutral-400 mb-4">
              Un profil complet attire 3× plus de clients. Ajoutez votre photo, une accroche et votre première réalisation.
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
                  Publier une réalisation
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">Bonjour, {firstName}</h1>
          <p className="text-sm text-neutral-400 mt-1">Voici l'état de votre profil CHAIR</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Abonnés',      value: profile?.followers_count ?? 0, icon: Users },
            { label: 'Avis',         value: profile?.reviews_count   ?? 0, icon: Star,      sub: profile && profile.reviews_count > 0 ? `Moy. ${profile.avg_rating}` : undefined },
            { label: 'Réalisations', value: profile?.posts_count     ?? 0, icon: ImageIcon },
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
                <p className="text-[11px] text-neutral-400 mt-0.5">Photo, bio, spécialités, ville</p>
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
                <p className="text-sm font-semibold text-neutral-900">Gérer mes réalisations</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">Ajouter, modifier, supprimer</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-neutral-300 group-hover:text-neutral-600 transition-colors" />
          </Link>

          {profile && (
            <Link
              href={`/coiffeur/${profile.slug}`}
              className="flex items-center justify-between px-4 py-4 hover:bg-neutral-50 transition-colors group"
              target="_blank"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-neutral-50 flex items-center justify-center">
                  <LayoutDashboard size={15} className="text-neutral-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">Voir mon profil public</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Comme le voient les clients</p>
                </div>
              </div>
              <ChevronRight size={14} className="text-neutral-300 group-hover:text-neutral-600 transition-colors" />
            </Link>
          )}
        </div>

        {/* Réalisations récentes */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-neutral-900">Réalisations récentes</h2>
            <Link href="/dashboard/realisations" className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors">
              Voir tout →
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
                  ? (img.startsWith('/storage/') ? `http://localhost:8000${img}` : img)
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
              <p className="text-sm text-neutral-500 mb-3">Aucune réalisation publiée</p>
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
