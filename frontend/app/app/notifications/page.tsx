'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell, Check, CheckCheck, Calendar, Star, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationCount } from '@/contexts/NotificationContext';
import { notifications as notifApi } from '@/lib/api';
import type { ApiNotification } from '@/lib/types';
import { formatDate } from '@/lib/types';

function notifStyle(type: string) {
  switch (type) {
    case 'appointment_created':
    case 'appointment_confirmed':
    case 'appointment_cancelled':
      return { icon: <Calendar size={16} />, bg: 'bg-blue-50', fg: 'text-blue-600' };
    case 'review_request':
    case 'review_received':
      return { icon: <Star size={16} />, bg: 'bg-amber-50', fg: 'text-amber-600' };
    case 'new_follower':
      return { icon: <UserPlus size={16} />, bg: 'bg-rose-50', fg: 'text-rose-600' };
    default:
      return { icon: <Bell size={16} />, bg: 'bg-neutral-100', fg: 'text-neutral-500' };
  }
}

function NotifCard({
  notif,
  onMarkRead,
}: {
  notif: ApiNotification;
  onMarkRead: (id: number) => void;
}) {
  const isUnread = !notif.read_at;
  const title = notif.title ?? notif.type;
  const message = notif.message ?? '';
  const { icon, bg, fg } = notifStyle(notif.type);

  return (
    <div
      className={`relative flex gap-3 px-4 py-3.5 rounded-2xl transition-colors ${
        isUnread ? 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_10px_rgba(0,0,0,0.03)]' : 'bg-white/60'
      }`}
    >
      {isUnread && <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-neutral-900" />}

      <div className={`mt-0.5 shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${bg} ${fg}`}>
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-[13.5px] leading-snug ${isUnread ? 'font-semibold text-neutral-900' : 'font-medium text-neutral-500'}`}>
            {title}
          </p>
          {isUnread && (
            <button
              onClick={() => onMarkRead(notif.id)}
              className="shrink-0 w-6 h-6 -mt-1 -mr-1 flex items-center justify-center text-neutral-300 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors"
              aria-label="Marquer comme lu"
            >
              <Check size={14} />
            </button>
          )}
        </div>
        {message && (
          <p className="text-[12.5px] text-neutral-500 mt-0.5 leading-relaxed">{message}</p>
        )}
        <p className="text-[11px] text-neutral-400 mt-1.5">{formatDate(notif.created_at)}</p>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { refresh: refreshBadge } = useNotificationCount();
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(() => {
    if (!user) return;
    notifApi.listAll()
      .then((data) => {
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user) {
      router.replace('/connexion');
      return;
    }
    load();
  }, [user, load, router]);

  const handleMarkRead = async (id: number) => {
    try {
      await notifApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      refreshBadge();
    } catch {}
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notifApi.markAllRead();
      const now = new Date().toISOString();
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
      setUnreadCount(0);
      refreshBadge();
    } catch {}
    setMarkingAll(false);
  };

  const unread = notifications.filter((n) => !n.read_at);
  const read = notifications.filter((n) => !!n.read_at);

  return (
    <AppShell>
      <div className="min-h-screen bg-neutral-50">
        <div className="max-w-lg mx-auto px-4 pb-24">
          {/* Header */}
          <div className="pt-4">
            <PageHeader
              title="Notifications"
              right={
                unreadCount > 0 ? (
                  <button
                    onClick={handleMarkAllRead}
                    disabled={markingAll}
                    className="text-[12px] font-semibold text-neutral-900 bg-neutral-100 hover:bg-neutral-200 transition-colors disabled:opacity-50 rounded-full px-3 py-1.5"
                  >
                    Tout marquer lu
                  </button>
                ) : undefined
              }
            />
            {unreadCount > 0 && (
              <p className="text-[12px] text-neutral-400 -mt-1 mb-3">
                {unreadCount} notification{unreadCount > 1 ? 's' : ''} non {unreadCount > 1 ? 'lues' : 'lue'}
              </p>
            )}
          </div>

          {loading && (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3 px-4 py-3.5 rounded-2xl bg-white">
                  <div className="w-9 h-9 rounded-full bg-neutral-100 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2 pt-0.5">
                    <div className="h-3 bg-neutral-100 rounded animate-pulse w-2/3" />
                    <div className="h-2.5 bg-neutral-100 rounded animate-pulse w-full" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_10px_rgba(0,0,0,0.03)] flex items-center justify-center mb-4">
                <Bell size={22} className="text-neutral-300" />
              </div>
              <p className="text-[15px] font-semibold text-neutral-900">Rien à signaler</p>
              <p className="text-[13px] text-neutral-400 mt-1 max-w-[220px] leading-relaxed">
                Réservations, avis et nouveaux abonnés apparaîtront ici.
              </p>
            </div>
          )}

          {!loading && unread.length > 0 && (
            <section>
              <div className="flex items-center gap-2 pt-1 pb-2">
                <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-neutral-400">Nouvelles</p>
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
              </div>
              <div className="space-y-2">
                {unread.map((n) => (
                  <NotifCard key={n.id} notif={n} onMarkRead={handleMarkRead} />
                ))}
              </div>
            </section>
          )}

          {!loading && read.length > 0 && (
            <section className="mt-5">
              <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-neutral-400 pt-1 pb-2">
                Plus tôt
              </p>
              <div className="space-y-2">
                {read.map((n) => (
                  <NotifCard key={n.id} notif={n} onMarkRead={handleMarkRead} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}
