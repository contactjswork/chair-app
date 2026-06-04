'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, User, CalendarDays, Scissors, Bell, Compass, Crown, QrCode } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationCount } from '@/contexts/NotificationContext';

const tabs = [
  { href: '/dashboard',        label: 'Accueil',  icon: LayoutDashboard },
  { href: '/dashboard/profil', label: 'Profil',   icon: User },
  { href: '/dashboard/services',label: 'Services', icon: Scissors },
  { href: '/dashboard/planning',label: 'Planning', icon: CalendarDays },
  { href: '/dashboard/badges', label: 'Badges',   icon: Crown },
];

export default function DashboardNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { unreadCount } = useNotificationCount();
  const profileSlug = user?.hairdresser_profile?.slug;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-neutral-100 pb-safe">
      <div className="flex items-stretch h-16">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                active ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[9px] font-medium">{label}</span>
              {active && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-neutral-900" />
              )}
            </Link>
          );
        })}

        {/* Notifications */}
        <Link
          href="/notifications"
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
            pathname === '/notifications' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'
          }`}
        >
          <div className="relative">
            <Bell size={20} strokeWidth={pathname === '/notifications' ? 2.5 : 1.5} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[9px] font-medium">Alertes</span>
          {pathname === '/notifications' && (
            <span className="absolute bottom-1 w-1 h-1 rounded-full bg-neutral-900" />
          )}
        </Link>

        {/* Mon QR Code */}
        <Link
          href="/dashboard/mon-qr"
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
            pathname === '/dashboard/mon-qr' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'
          }`}
        >
          <QrCode size={20} strokeWidth={pathname === '/dashboard/mon-qr' ? 2.5 : 1.5} />
          <span className="text-[9px] font-medium">QR</span>
          {pathname === '/dashboard/mon-qr' && (
            <span className="absolute bottom-1 w-1 h-1 rounded-full bg-neutral-900" />
          )}
        </Link>

        {/* Retour à l'app publique */}
        <Link
          href="/"
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-neutral-400 hover:text-neutral-600 transition-colors"
          aria-label="Retour à l'application"
        >
          <Compass size={20} strokeWidth={1.5} />
          <span className="text-[9px] font-medium">App</span>
        </Link>
      </div>
    </nav>
  );
}
