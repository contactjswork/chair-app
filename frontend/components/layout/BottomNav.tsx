'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Compass, Search, Images, Heart, User } from 'lucide-react';
import { useNotificationCount } from '@/contexts/NotificationContext';

/**
 * Vrai quand le clavier virtuel est ouvert. Sur iOS, le clavier ne
 * redimensionne PAS le layout viewport : un élément position:fixed en bas
 * remonte "flotter" juste au-dessus du clavier, au milieu de l'écran —
 * exactement ce qu'une app native ne fait jamais (elle masque sa tab bar).
 * Le visualViewport, lui, rétrécit : un écart > 150px entre innerHeight et
 * visualViewport.height signe le clavier (150px < le plus petit clavier
 * iOS/Android, mais > barres d'outils/URL dynamiques ~50-100px).
 */
function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const measure = () => setOpen(window.innerHeight - vv.height > 150);
    measure();
    vv.addEventListener('resize', measure);
    return () => vv.removeEventListener('resize', measure);
  }, []);

  return open;
}

export default function BottomNav() {
  const pathname = usePathname();
  const { unreadCount } = useNotificationCount();
  const keyboardOpen = useKeyboardOpen();

  const navItems = [
    { href: '/app',           icon: Compass, label: 'Accueil' },
    { href: '/app/recherche', icon: Search,  label: 'Rechercher' },
    { href: '/app/feed',      icon: Images,  label: '' },
    { href: '/app/favoris',   icon: Heart,   label: 'Favoris' },
    { href: '/app/compte',    icon: User,    label: 'Compte',   badge: unreadCount },
  ];

  // Clavier ouvert → nav retirée (comportement tab bar native). Retour au
  // DOM dès la fermeture du clavier (resize du visualViewport).
  if (keyboardOpen) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[60] bg-white md:hidden pb-safe-nav"
      style={{ boxShadow: '0 -1px 0 rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-stretch h-[60px]">
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
                  className={active ? 'text-neutral-900' : 'text-neutral-400'}
                />
                {hasBadge && (
                  <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                    {(badge as number) > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              {label && (
                <span className={`text-[10px] font-medium leading-none ${active ? 'text-neutral-900' : 'text-neutral-400'}`}>
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
