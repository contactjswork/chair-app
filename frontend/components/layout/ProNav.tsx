'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProNav } from '@/hooks/useProNav';
import { useNotificationCount } from '@/contexts/NotificationContext';

export default function ProNav() {
  const pathname = usePathname();
  const { unreadCount } = useNotificationCount();
  const { primary, homeHref } = useProNav();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-neutral-100 pb-safe-nav">
      <div className="flex items-stretch h-[66px]">
        {primary.map(({ href, label, icon: Icon }) => {
          const active = href === homeHref
            ? (pathname === homeHref || pathname === '/pro')
            : pathname.startsWith(href);
          const isHome = href === homeHref;
          const badge = isHome && unreadCount > 0 ? unreadCount : 0;
          const navHref = badge > 0 ? '/pro/notifications' : href;

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
