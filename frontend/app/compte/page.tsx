'use client';

import AppShell from '@/components/layout/AppShell';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { resolveMediaUrl } from '@/lib/types';
import { User, LogIn, UserPlus, LayoutDashboard, ChevronRight, LogOut } from 'lucide-react';

export default function ComptePage() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto px-4 pt-6">
          <div className="h-8 w-32 bg-neutral-100 rounded-lg animate-pulse mb-6" />
          <div className="space-y-3">
            <div className="h-32 bg-neutral-100 rounded-2xl animate-pulse" />
            <div className="h-14 bg-neutral-100 rounded-xl animate-pulse" />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 md:px-6 pt-6 md:pt-8">
        <h1 className="text-xl font-bold text-neutral-900 mb-6">Mon compte</h1>

        {!user ? (
          <div className="space-y-4">
            <div className="bg-neutral-50 rounded-2xl p-6 text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-neutral-200 flex items-center justify-center mx-auto mb-4">
                <User size={28} className="text-neutral-400" />
              </div>
              <h3 className="font-semibold text-neutral-900 mb-2">Connectez-vous à CHAIR</h3>
              <p className="text-sm text-neutral-500">Accédez à votre profil, vos favoris et bien plus.</p>
            </div>

            <Link
              href="/connexion"
              className="flex items-center justify-between w-full bg-neutral-900 text-white px-5 py-4 rounded-xl hover:bg-neutral-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <LogIn size={18} />
                <span className="font-semibold">Se connecter</span>
              </div>
              <ChevronRight size={18} />
            </Link>

            <Link
              href="/inscription"
              className="flex items-center justify-between w-full bg-white border border-neutral-200 text-neutral-900 px-5 py-4 rounded-xl hover:border-neutral-400 transition-colors"
            >
              <div className="flex items-center gap-3">
                <UserPlus size={18} />
                <span className="font-semibold">Créer un compte</span>
              </div>
              <ChevronRight size={18} />
            </Link>

            <div className="border-t border-neutral-100 pt-4 mt-6">
              <p className="text-xs text-neutral-400 text-center mb-4">Vous êtes coiffeur ?</p>
              <Link
                href="/inscription?role=hairdresser"
                className="flex items-center justify-between w-full border border-neutral-200 text-neutral-700 px-5 py-4 rounded-xl hover:border-neutral-400 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard size={18} />
                  <div>
                    <p className="font-semibold text-sm">Créer mon profil professionnel</p>
                    <p className="text-xs text-neutral-400">Développez votre visibilité sur CHAIR</p>
                  </div>
                </div>
                <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Profile card */}
            <div className="bg-neutral-50 rounded-2xl p-6 flex items-center gap-4">
              <div className="relative w-14 h-14 rounded-full overflow-hidden bg-neutral-200 flex-shrink-0 flex items-center justify-center">
                {resolveMediaUrl(user.avatar) ? (
                  <Image src={resolveMediaUrl(user.avatar)!} alt={user.name} fill className="object-cover" sizes="56px" />
                ) : (
                  <User size={24} className="text-neutral-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-neutral-900 truncate">{user.name}</p>
                <p className="text-sm text-neutral-500 truncate">{user.email}</p>
                <span className="inline-block mt-1 text-[11px] font-semibold tracking-wide uppercase text-neutral-400">
                  {user.role === 'client' ? 'Client' : user.role === 'hairdresser' ? 'Coiffeur' : 'Salon'}
                  {user.city ? ` — ${user.city}` : ''}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-50">
              {user.role === 'hairdresser' && (
                <Link
                  href="/dashboard"
                  className="flex items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-3 text-neutral-900">
                    <LayoutDashboard size={18} className="text-neutral-400" />
                    <span className="font-semibold text-sm">Mon tableau de bord</span>
                  </div>
                  <ChevronRight size={16} className="text-neutral-300" />
                </Link>
              )}
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              className="flex items-center gap-3 w-full px-5 py-4 rounded-xl border border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 transition-colors"
            >
              <LogOut size={18} />
              <span className="font-semibold text-sm">Se déconnecter</span>
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
