'use client';

import { Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface OwnerNotificationItemProps {
  icon: LucideIcon;
  iconColorClassName?: string;
  title: string;
  message?: string;
  date: string;
  isUnread: boolean;
  onMarkRead?: () => void;
  onClick?: () => void;
}

/** Ligne notification — extrait du NotifCard inline de notifications/page.tsx. */
export default function OwnerNotificationItem({
  icon: Icon, iconColorClassName = 'text-neutral-500', title, message, date, isUnread, onMarkRead, onClick,
}: OwnerNotificationItemProps) {
  return (
    <div
      onClick={onClick}
      className={`flex gap-3 px-4 py-3.5 border-b border-neutral-100 last:border-0 transition-colors ${isUnread ? 'bg-neutral-50' : 'bg-white'} ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="mt-0.5 shrink-0 w-9 h-9 rounded-full bg-white border border-neutral-200 flex items-center justify-center">
        <Icon size={16} className={iconColorClassName} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] leading-snug ${isUnread ? 'font-semibold text-neutral-900' : 'font-medium text-neutral-600'}`}>{title}</p>
        {message && <p className="text-[12px] text-neutral-500 mt-0.5 leading-relaxed">{message}</p>}
        <p className="text-[11px] text-neutral-400 mt-1">{date}</p>
      </div>
      {isUnread && onMarkRead && (
        <button onClick={(e) => { e.stopPropagation(); onMarkRead(); }} aria-label="Marquer comme lu"
          className="shrink-0 mt-0.5 text-neutral-400 hover:text-neutral-700">
          <Check size={14} />
        </button>
      )}
      {isUnread && !onMarkRead && (
        <span className="mt-2 shrink-0 w-1.5 h-1.5 rounded-full bg-red-500 self-start" />
      )}
    </div>
  );
}
