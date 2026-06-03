'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Search, Heart, User, LayoutDashboard, Clapperboard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationCount } from '@/contexts/NotificationContext';

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { unreadCount } = useNotificationCount();


  const navItems = [
    { href: '/',           icon: Compass,       label: 'Découvrir' },
    { href: '/rechercher', icon: Search,         label: 'Rechercher' },
    { href: '/feed',       icon: Clapperboard,   label: 'Feed',      isFeed: true },
    { href: '/favoris',    icon: Heart,          label: 'Favoris' },
    ...(user?.role === 'hairdresser'
      ? [{ href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', badge: unreadCount }]
      : [{ href: '/compte', icon: User, label: 'Compte', badge: unreadCount }]),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[60] bg-white/95 backdrop-blur-md border-t border-neutral-100 md:hidden pb-safe">
      <div className="flex items-center justify-around h-[60px] px-2">
        {navItems.map(({ href, icon: Icon, label, badge, isFeed }) => {
          const active = pathname === href || (href === '/dashboard' && pathname.startsWith('/dashboard'));
          const hasBadge = badge != null && (badge as number) > 0;

          // ── Bouton Feed central spécial ──
          if (isFeed) {
            return (
              <Link key={href} href={href} aria-label={label}
                className="relative flex flex-col items-center justify-center flex-1 h-full">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                  active ? 'bg-neutral-900' : 'bg-neutral-100'
                }`}>
                  <Icon size={19} strokeWidth={active ? 2 : 1.5}
                    className={active ? 'text-white' : 'text-neutral-500'} />
                </div>
              </Link>
            );
          }

          return (
            <Link key={href} href={href} aria-label={label}
              className="relative flex flex-col items-center justify-center flex-1 h-full">
              <div className="relative">
                <Icon size={22} strokeWidth={active ? 2 : 1.5}
                  className={active ? 'text-neutral-900' : 'text-neutral-400'} />
                {hasBadge && (
                  <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                    {(badge as number) > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              {active && <span className="absolute bottom-2 w-1 h-1 rounded-full bg-neutral-900" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
