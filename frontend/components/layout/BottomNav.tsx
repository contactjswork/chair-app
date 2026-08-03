'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Search, Images, Heart, User } from 'lucide-react';
import { useNotificationCount } from '@/contexts/NotificationContext';

// Pastille flottante noire (DA CHAIR : le noir plein est déjà notre couleur
// d'accent principale, cf. les CTA bg-neutral-900), jamais masquée — juste
// une légère réduction de taille au scroll vers le bas, qui reprend sa
// taille pleine dès qu'on remonte (jamais un vrai "disparaît").
export default function BottomNav() {
  const pathname = usePathname();
  const { unreadCount } = useNotificationCount();
  const [compact, setCompact] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;

    function onScroll() {
      const y = window.scrollY;
      const delta = y - lastY.current;

      if (y <= 0) setCompact(false);
      else if (delta > 4) setCompact(true);
      else if (delta < -4) setCompact(false);

      lastY.current = y;
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navItems = [
    { href: '/app',           icon: Compass, label: 'Accueil' },
    { href: '/app/recherche', icon: Search,  label: 'Rechercher' },
    { href: '/app/feed',      icon: Images,  label: '' },
    { href: '/app/favoris',   icon: Heart,   label: 'Favoris' },
    { href: '/app/compte',    icon: User,    label: 'Compte',   badge: unreadCount },
  ];

  return (
    <nav
      className={`fixed left-3 right-3 z-[60] bg-neutral-900 rounded-full md:hidden shadow-lg shadow-black/20 transition-transform duration-300 origin-bottom ${
        compact ? 'scale-90' : 'scale-100'
      }`}
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}
    >
      <div className="flex items-stretch h-[58px] px-1">
        {navItems.map(({ href, icon: Icon, label, badge }) => {
          const active = pathname === href || (href !== '/app' && pathname.startsWith(href));
          const hasBadge = badge != null && (badge as number) > 0;

          return (
            <Link
              key={href}
              href={href}
              aria-label={label || 'Créations'}
              onClick={() => { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8); }}
              className="flex flex-col items-center justify-center flex-1 gap-1"
            >
              <div className="relative">
                <Icon
                  size={24}
                  strokeWidth={active ? 2.2 : 1.5}
                  className={active ? 'text-white' : 'text-neutral-500'}
                />
                {hasBadge && (
                  <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none border border-neutral-900">
                    {(badge as number) > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              {label && (
                <span className={`text-[10px] font-medium leading-none ${active ? 'text-white' : 'text-neutral-500'}`}>
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
