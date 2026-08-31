'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import ChairLogo from '@/components/ui/ChairLogo';
import { useNotificationCount } from '@/contexts/NotificationContext';
import { useProNav } from '@/hooks/useProNav';

export default function ProTopBar() {
  const { unreadCount } = useNotificationCount();
  // homeHref suit le mode actif (gérant → /pro/salon-owner) — un href figé
  // sur "/pro" ramenait toujours au cockpit coiffeur même en mode Gérant.
  const { homeHref } = useProNav();

  return (
    <div className="md:hidden fixed top-[var(--chair-banner-h,0px)] inset-x-0 z-50 bg-white shadow-[0_4px_20px_-8px_rgba(10,10,10,0.08)] pt-safe">
      <div className="h-14 flex items-center justify-between px-4">
        <div className="w-9" />
        <ChairLogo href={homeHref} size="md" pro />
        <Link href="/pro/notifications" className="relative w-11 h-11 flex items-center justify-center">
          <Bell size={19} strokeWidth={1.5} className="text-neutral-500" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-3 h-3 bg-red-500 rounded-full text-[7px] text-white font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}
