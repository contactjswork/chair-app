'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CalendarDays, Images, Briefcase, User } from 'lucide-react';
import { useNotificationCount } from '@/contexts/NotificationContext';

const TABS = [
  { href: '/pro',                label: 'Accueil',   icon: Home },
  { href: '/pro/agenda',         label: 'Agenda',    icon: CalendarDays },
  { href: '/pro/portfolio',      label: 'Portfolio', icon: Images },
  { href: '/pro/business',       label: 'Business',  icon: Briefcase },
  { href: '/pro/profil',         label: 'Profil',    icon: User },
];

export default function DashboardNav() {
  const pathname = usePathname();
  const { unreadCount } = useNotificationCount();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-neutral-100 pb-safe">
      <div className="flex items-stretch h-[66px]">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === '/pro' ? pathname === '/pro' : pathname.startsWith(href);
          const badge = href === '/pro' && unreadCount > 0 ? unreadCount : 0;
          const navHref = badge > 0 && href === '/pro' ? '/pro/notifications' : href;

          return (
            <Link key={href} href={navHref}
              className={`flex-1 flex flex-col items-center justify-center gap-1 pt-1 transition-colors relative ${
                active ? 'text-neutral-900' : 'text-neutral-400'
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[2px] bg-neutral-900 rounded-full" />
              )}
              <div className="relative">
                <Icon size={20} strokeWidth={active ? 2 : 1.5} />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium leading-none ${active ? 'text-neutral-900' : 'text-neutral-400'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
