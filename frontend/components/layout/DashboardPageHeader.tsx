'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Bell } from 'lucide-react';
import { useNotificationCount } from '@/contexts/NotificationContext';

interface DashboardPageHeaderProps {
  title: string;
  backHref?: string;
}

export default function DashboardPageHeader({
  title,
  backHref = '/dashboard',
}: DashboardPageHeaderProps) {
  const router = useRouter();
  const { unreadCount } = useNotificationCount();

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(backHref);
    }
  }

  return (
    <header className="relative flex items-center justify-between h-12 mb-1 md:hidden">
      <button
        onClick={handleBack}
        className="flex items-center gap-1.5 text-neutral-700 hover:text-neutral-900 transition-colors -ml-1 px-1 py-1 rounded-lg"
        aria-label="Retour"
      >
        <ArrowLeft size={18} strokeWidth={2} />
        <span className="text-[13px] font-medium">Retour</span>
      </button>

      <h1 className="absolute left-1/2 -translate-x-1/2 text-[15px] font-semibold text-neutral-900 pointer-events-none">
        {title}
      </h1>

      <Link href="/notifications" className="relative p-1.5 rounded-xl hover:bg-neutral-100 transition-colors">
        <Bell size={18} strokeWidth={1.5} className="text-neutral-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Link>
    </header>
  );
}
