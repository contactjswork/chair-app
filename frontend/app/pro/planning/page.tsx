'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { schedule as scheduleApi } from '@/lib/api';
import { type ApiScheduleDay, type ApiUnavailability } from '@/lib/types';
import { Ban, Trash2, Plus } from 'lucide-react';

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const WINDOW_OPTIONS: { label: string; value: number | null }[] = [
  { label: '1 semaine', value: 7 },
  { label: '2 semaines', value: 14 },
  { label: '1 mois', value: 30 },
  { label: '2 mois', value: 60 },
  { label: '3 mois', value: 90 },
  { label: 'Illimité', value: null },
];

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Fenêtre de réservation ───────────────────────────────────────────────────

function BookingWindowSection() {
  const [days, setDays]       = useState<number | null | undefined>(undefined);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    scheduleApi.bookingWindow.get()
      .then((r) => setDays((r as { booking_window_days: number | null }).booking_window_days))
      .catch(() => setDays(null));
  }, []);

  async function select(value: number | null) {
    setDays(value);
    setSaving(true);
    try {
      await scheduleApi.bookingWindow.update(value);
    } catch {}
    setSaving(false);
  }

  if (days === undefined) {
    return <div className="h-24 bg-neutral-50 rounded-xl animate-pulse" />;
  }

  return (
    <div className="border border-neutral-200 rounded-xl p-4">
      <p className="text-sm font-semibold text-neutral-900 mb-1">Fenêtre de réservation</p>
      <p className="text-xs text-neutral-400 mb-3 leading-relaxed">
        Jusqu&apos;à combien de temps à l&apos;avance les clients peuvent réserver un rendez-vous.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {WINDOW_OPTIONS.map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() => select(opt.value)}
            disabled={saving}
            className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors disabled:opacity-50 ${
              days === opt.value
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Blocages ponctuels ───────────────────────────────────────────────────────

function defaultStartTime(): string {
  // "09:00" par défaut, sauf si c'est déjà passé aujourd'hui — dans ce cas,
  // l'heure actuelle arrondie au 1/4 d'heure suivant (sinon la validation
  // "doit être après maintenant" échoue silencieusement pour l'utilisateur).
  const now = new Date();
  const nineAM = new Date(now); nineAM.setHours(9, 0, 0, 0);
  if (now <= nineAM) return '09:00';
  const rounded = new Date(now.getTime() + (15 - (now.getMinutes() % 15)) * 60000);
  return `${String(rounded.getHours()).padStart(2, '0')}:${String(rounded.getMinutes()).padStart(2, '0')}`;
}

function BlockCreateForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const today = todayLocal();
  const [startDate, setStartDate] = useState(today);
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endDate,   setEndDate]   = useState(today);
  const [endTime,   setEndTime]   = useState('18:00');
  const [reason,    setReason]    = useState('');
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  async function handleCreate() {
    setError('');
    const start = `${startDate}T${startTime}:00`;
    const end   = `${endDate}T${endTime}:00`;
    if (new Date(start) <= new Date()) {
      setError('Le début doit être dans le futur.');
      return;
    }
    if (new Date(end) <= new Date(start)) {
      setError('La fin doit être après le début.');
      return;
    }
    setSaving(true);
    try {
      await scheduleApi.unavailabilities.create({ start_datetime: start, end_datetime: end, reason: reason || undefined });
      onCreated();
    } catch {
      setError('Erreur lors de la création du blocage.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-neutral-200 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-neutral-500 mb-1 block">Du</label>
          <input type="date" value={startDate} min={today} onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-neutral-400" />
        </div>
        <div>
          <label className="text-xs text-neutral-500 mb-1 block">Heure de début</label>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
            className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-neutral-400" />
        </div>
        <div>
          <label className="text-xs text-neutral-500 mb-1 block">Au</label>
          <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-neutral-400" />
        </div>
        <div>
          <label className="text-xs text-neutral-500 mb-1 block">Heure de fin</label>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
            className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-neutral-400" />
        </div>
      </div>
      <div>
        <label className="text-xs text-neutral-500 mb-1 block">Motif (optionnel)</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex : congés, formation, rendez-vous perso…"
          className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-neutral-400 placeholder:text-neutral-300"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-neutral-500 bg-neutral-50 hover:bg-neutral-100 transition-colors">
          Annuler
        </button>
        <button onClick={handleCreate} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-700 transition-colors disabled:opacity-50">
          {saving ? 'Création…' : 'Bloquer ce créneau'}
        </button>
      </div>
    </div>
  );
}

function UnavailabilitiesSection() {
  const [items, setItems]       = useState<ApiUnavailability[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  function load() {
    scheduleApi.unavailabilities.list()
      .then((r) => setItems(r as ApiUnavailability[]))
      .catch(() => setItems([]));
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: number) {
    setDeleting(id);
    try {
      await scheduleApi.unavailabilities.delete(id);
      setItems((prev) => (prev ?? []).filter((i) => i.id !== id));
    } catch {}
    setDeleting(null);
  }

  function formatRange(u: ApiUnavailability): string {
    const s = new Date(u.start_datetime);
    const e = new Date(u.end_datetime);
    const sameDay = s.toDateString() === e.toDateString();
    const dOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const tOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
    if (sameDay) {
      return `${s.toLocaleDateString('fr-FR', dOpts)} · ${s.toLocaleTimeString('fr-FR', tOpts)} – ${e.toLocaleTimeString('fr-FR', tOpts)}`;
    }
    return `${s.toLocaleDateString('fr-FR', dOpts)} ${s.toLocaleTimeString('fr-FR', tOpts)} → ${e.toLocaleDateString('fr-FR', dOpts)} ${e.toLocaleTimeString('fr-FR', tOpts)}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-neutral-900">Blocages ponctuels</p>
          <p className="text-xs text-neutral-400 mt-0.5">Congés, pauses, indisponibilités — les clients ne pourront pas réserver sur ces créneaux.</p>
        </div>
      </div>

      {items === null ? (
        <div className="h-16 bg-neutral-50 rounded-xl animate-pulse" />
      ) : (
        <div className="space-y-2 mb-3">
          {items.map((u) => (
            <div key={u.id} className="flex items-center gap-3 border border-neutral-200 rounded-xl px-3.5 py-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                <Ban size={14} className="text-neutral-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-neutral-900 truncate">{formatRange(u)}</p>
                {u.reason && <p className="text-[12px] text-neutral-400 truncate">{u.reason}</p>}
              </div>
              <button
                onClick={() => handleDelete(u.id)}
                disabled={deleting === u.id}
                className="w-8 h-8 flex items-center justify-center rounded-full text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0 disabled:opacity-50"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {items.length === 0 && !showForm && (
            <p className="text-xs text-neutral-300 italic">Aucun blocage à venir.</p>
          )}
        </div>
      )}

      {showForm ? (
        <BlockCreateForm
          onCancel={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); load(); }}
        />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl border border-dashed border-neutral-300 text-neutral-500 text-sm font-semibold hover:border-neutral-400 hover:text-neutral-700 transition-colors"
        >
          <Plus size={15} /> Bloquer un créneau
        </button>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

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

      <div className="px-4 space-y-8">

        {/* Fenêtre de réservation */}
        <BookingWindowSection />

        {/* Horaires hebdomadaires */}
        <div>
          <p className="text-sm font-semibold text-neutral-900 mb-1">Horaires de travail</p>
          <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
            Configurez vos horaires. Les créneaux disponibles seront calculés automatiquement.
          </p>

          <div className="space-y-3">
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
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full mt-4 bg-neutral-900 text-white py-3.5 rounded-xl font-semibold text-sm disabled:opacity-50 hover:bg-neutral-700 transition-colors"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer les horaires'}
          </button>
        </div>

        {/* Blocages ponctuels */}
        <UnavailabilitiesSection />

      </div>

    </div>
  );
}
