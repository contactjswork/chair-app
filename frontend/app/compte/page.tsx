'use client';

import AppShell from '@/components/layout/AppShell';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { resolveMediaUrl, apptDateStr, formatApptDate, type ApiAppointment } from '@/lib/types';
import { appointments as appointmentsApi } from '@/lib/api';
import { useEffect, useState } from 'react';
import { User, LogIn, UserPlus, LayoutDashboard, ChevronRight, LogOut, Clock, CalendarDays, Bell } from 'lucide-react';
import { useNotificationCount } from '@/contexts/NotificationContext';

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirme',
  completed: 'Termine',
  declined: 'Refuse',
  cancelled: 'Annule',
  no_show: 'Absent',
  pending_payment: 'Paiement en attente',
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-green-50 text-green-700 border-green-200',
  completed: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  declined: 'bg-red-50 text-red-600 border-red-200',
  cancelled: 'bg-neutral-100 text-neutral-400 border-neutral-200',
  no_show: 'bg-orange-50 text-orange-600 border-orange-200',
  pending_payment: 'bg-blue-50 text-blue-700 border-blue-200',
};

export default function ComptePage() {
  const { user, isLoading, logout } = useAuth();
  const { unreadCount } = useNotificationCount();
  const [myAppointments, setMyAppointments] = useState<ApiAppointment[]>([]);
  const [apptLoading, setApptLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'client') return;
    setApptLoading(true);
    appointmentsApi.myList()
      .then((data) => setMyAppointments(data as ApiAppointment[]))
      .catch(() => {})
      .finally(() => setApptLoading(false));
  }, [user]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto px-4 pt-6">
          <div className="h-8 w-32 bg-neutral-100 rounded-lg animate-pulse mb-6" />
          <div className="space-y-3">
            <div className="h-32 bg-neutral-100 rounded-2xl animate-pulse" />
            <div className="h-14 bg-neutral-100 rounded-xl animate-pulse" />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 md:px-6 pt-6 md:pt-8 pb-24">
        <h1 className="text-xl font-bold text-neutral-900 mb-6">Mon compte</h1>

        {!user ? (
          <div className="space-y-4">
            <div className="bg-neutral-50 rounded-2xl p-6 text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-neutral-200 flex items-center justify-center mx-auto mb-4">
                <User size={28} className="text-neutral-400" />
              </div>
              <h3 className="font-semibold text-neutral-900 mb-2">Connectez-vous à CHAIR</h3>
              <p className="text-sm text-neutral-500">Accédez à votre profil, vos favoris et bien plus.</p>
            </div>

            <Link
              href="/connexion"
              className="flex items-center justify-between w-full bg-neutral-900 text-white px-5 py-4 rounded-xl hover:bg-neutral-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <LogIn size={18} />
                <span className="font-semibold">Se connecter</span>
              </div>
              <ChevronRight size={18} />
            </Link>

            <Link
              href="/inscription"
              className="flex items-center justify-between w-full bg-white border border-neutral-200 text-neutral-900 px-5 py-4 rounded-xl hover:border-neutral-400 transition-colors"
            >
              <div className="flex items-center gap-3">
                <UserPlus size={18} />
                <span className="font-semibold">Créer un compte</span>
              </div>
              <ChevronRight size={18} />
            </Link>

            <div className="border-t border-neutral-100 pt-4 mt-6">
              <p className="text-xs text-neutral-400 text-center mb-4">Vous êtes coiffeur ?</p>
              <Link
                href="/inscription?role=hairdresser"
                className="flex items-center justify-between w-full border border-neutral-200 text-neutral-700 px-5 py-4 rounded-xl hover:border-neutral-400 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard size={18} />
                  <div>
                    <p className="font-semibold text-sm">Créer mon profil professionnel</p>
                    <p className="text-xs text-neutral-400">Développez votre visibilité sur CHAIR</p>
                  </div>
                </div>
                <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile card */}
            <div className="bg-neutral-50 rounded-2xl p-6 flex items-center gap-4">
              <div className="relative w-14 h-14 rounded-full overflow-hidden bg-neutral-200 flex-shrink-0 flex items-center justify-center">
                {resolveMediaUrl(user.avatar) ? (
                  <Image src={resolveMediaUrl(user.avatar)!} alt={user.name} fill className="object-cover" sizes="56px" />
                ) : (
                  <User size={24} className="text-neutral-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-neutral-900 truncate">{user.name}</p>
                <p className="text-sm text-neutral-500 truncate">{user.email}</p>
                <span className="inline-block mt-1 text-[11px] font-semibold tracking-wide uppercase text-neutral-400">
                  {user.role === 'client' ? 'Client' : user.role === 'hairdresser' ? 'Coiffeur' : 'Salon'}
                  {user.city ? ` — ${user.city}` : ''}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-50">
              {user.role === 'hairdresser' && (
                <Link
                  href="/dashboard"
                  className="flex items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-3 text-neutral-900">
                    <LayoutDashboard size={18} className="text-neutral-400" />
                    <span className="font-semibold text-sm">Mon tableau de bord</span>
                  </div>
                  <ChevronRight size={16} className="text-neutral-300" />
                </Link>
              )}
              <Link
                href="/notifications"
                className="flex items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-3 text-neutral-900">
                  <Bell size={18} className="text-neutral-400" />
                  <span className="font-semibold text-sm">Notifications</span>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <span className="min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                  <ChevronRight size={16} className="text-neutral-300" />
                </div>
              </Link>
            </div>

            {/* Mes réservations (clients uniquement) */}
            {user.role === 'client' && (
              <div>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">
                  Mes réservations
                </p>

                {apptLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-24 bg-neutral-100 rounded-2xl animate-pulse" />
                    ))}
                  </div>
                ) : myAppointments.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-neutral-200 rounded-2xl">
                    <CalendarDays size={28} className="mx-auto text-neutral-300 mb-2" />
                    <p className="text-sm text-neutral-400">Aucune réservation</p>
                    <p className="text-xs text-neutral-300 mt-1">Vos prochains rendez-vous apparaîtront ici</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myAppointments.map((appt) => (
                      <ClientAppointmentCard key={appt.id} appt={appt} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Logout */}
            <button
              onClick={logout}
              className="flex items-center gap-3 w-full px-5 py-4 rounded-xl border border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 transition-colors"
            >
              <LogOut size={18} />
              <span className="font-semibold text-sm">Se déconnecter</span>
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ── Client Appointment Card ───────────────────────────────────────────

function ClientAppointmentCard({ appt }: { appt: ApiAppointment }) {
  const hairdresserName = appt.hairdresser?.user?.name ?? 'Coiffeur';
  const hairdresserSlug = appt.hairdresser?.slug;
  const hairdresserCity = appt.hairdresser?.city;
  const dateLabel = formatApptDate(appt, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const startTime = appt.appointment_time?.slice(0, 5);

  const endTime = (() => {
    if (!startTime || !appt.duration_minutes) return null;
    const [h, m] = startTime.split(':').map(Number);
    const total = h * 60 + m + appt.duration_minutes;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  })();

  return (
    <div className="border border-neutral-200 rounded-2xl overflow-hidden">
      <div className="px-4 py-4">
        {/* Hairdresser + status */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-neutral-900 truncate">{hairdresserName}</p>
            {hairdresserCity && (
              <p className="text-xs text-neutral-400">{hairdresserCity}</p>
            )}
          </div>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${STATUS_COLOR[appt.status] ?? 'bg-neutral-100 text-neutral-500 border-neutral-200'}`}>
            {STATUS_LABEL[appt.status] ?? appt.status}
          </span>
        </div>

        {/* Service */}
        <p className="text-sm text-neutral-700 font-medium">{appt.service}</p>

        {/* Date + heure */}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {dateLabel && (
            <span className="text-xs text-neutral-500 capitalize">{dateLabel}</span>
          )}
          {startTime && (
            <span className="flex items-center gap-1 text-xs font-semibold text-neutral-900">
              <Clock size={11} />
              {startTime && endTime ? `${startTime} — ${endTime}` : startTime}
            </span>
          )}
        </div>

        {/* Durée + prix */}
        <div className="flex items-center gap-3 mt-1.5">
          {appt.duration_minutes && (
            <span className="text-xs text-neutral-400">{appt.duration_minutes} min</span>
          )}
          {appt.price && (
            <span className="text-xs font-semibold text-neutral-900">{parseFloat(appt.price).toFixed(0)} €</span>
          )}
        </div>

        {/* Voir le profil */}
        {hairdresserSlug && (
          <div className="mt-3 pt-3 border-t border-neutral-100">
            <Link
              href={`/coiffeur/${hairdresserSlug}`}
              className="text-xs font-medium text-neutral-700 hover:text-neutral-900 flex items-center gap-1"
            >
              Voir le profil du coiffeur
              <ChevronRight size={12} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
