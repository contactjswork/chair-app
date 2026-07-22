'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationCount } from '@/contexts/NotificationContext';
import { useProNav } from '@/hooks/useProNav';
import { Bell, ArrowLeft, LogOut } from 'lucide-react';
import ChairLogo from '@/components/ui/ChairLogo';

export default function ProSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotificationCount();
  const { primary, secondary, homeHref } = useProNav();

  function isActive(href: string) {
    return href === homeHref
      ? (pathname === homeHref || pathname === '/pro')
      : pathname.startsWith(href);
  }

  return (
    <aside className="hidden md:flex flex-col w-60 bg-white border-r border-neutral-100 fixed top-0 bottom-0 left-0 z-10">
      <div className="px-5 py-5 border-b border-neutral-100 flex items-center justify-between">
        <ChairLogo href={homeHref} size="sm" pro />
        <Link href="/app" className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-700 transition-colors">
          <ArrowLeft size={12} /><span>App</span>
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {primary.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive(href) ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
            }`}
          >
            <Icon size={16} strokeWidth={isActive(href) ? 2.5 : 1.5} />
            {label}
          </Link>
        ))}

        {secondary.length > 0 && (
          <>
            <div className="border-t border-neutral-100 my-2" />
            <p className="px-3 pb-1 text-[10px] font-semibold tracking-[0.15em] uppercase text-neutral-400">Outils</p>
            {secondary.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive(href) ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <Icon size={16} strokeWidth={isActive(href) ? 2.5 : 1.5} />
                {label}
              </Link>
            ))}
          </>
        )}

        <div className="border-t border-neutral-100 my-1" />
        <Link href="/pro/notifications"
          className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            pathname.startsWith('/pro/notifications') ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
          }`}>
          <div className="flex items-center gap-3"><Bell size={16} strokeWidth={1.5} />Notifications</div>
          {unreadCount > 0 && (
            <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
      </nav>
      <div className="px-4 py-4 border-t border-neutral-100">
        <p className="text-sm font-semibold text-neutral-900 truncate mb-0.5">{user?.name}</p>
        <p className="text-xs text-neutral-400 truncate mb-3">{user?.email}</p>
        <button onClick={logout} className="flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-700 transition-colors">
          <LogOut size={12} />Se déconnecter
        </button>
      </div>
    </aside>
  );
}
