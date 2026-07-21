'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationCount } from '@/contexts/NotificationContext';
import { LogOut, User, Bell } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/types';
import ChairLogo from '@/components/ui/ChairLogo';

const navItems = [
  { href: '/app',           label: 'Découvrir' },
  { href: '/app/recherche', label: 'Rechercher' },
  { href: '/app/favoris',   label: 'Favoris' },
];

export default function TopNav() {
  const pathname  = usePathname();
  const { user, isLoading, logout } = useAuth();
  const { unreadCount } = useNotificationCount();

  const avatarUrl = resolveMediaUrl(user?.avatar ?? null);

  return (
    <>
      {/* ── Header mobile ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-neutral-100">
        <div className="flex items-center justify-between px-4 min-h-14 pt-safe-header">
          <ChairLogo href="/app" size="md" />
          {!isLoading && (
            <Link href="/app/notifications" className="relative w-9 h-9 flex items-center justify-center rounded-full -mr-2">
              <Bell size={19} strokeWidth={1.5} className="text-neutral-500" />
              {user && unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
              )}
            </Link>
          )}
        </div>
      </header>

      {/* ── Header desktop ── */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-neutral-100/80 transition-all duration-300">
        <div className="w-full max-w-6xl mx-auto px-8 flex items-center justify-between h-[60px]">

          <ChairLogo href="/" size="md" />

          <nav className="flex items-center gap-6">
            {navItems.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`text-sm transition-colors duration-200 ${active ? 'text-neutral-900 font-medium' : 'text-neutral-400 hover:text-neutral-700'}`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="w-24 h-4 bg-neutral-100/50 rounded animate-pulse" />
            ) : user ? (
              <>
                <Link href="/app/notifications" className="relative p-1 rounded-full hover:bg-neutral-100 transition-colors">
                  <Bell size={17} strokeWidth={1.5} className="text-neutral-500" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/app/compte"
                  className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                  {resolveMediaUrl(user.avatar) ? (
                    <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-neutral-200">
                      <Image src={resolveMediaUrl(user.avatar)!} alt={user.name} fill className="object-cover" sizes="24px" />
                    </div>
                  ) : (
                    <User size={15} strokeWidth={1.5} />
                  )}
                  <span className="truncate max-w-[100px]">{user.name.split(' ')[0]}</span>
                </Link>
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  <LogOut size={14} strokeWidth={1.5} />
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link href="/connexion" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
                  Connexion
                </Link>
                <Link
                  href="/inscription"
                  className="text-sm font-medium px-5 py-2 rounded-full bg-neutral-900 text-white hover:bg-neutral-700 transition-colors"
                >
                  S&apos;inscrire
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
