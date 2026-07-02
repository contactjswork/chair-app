'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardNav from '@/components/layout/DashboardNav';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { schedule as scheduleApi } from '@/lib/api';
import { type ApiScheduleDay } from '@/lib/types';

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function PlanningPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [schedule,       setSchedule]       = useState<ApiScheduleDay[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState('');
  const [successMsg,     setSuccessMsg]     = useState('');

  useEffect(() => {
    if (user === undefined) return;
    if (!user || user.role !== 'hairdresser') { router.push('/connexion'); return; }
    if (user.hairdresser_profile?.is_independent === false) { router.replace('/pro'); return; }
    scheduleApi.get()
      .then((sched) => setSchedule(normalizeSchedule(sched as ApiScheduleDay[])))
      .catch(() => setError('Impossible de charger les horaires.'))
      .finally(() => setLoading(false));
  }, [user, router]);

  function normalizeTime(t: string | null | undefined): string | null {
    if (!t) return null;
    return t.slice(0, 5);
  }

  function normalizeSchedule(sched: ApiScheduleDay[]): ApiScheduleDay[] {
    return sched.map((d) => ({
      ...d,
      start_time:  normalizeTime(d.start_time),
      end_time:    normalizeTime(d.end_time),
      break_start: normalizeTime(d.break_start),
      break_end:   normalizeTime(d.break_end),
    }));
  }

  function toggleDay(dayOfWeek: number) {
    setSchedule((prev) =>
      prev.map((d) => {
        if (d.day_of_week !== dayOfWeek) return d;
        const open = !d.is_open;
        return {
          ...d,
          is_open:    open,
          start_time: open ? (d.start_time ?? '09:00') : d.start_time,
          end_time:   open ? (d.end_time   ?? '19:00') : d.end_time,
        };
      })
    );
  }

  function updateField(dayOfWeek: number, field: keyof ApiScheduleDay, value: unknown) {
    setSchedule((prev) =>
      prev.map((d) => (d.day_of_week === dayOfWeek ? { ...d, [field]: value } : d))
    );
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const updated = await scheduleApi.update(schedule) as ApiScheduleDay[];
      setSchedule(normalizeSchedule(updated));
      setSuccessMsg('Horaires enregistrés');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32">
      <div className="px-4 pt-4">
        <DashboardPageHeader title="Mes horaires" />
      </div>

      {error && (
        <div className="mx-4 mb-4 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}
      {successMsg && (
        <div className="mx-4 mb-4 bg-neutral-900 text-white text-sm px-4 py-3 rounded-xl">{successMsg}</div>
      )}

      <div className="px-4 space-y-3">
        <p className="text-sm text-neutral-500 mb-4">
          Configurez vos horaires de travail. Les créneaux disponibles seront calculés automatiquement.
        </p>

        {schedule.map((day) => (
          <div key={day.day_of_week} className="border border-neutral-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-neutral-50">
              <span className="text-sm font-semibold text-neutral-900 w-28">{DAY_NAMES[day.day_of_week]}</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-neutral-500">{day.is_open ? 'Ouvert' : 'Fermé'}</span>
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
                    onChange={(e) => updateField(day.day_of_week, 'start_time', e.target.value)}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-neutral-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Fermeture</label>
                  <input
                    type="time"
                    value={day.end_time ?? '19:00'}
                    onChange={(e) => updateField(day.day_of_week, 'end_time', e.target.value)}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-neutral-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Pause début (optionnel)</label>
                  <input
                    type="time"
                    value={day.break_start ?? ''}
                    onChange={(e) => updateField(day.day_of_week, 'break_start', e.target.value || null)}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-neutral-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Pause fin (optionnel)</label>
                  <input
                    type="time"
                    value={day.break_end ?? ''}
                    onChange={(e) => updateField(day.day_of_week, 'break_end', e.target.value || null)}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-neutral-400 transition-colors"
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-neutral-900 text-white py-3.5 rounded-xl font-semibold text-sm disabled:opacity-50 hover:bg-neutral-700 transition-colors"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer les horaires'}
        </button>
      </div>

      <DashboardNav />
    </div>
  );
}
