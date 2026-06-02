'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationCount } from '@/contexts/NotificationContext';
import { LogOut, User, Bell } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/types';

const navItems = [
  { href: '/',           label: 'Découvrir' },
  { href: '/rechercher', label: 'Rechercher' },
  { href: '/favoris',    label: 'Favoris' },
];

export default function TopNav() {
  const pathname  = usePathname();
  const { user, isLoading, logout } = useAuth();
  const { unreadCount } = useNotificationCount();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isHome    = pathname === '/';
  const glass     = isHome && !scrolled;

  const headerCls = glass
    ? 'bg-transparent border-transparent'
    : 'bg-white/90 backdrop-blur-md border-b border-neutral-100/80';

  const logoCls   = glass ? 'text-white' : 'text-neutral-900';
  const linkBase  = glass ? 'text-white/70 hover:text-white' : 'text-neutral-400 hover:text-neutral-700';
  const linkActive = glass ? 'text-white font-semibold' : 'text-neutral-900 font-medium';

  return (
    <header className={`hidden md:flex fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerCls}`}>
      <div className="w-full max-w-6xl mx-auto px-8 flex items-center justify-between h-[60px]">

        <Link href="/" className={`text-[17px] font-bold tracking-[0.12em] uppercase transition-colors duration-300 ${logoCls}`}>
          CHAIR
        </Link>

        <nav className="flex items-center gap-6">
          {navItems.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`text-sm transition-colors duration-200 ${active ? linkActive : linkBase}`}
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
              {user.role === 'hairdresser' && (
                <Link
                  href="/dashboard"
                  className={`text-sm transition-colors ${pathname.startsWith('/dashboard') ? linkActive : linkBase}`}
                >
                  Dashboard
                </Link>
              )}
              <Link href="/notifications" className="relative p-1 rounded-full hover:bg-black/10 transition-colors">
                <Bell size={17} strokeWidth={1.5} className={glass ? 'text-white/80' : 'text-neutral-500'} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
              <Link
                href="/compte"
                className={`flex items-center gap-1.5 text-sm transition-colors ${glass ? 'text-white/80 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'}`}
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
                className={`flex items-center gap-1.5 text-sm transition-colors ${glass ? 'text-white/60 hover:text-white' : 'text-neutral-400 hover:text-neutral-900'}`}
              >
                <LogOut size={14} strokeWidth={1.5} />
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link
                href="/connexion"
                className={`text-sm transition-colors ${glass ? 'text-white/80 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'}`}
              >
                Connexion
              </Link>
              <Link
                href="/inscription"
                className={`text-sm font-medium px-5 py-2 rounded-full transition-colors ${
                  glass
                    ? 'bg-white text-neutral-900 hover:bg-white/90'
                    : 'bg-neutral-900 text-white hover:bg-neutral-700'
                }`}
              >
                S'inscrire
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
