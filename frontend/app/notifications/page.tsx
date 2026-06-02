'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell, Check, CheckCheck, Calendar, Star, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { notifications as notifApi } from '@/lib/api';
import type { ApiNotification } from '@/lib/types';
import { formatDate } from '@/lib/types';

function notifIcon(type: string) {
  switch (type) {
    case 'appointment_created':
    case 'appointment_confirmed':
    case 'appointment_cancelled':
      return <Calendar size={16} className="text-neutral-500" />;
    case 'review_request':
    case 'review_received':
      return <Star size={16} className="text-neutral-500" />;
    case 'new_follower':
      return <UserPlus size={16} className="text-neutral-500" />;
    default:
      return <Bell size={16} className="text-neutral-500" />;
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

  return (
    <div
      className={`flex gap-3 px-4 py-3.5 border-b border-neutral-100 last:border-0 transition-colors ${
        isUnread ? 'bg-neutral-50' : 'bg-white'
      }`}
    >
      <div className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center">
        {notifIcon(notif.type)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-[13px] leading-snug ${isUnread ? 'font-semibold text-neutral-900' : 'font-medium text-neutral-700'}`}>
            {title}
          </p>
          {isUnread && (
            <button
              onClick={() => onMarkRead(notif.id)}
              className="shrink-0 text-neutral-400 hover:text-neutral-700 transition-colors"
              aria-label="Marquer comme lu"
            >
              <Check size={14} />
            </button>
          )}
        </div>
        {message && (
          <p className="text-[12px] text-neutral-500 mt-0.5 leading-relaxed">{message}</p>
        )}
        <p className="text-[11px] text-neutral-400 mt-1">{formatDate(notif.created_at)}</p>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
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
    } catch {}
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notifApi.markAllRead();
      const now = new Date().toISOString();
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
      setUnreadCount(0);
    } catch {}
    setMarkingAll(false);
  };

  const unread = notifications.filter((n) => !n.read_at);
  const read = notifications.filter((n) => !!n.read_at);

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-0 pb-24">
        {/* Header */}
        <div className="px-4 pt-4">
          <PageHeader
            title="Notifications"
            right={
              unreadCount > 0 ? (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  className="flex items-center gap-1 text-[12px] font-medium text-neutral-600 hover:text-neutral-900 transition-colors disabled:opacity-50"
                >
                  <CheckCheck size={13} />
                  Tout lu
                </button>
              ) : undefined
            }
          />
          {unreadCount > 0 && (
            <p className="text-[12px] text-neutral-400 -mt-1 mb-2">
              {unreadCount} non {unreadCount > 1 ? 'lues' : 'lue'}
            </p>
          )}
        </div>

        {loading && (
          <div className="space-y-px">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3 px-4 py-3.5">
                <div className="w-8 h-8 rounded-full bg-neutral-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2 pt-0.5">
                  <div className="h-3 bg-neutral-100 rounded animate-pulse w-2/3" />
                  <div className="h-2.5 bg-neutral-100 rounded animate-pulse w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
              <Bell size={20} className="text-neutral-400" />
            </div>
            <p className="text-[14px] font-medium text-neutral-700">Aucune notification</p>
            <p className="text-[12px] text-neutral-400 mt-1">Vos alertes apparaitront ici.</p>
          </div>
        )}

        {!loading && unread.length > 0 && (
          <section>
            <p className="px-4 pt-2 pb-1 text-[10px] font-semibold tracking-[0.15em] uppercase text-neutral-400">
              Non lues
            </p>
            <div className="border-t border-neutral-100">
              {unread.map((n) => (
                <NotifCard key={n.id} notif={n} onMarkRead={handleMarkRead} />
              ))}
            </div>
          </section>
        )}

        {!loading && read.length > 0 && (
          <section className="mt-4">
            <p className="px-4 pt-2 pb-1 text-[10px] font-semibold tracking-[0.15em] uppercase text-neutral-400">
              Lues
            </p>
            <div className="border-t border-neutral-100">
              {read.map((n) => (
                <NotifCard key={n.id} notif={n} onMarkRead={handleMarkRead} />
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
