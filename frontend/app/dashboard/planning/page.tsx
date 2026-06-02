'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardNav from '@/components/layout/DashboardNav';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { schedule as scheduleApi, appointments as appointmentsApi } from '@/lib/api';
import { apptDateStr, formatApptDate, type ApiScheduleDay, type ApiAppointment } from '@/lib/types';
import { Clock, Calendar, Check, X, ChevronLeft, ChevronRight, Phone } from 'lucide-react';

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const DAY_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

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

function formatTime(appt: ApiAppointment): string {
  if (appt.appointment_time) return appt.appointment_time.slice(0, 5);
  return appt.desired_slot ?? '';
}

function formatTimeRange(appt: ApiAppointment): string {
  const start = appt.appointment_time?.slice(0, 5);
  if (!start || !appt.duration_minutes) return start ?? '';
  const [h, m] = start.split(':').map(Number);
  const totalMin = h * 60 + m + appt.duration_minutes;
  const endH = Math.floor(totalMin / 60);
  const endM = totalMin % 60;
  return `${start} — ${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export default function DashboardPlanningPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'appointments' | 'schedule'>('appointments');
  const [appointments, setAppointments] = useState<ApiAppointment[]>([]);
  const [schedule, setSchedule] = useState<ApiScheduleDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Calendar state
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  useEffect(() => {
    if (user === undefined) return;
    if (!user || user.role !== 'hairdresser') {
      router.push('/connexion');
      return;
    }
    loadAll();
  }, [user, router]);

  // Normalize time strings from DB ("09:00:00" → "09:00")
  function normalizeTime(t: string | null | undefined): string | null {
    if (!t) return null;
    return t.slice(0, 5);
  }

  function normalizeSchedule(sched: ApiScheduleDay[]): ApiScheduleDay[] {
    return sched.map((d) => ({
      ...d,
      start_time: normalizeTime(d.start_time),
      end_time: normalizeTime(d.end_time),
      break_start: normalizeTime(d.break_start),
      break_end: normalizeTime(d.break_end),
    }));
  }

  async function loadAll() {
    try {
      const [appts, sched] = await Promise.all([
        appointmentsApi.list() as Promise<ApiAppointment[]>,
        scheduleApi.get() as Promise<ApiScheduleDay[]>,
      ]);
      setAppointments(appts);
      setSchedule(normalizeSchedule(sched));
    } catch {
      setError('Impossible de charger les donnees.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(id: number, status: string) {
    setUpdatingId(id);
    try {
      const updated = await appointmentsApi.updateStatus(id, status) as ApiAppointment;
      setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch {
      setError('Erreur lors de la mise a jour.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleSaveSchedule() {
    setSavingSchedule(true);
    setError('');
    setSuccessMsg('');
    try {
      const updated = await scheduleApi.update(schedule) as ApiScheduleDay[];
      setSchedule(normalizeSchedule(updated));
      setSuccessMsg('Horaires enregistres');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('Erreur lors de la sauvegarde des horaires.');
    } finally {
      setSavingSchedule(false);
    }
  }

  function toggleDay(dayOfWeek: number) {
    setSchedule((prev) =>
      prev.map((d) => {
        if (d.day_of_week !== dayOfWeek) return d;
        const newIsOpen = !d.is_open;
        return {
          ...d,
          is_open: newIsOpen,
          start_time: newIsOpen ? (d.start_time ?? '09:00') : d.start_time,
          end_time:   newIsOpen ? (d.end_time   ?? '19:00') : d.end_time,
        };
      })
    );
  }

  function updateScheduleDay(dayOfWeek: number, field: keyof ApiScheduleDay, value: unknown) {
    setSchedule((prev) =>
      prev.map((d) => (d.day_of_week === dayOfWeek ? { ...d, [field]: value } : d))
    );
  }

  // Calendar helpers
  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
  }
  function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
  }

  // Use apptDateStr to normalize dates for comparison
  const appointmentsForDate = appointments
    .filter((a) => apptDateStr(a) === selectedDate)
    .sort((a, b) => (a.appointment_time ?? '').localeCompare(b.appointment_time ?? ''));

  const appointmentsWithDates = appointments.filter(
    (a) => apptDateStr(a) && ['confirmed', 'pending'].includes(a.status)
  );

  const datesWithAppointments = new Set(
    appointmentsWithDates.map((a) => apptDateStr(a))
  );

  const upcomingAppointments = appointments
    .filter((a) => {
      const d = apptDateStr(a);
      return d && d >= todayStr && ['confirmed', 'pending'].includes(a.status);
    })
    .slice(0, 5);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-neutral-400 text-sm">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32">
      <div className="px-4 pt-4">
        <DashboardPageHeader title="Planning" />
      </div>

      {error && (
        <div className="mx-4 mb-4 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}
      {successMsg && (
        <div className="mx-4 mb-4 bg-neutral-900 text-white text-sm px-4 py-3 rounded-xl">{successMsg}</div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-neutral-100 px-4 mb-4">
        {[
          { key: 'appointments', label: 'Rendez-vous' },
          { key: 'schedule', label: 'Mes horaires' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`mr-6 pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === key
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: APPOINTMENTS ── */}
      {activeTab === 'appointments' && (
        <div className="px-4 space-y-4">
          {/* Mini Calendar */}
          <div className="border border-neutral-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => {
                  if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
                  else setViewMonth((m) => m - 1);
                }}
                className="p-1 hover:bg-neutral-100 rounded-lg"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold capitalize">
                {new Date(viewYear, viewMonth).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => {
                  if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
                  else setViewMonth((m) => m + 1);
                }}
                className="p-1 hover:bg-neutral-100 rounded-lg"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {DAY_SHORT.map((d) => (
                <div key={d} className="text-[10px] text-center text-neutral-400 font-medium py-1">{d}</div>
              ))}
              {Array.from({ length: getFirstDayOfMonth(viewYear, viewMonth) }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: getDaysInMonth(viewYear, viewMonth) }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === todayStr;
                const hasAppt = datesWithAppointments.has(dateStr);
                return (
                  <button
                    key={dayNum}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`relative text-xs py-1.5 rounded-lg font-medium transition-colors ${
                      isSelected
                        ? 'bg-neutral-900 text-white'
                        : isToday
                        ? 'bg-neutral-100 text-neutral-900'
                        : 'text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    {dayNum}
                    {hasAppt && (
                      <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-neutral-900'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vue jour — RDVs pour la date sélectionnée */}
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3 capitalize">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>

            {appointmentsForDate.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-neutral-200 rounded-xl">
                <Calendar size={24} className="mx-auto text-neutral-300 mb-2" />
                <p className="text-sm text-neutral-400">Aucun rendez-vous ce jour</p>
              </div>
            ) : (
              <div className="space-y-3">
                {appointmentsForDate.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appt={appt}
                    onUpdateStatus={handleUpdateStatus}
                    updating={updatingId === appt.id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Prochains rendez-vous */}
          {upcomingAppointments.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">
                Prochains rendez-vous
              </p>
              <div className="space-y-3">
                {upcomingAppointments.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appt={appt}
                    onUpdateStatus={handleUpdateStatus}
                    updating={updatingId === appt.id}
                    showDate
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: SCHEDULE ── */}
      {activeTab === 'schedule' && (
        <div className="px-4 space-y-3">
          <p className="text-sm text-neutral-500">
            Configurez vos horaires de travail. Les creneaux disponibles seront calcules automatiquement.
          </p>

          {schedule.map((day) => (
            <div key={day.day_of_week} className="border border-neutral-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-neutral-50">
                <span className="text-sm font-semibold text-neutral-900 w-24">{DAY_NAMES[day.day_of_week]}</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-neutral-500">{day.is_open ? 'Ouvert' : 'Ferme'}</span>
                  <div
                    onClick={() => toggleDay(day.day_of_week)}
                    className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${day.is_open ? 'bg-neutral-900' : 'bg-neutral-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${day.is_open ? 'translate-x-5' : ''}`} />
                  </div>
                </label>
              </div>

              {day.is_open && (
                <div className="px-4 py-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">Ouverture</label>
                    <input
                      type="time"
                      value={day.start_time ?? '09:00'}
                      onChange={(e) => updateScheduleDay(day.day_of_week, 'start_time', e.target.value)}
                      className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">Fermeture</label>
                    <input
                      type="time"
                      value={day.end_time ?? '19:00'}
                      onChange={(e) => updateScheduleDay(day.day_of_week, 'end_time', e.target.value)}
                      className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">Pause debut (optionnel)</label>
                    <input
                      type="time"
                      value={day.break_start ?? ''}
                      onChange={(e) => updateScheduleDay(day.day_of_week, 'break_start', e.target.value || null)}
                      className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">Pause fin (optionnel)</label>
                    <input
                      type="time"
                      value={day.break_end ?? ''}
                      onChange={(e) => updateScheduleDay(day.day_of_week, 'break_end', e.target.value || null)}
                      className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={handleSaveSchedule}
            disabled={savingSchedule}
            className="w-full bg-neutral-900 text-white py-3 rounded-xl font-medium text-sm disabled:opacity-50"
          >
            {savingSchedule ? 'Enregistrement...' : 'Enregistrer les horaires'}
          </button>
        </div>
      )}

      <DashboardNav />
    </div>
  );
}

// ── Appointment Card ──────────────────────────────────────────────────

function AppointmentCard({
  appt,
  onUpdateStatus,
  updating,
  showDate = false,
}: {
  appt: ApiAppointment;
  onUpdateStatus: (id: number, status: string) => void;
  updating: boolean;
  showDate?: boolean;
}) {
  const canComplete = appt.status === 'confirmed';
  const canCancel = ['pending', 'confirmed'].includes(appt.status);
  const canMarkNoShow = appt.status === 'confirmed';

  const startTime = appt.appointment_time?.slice(0, 5);
  const endTime = (() => {
    if (!startTime || !appt.duration_minutes) return null;
    const [h, m] = startTime.split(':').map(Number);
    const total = h * 60 + m + appt.duration_minutes;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  })();

  const dateLabel = showDate ? formatApptDate(appt, { weekday: 'long', day: 'numeric', month: 'long' }) : null;

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3">
        {/* Date (vue "prochains RDV") */}
        {dateLabel && (
          <p className="text-[11px] text-neutral-400 mb-2 capitalize font-medium">{dateLabel}</p>
        )}

        {/* Créneau horaire */}
        {(startTime || appt.desired_slot) && (
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-neutral-900 text-white text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <Clock size={11} />
              {startTime && endTime ? `${startTime} — ${endTime}` : (startTime ?? appt.desired_slot ?? '')}
            </div>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_COLOR[appt.status] ?? 'bg-neutral-100 text-neutral-500 border-neutral-200'}`}>
              {STATUS_LABEL[appt.status] ?? appt.status}
            </span>
          </div>
        )}

        {/* Client + service */}
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-neutral-900">{appt.client_name}</p>
          <p className="text-xs text-neutral-500">{appt.service}</p>
          <div className="flex items-center gap-3 flex-wrap mt-1">
            {appt.duration_minutes && (
              <span className="text-xs text-neutral-400">{appt.duration_minutes} min</span>
            )}
            {appt.price && (
              <span className="text-xs font-semibold text-neutral-900">{parseFloat(appt.price).toFixed(0)} €</span>
            )}
          </div>
          {appt.client_phone && (
            <p className="flex items-center gap-1 text-xs text-neutral-400 mt-0.5">
              <Phone size={11} />
              {appt.client_phone}
            </p>
          )}
        </div>

        {/* Actions */}
        {(canComplete || canCancel) && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-neutral-100">
            {canComplete && (
              <button
                onClick={() => onUpdateStatus(appt.id, 'completed')}
                disabled={updating}
                className="flex items-center gap-1.5 text-xs bg-neutral-900 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
              >
                <Check size={12} />
                Terminer
              </button>
            )}
            {canMarkNoShow && (
              <button
                onClick={() => onUpdateStatus(appt.id, 'no_show')}
                disabled={updating}
                className="text-xs border border-orange-200 text-orange-600 px-3 py-1.5 rounded-lg disabled:opacity-50"
              >
                Absent
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => onUpdateStatus(appt.id, 'cancelled')}
                disabled={updating}
                className="flex items-center gap-1.5 text-xs border border-neutral-200 text-neutral-500 px-3 py-1.5 rounded-lg disabled:opacity-50"
              >
                <X size={12} />
                Annuler
              </button>
            )}
            {appt.review_token && (
              <button
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/avis/${appt.review_token}`)}
                className="text-xs border border-neutral-200 text-neutral-500 px-3 py-1.5 rounded-lg"
              >
                Copier lien avis
              </button>
            )}
          </div>
        )}

        {appt.review_token && !canComplete && !canCancel && (
          <div className="mt-3 pt-3 border-t border-neutral-100">
            <button
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/avis/${appt.review_token}`)}
              className="text-xs border border-neutral-200 text-neutral-500 px-3 py-1.5 rounded-lg"
            >
              Copier lien avis
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
