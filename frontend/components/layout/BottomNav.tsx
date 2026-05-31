'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Search, Heart, User, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = [
    { href: '/', icon: Compass, label: 'Découvrir' },
    { href: '/rechercher', icon: Search, label: 'Rechercher' },
    { href: '/favoris', icon: Heart, label: 'Favoris' },
    ...(user?.role === 'hairdresser'
      ? [{ href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }]
      : []),
    { href: '/compte', icon: User, label: 'Compte' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-neutral-100 md:hidden pb-safe">
      <div className="flex items-center justify-around h-[60px] px-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href === '/dashboard' && pathname.startsWith('/dashboard'));
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className="relative flex flex-col items-center justify-center flex-1 h-full"
            >
              <Icon
                size={22}
                strokeWidth={active ? 2 : 1.5}
                className={active ? 'text-neutral-900' : 'text-neutral-400'}
              />
              {active && (
                <span className="absolute bottom-2 w-1 h-1 rounded-full bg-neutral-900" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
