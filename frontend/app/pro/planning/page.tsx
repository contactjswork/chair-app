'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { schedule as scheduleApi } from '@/lib/api';
import { type ApiScheduleDay, type ApiUnavailability } from '@/lib/types';
import { Ban, Trash2, Plus, CalendarClock, ChevronDown, Copy, Check } from 'lucide-react';

/**
 * Mes horaires — refonte.
 *
 * L'ancienne version empilait 7 cartes de 4 champs heure : 28 champs à
 * l'écran, aucun résumé, et une « fenêtre de réservation » en pastilles
 * muettes. Ici :
 *
 *  - La fenêtre devient une PHRASE : « Réservations ouvertes jusqu'à
 *    J+30 » — le coiffeur comprend ce que voient ses clients.
 *  - La semaine type est une liste compacte : une ligne par jour avec son
 *    résumé (« 09:00 – 19:00 · pause 12:00 »), l'éditeur ne s'ouvre que
 *    pour le jour qu'on touche. « Appliquer aux autres jours ouverts »
 *    règle la semaine en un geste.
 *  - La barre Enregistrer n'apparaît que s'il y a quelque chose à
 *    enregistrer.
 *
 * Champs heure en 16px : en dessous, Safari iOS zoome la page à la prise
 * de focus (règle établie sur tout CHAIR PRO).
 */

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
// Lundi d'abord — personne ne pense sa semaine en commençant par dimanche.
const ORDRE_JOURS = [1, 2, 3, 4, 5, 6, 0];

const WINDOW_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'J+7',      value: 7 },
  { label: 'J+14',     value: 14 },
  { label: 'J+30',     value: 30 },
  { label: 'J+60',     value: 60 },
  { label: 'J+90',     value: 90 },
  { label: 'Illimité', value: null },
];

const INPUT_HEURE =
  'w-full bg-neutral-50 ring-1 ring-neutral-100 rounded-xl px-3 py-2.5 text-[16px] tabular-nums focus:outline-none focus:ring-neutral-300 transition-all';

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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

// ── Fenêtre de réservation ───────────────────────────────────────────────────

function BookingWindowSection() {
  const [days, setDays]     = useState<number | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);

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
    return <div className="h-32 bg-neutral-50 rounded-[24px] animate-pulse" />;
  }

  return (
    <div
      className="rounded-[24px] p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_2px_4px_-2px_rgba(10,10,10,0.4),0_14px_30px_-14px_rgba(10,10,10,0.5)]"
      style={{ background: 'radial-gradient(120% 100% at 50% 0%, #1f1f21 0%, #0a0a0a 62%)' }}
    >
      <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40 flex items-center gap-1.5 mb-2">
        <CalendarClock size={11} />Fenêtre de réservation
      </p>
      <p className="text-[17px] font-bold leading-snug mb-4">
        {days === null
          ? <>Votre planning est ouvert <span className="text-white">sans limite</span> de date.</>
          : <>Vos clients peuvent réserver jusqu&apos;à <span className="whitespace-nowrap">J+{days}</span>{days >= 30 ? ` (${Math.round(days / 30)} mois)` : ''}.</>}
      </p>
      <div className="flex flex-wrap gap-x-1.5 gap-y-3">
        {WINDOW_OPTIONS.map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() => select(opt.value)}
            disabled={saving}
            className={`relative before:absolute before:-inset-y-[6px] before:inset-x-0 before:content-[''] px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-colors disabled:opacity-50 ${
              days === opt.value
                ? 'bg-white text-neutral-900'
                : 'bg-white/10 text-white/70 hover:bg-white/15'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Semaine type ─────────────────────────────────────────────────────────────

function resumeJour(d: ApiScheduleDay): string {
  if (!d.is_open || !d.start_time || !d.end_time) return 'Fermé';
  let s = `${d.start_time} – ${d.end_time}`;
  if (d.break_start && d.break_end) s += `  ·  pause ${d.break_start} – ${d.break_end}`;
  return s;
}

function LigneJour({ day, ouvert, onToggle, onOuvrir, onChange, onCopier }: {
  day: ApiScheduleDay;
  ouvert: boolean;
  onToggle: () => void;
  onOuvrir: () => void;
  onChange: (field: keyof ApiScheduleDay, value: unknown) => void;
  onCopier: () => void;
}) {
  const avecPause = !!(day.break_start || day.break_end);

  return (
    <div className={`bg-white rounded-[20px] ring-1 transition-shadow ${ouvert ? 'ring-neutral-200 shadow-[0_8px_24px_-10px_rgba(10,10,10,0.18)]' : 'ring-neutral-100 shadow-[0_3px_12px_-8px_rgba(10,10,10,0.1)]'}`}>
      {/* La ligne : jour, résumé, interrupteur. Toute la ligne déplie. */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <button
          onClick={day.is_open ? onOuvrir : undefined}
          className={`flex-1 min-w-0 flex items-center gap-3 text-left ${day.is_open ? '' : 'cursor-default'}`}
        >
          <span className={`text-[14px] font-bold w-[4.6rem] flex-shrink-0 ${day.is_open ? 'text-neutral-900' : 'text-neutral-300'}`}>
            {DAY_NAMES[day.day_of_week]}
          </span>
          <span className={`text-[13px] tabular-nums truncate ${day.is_open ? 'text-neutral-500' : 'text-neutral-300'}`}>
            {resumeJour(day)}
          </span>
          {day.is_open && (
            <ChevronDown size={14} className={`text-neutral-300 flex-shrink-0 ml-auto transition-transform ${ouvert ? 'rotate-180' : ''}`} />
          )}
        </button>
        <div
          onClick={onToggle}
          role="switch"
          aria-checked={day.is_open}
          aria-label={`${DAY_NAMES[day.day_of_week]} ${day.is_open ? 'ouvert' : 'fermé'}`}
          className={`relative before:absolute before:-inset-2 before:content-[''] w-11 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0 ${day.is_open ? 'bg-neutral-900' : 'bg-neutral-200'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${day.is_open ? 'translate-x-5' : ''}`} />
        </div>
      </div>

      {/* L'éditeur — seulement pour le jour qu'on touche. */}
      {ouvert && day.is_open && (
        <div className="px-4 pb-4 pt-1 border-t border-neutral-50">
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1.5 block">Ouverture</label>
              <input type="time" value={day.start_time ?? '09:00'}
                onChange={(e) => onChange('start_time', e.target.value)} className={INPUT_HEURE} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1.5 block">Fermeture</label>
              <input type="time" value={day.end_time ?? '19:00'}
                onChange={(e) => onChange('end_time', e.target.value)} className={INPUT_HEURE} />
            </div>
          </div>

          {/* La pause n'expose ses champs que si elle existe. */}
          {avecPause ? (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide">Pause</label>
                <button
                  onClick={() => { onChange('break_start', null); onChange('break_end', null); }}
                  className="relative before:absolute before:-inset-2 before:content-[''] text-[12px] font-semibold text-neutral-400 hover:text-red-500 transition-colors"
                >
                  Retirer
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="time" value={day.break_start ?? ''} aria-label="Début de pause"
                  onChange={(e) => onChange('break_start', e.target.value || null)} className={INPUT_HEURE} />
                <input type="time" value={day.break_end ?? ''} aria-label="Fin de pause"
                  onChange={(e) => onChange('break_end', e.target.value || null)} className={INPUT_HEURE} />
              </div>
            </div>
          ) : (
            <button
              onClick={() => { onChange('break_start', '12:00'); onChange('break_end', '13:00'); }}
              className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-neutral-500 hover:text-neutral-900 transition-colors py-1"
            >
              <Plus size={14} /> Ajouter une pause déjeuner
            </button>
          )}

          <button
            onClick={onCopier}
            className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-neutral-50 text-[13px] font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <Copy size={13} /> Appliquer ces horaires aux autres jours ouverts
          </button>
        </div>
      )}
    </div>
  );
}

// ── Absences ─────────────────────────────────────────────────────────────────

function defaultStartTime(): string {
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
    if (new Date(start) <= new Date()) { setError('Le début doit être dans le futur.'); return; }
    if (new Date(end) <= new Date(start)) { setError('La fin doit être après le début.'); return; }
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
    <div className="bg-white rounded-[20px] shadow-[0_4px_16px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-100 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1.5 block">Du</label>
          <input type="date" value={startDate} min={today} onChange={(e) => setStartDate(e.target.value)} className={INPUT_HEURE} />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1.5 block">À partir de</label>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={INPUT_HEURE} />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1.5 block">Au</label>
          <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className={INPUT_HEURE} />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1.5 block">Jusqu&apos;à</label>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={INPUT_HEURE} />
        </div>
      </div>
      <div>
        <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1.5 block">Motif (optionnel)</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Congés, formation, rendez-vous perso…"
          className="w-full bg-neutral-50 ring-1 ring-neutral-100 rounded-xl px-3 py-2.5 text-[16px] focus:outline-none focus:ring-neutral-300 transition-all placeholder:text-neutral-300"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-neutral-500 bg-neutral-100 hover:bg-neutral-200 transition-colors">
          Annuler
        </button>
        <button onClick={handleCreate} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-700 transition-colors disabled:opacity-50">
          {saving ? 'Création…' : 'Bloquer'}
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
      <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-1">Absences</p>
      <p className="text-xs text-neutral-400 mb-3">Congés, formations — aucune réservation possible sur ces périodes.</p>

      {items === null ? (
        <div className="h-16 bg-neutral-50 rounded-2xl animate-pulse" />
      ) : (
        <div className="space-y-2 mb-3">
          {items.map((u) => (
            <div key={u.id} className="flex items-center gap-3 bg-white rounded-2xl shadow-[0_3px_14px_-8px_rgba(10,10,10,0.12)] ring-1 ring-neutral-50 px-3.5 py-3">
              <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                <Ban size={14} className="text-neutral-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-neutral-900 truncate">{formatRange(u)}</p>
                {u.reason && <p className="text-[12px] text-neutral-400 truncate">{u.reason}</p>}
              </div>
              <button
                onClick={() => handleDelete(u.id)}
                disabled={deleting === u.id}
                aria-label="Supprimer ce blocage"
                className="w-8 h-8 flex items-center justify-center rounded-full text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0 disabled:opacity-50"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {items.length === 0 && !showForm && (
            <p className="text-xs text-neutral-400 italic">Aucune absence prévue.</p>
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
          className="w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl border border-dashed border-neutral-300 text-neutral-500 text-sm font-semibold hover:border-neutral-400 hover:text-neutral-700 transition-colors"
        >
          <Plus size={15} /> Ajouter une absence
        </button>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PlanningPage() {
  // useRequireAuth : capacité, pas rôle — un gérant double-identité en Mode
  // Coiffeur garde l'accès à son propre planning.
  const { user, isLoading: authLoading } = useRequireAuth(['hairdresser']);
  const router = useRouter();

  const [schedule,   setSchedule]   = useState<ApiScheduleDay[]>([]);
  const [reference,  setReference]  = useState('');   // instantané chargé, pour savoir si ça a bougé
  const [jourOuvert, setJourOuvert] = useState<number | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [enregistre, setEnregistre] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    if (user.hairdresser_profile?.is_independent === false) { router.replace('/pro'); return; }
    scheduleApi.get()
      .then((sched) => {
        const norm = normalizeSchedule(sched as ApiScheduleDay[]);
        setSchedule(norm);
        setReference(JSON.stringify(norm));
      })
      .catch(() => setError('Impossible de charger les horaires.'))
      .finally(() => setLoading(false));
  }, [authLoading, user, router]);

  const modifie = useMemo(() => reference !== '' && JSON.stringify(schedule) !== reference, [schedule, reference]);

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
    setJourOuvert((prev) => (prev === dayOfWeek ? null : prev));
  }

  function updateField(dayOfWeek: number, field: keyof ApiScheduleDay, value: unknown) {
    setSchedule((prev) =>
      prev.map((d) => (d.day_of_week === dayOfWeek ? { ...d, [field]: value } : d))
    );
  }

  /** Recopie les horaires du jour sur tous les autres jours ouverts. */
  function copierSurOuverts(dayOfWeek: number) {
    setSchedule((prev) => {
      const source = prev.find((d) => d.day_of_week === dayOfWeek);
      if (!source) return prev;
      return prev.map((d) =>
        d.day_of_week !== dayOfWeek && d.is_open
          ? { ...d, start_time: source.start_time, end_time: source.end_time, break_start: source.break_start, break_end: source.break_end }
          : d
      );
    });
    setJourOuvert(null);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const updated = await scheduleApi.update(schedule) as ApiScheduleDay[];
      const norm = normalizeSchedule(updated);
      setSchedule(norm);
      setReference(JSON.stringify(norm));
      setJourOuvert(null);
      setEnregistre(true);
      setTimeout(() => setEnregistre(false), 2500);
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

  const joursOrdonnes = ORDRE_JOURS
    .map((n) => schedule.find((d) => d.day_of_week === n))
    .filter((d): d is ApiScheduleDay => !!d);

  return (
    <div className="min-h-screen bg-white pb-36">
      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-4">
        <DashboardPageHeader title="Mes horaires" />

        {error && (
          <div className="mb-4 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
        )}

        <div className="mt-2 space-y-7">
          <BookingWindowSection />

          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-1">Semaine type</p>
            <p className="text-xs text-neutral-400 mb-3">
              Touchez un jour pour régler ses horaires — les créneaux proposés aux clients en découlent.
            </p>
            <div className="space-y-2">
              {joursOrdonnes.map((day) => (
                <LigneJour
                  key={day.day_of_week}
                  day={day}
                  ouvert={jourOuvert === day.day_of_week}
                  onToggle={() => toggleDay(day.day_of_week)}
                  onOuvrir={() => setJourOuvert((prev) => (prev === day.day_of_week ? null : day.day_of_week))}
                  onChange={(f, v) => updateField(day.day_of_week, f, v)}
                  onCopier={() => copierSurOuverts(day.day_of_week)}
                />
              ))}
            </div>
          </div>

          <UnavailabilitiesSection />
        </div>
      </div>

      {/* Barre d'enregistrement : n'existe que quand quelque chose a changé. */}
      {(modifie || enregistre) && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-safe-5 pt-3 bg-gradient-to-t from-white via-white/95 to-transparent">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={handleSave}
              disabled={saving || enregistre}
              className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white py-3.5 rounded-2xl font-bold text-[15px] shadow-[0_10px_28px_-10px_rgba(10,10,10,0.5)] disabled:opacity-80 hover:bg-neutral-700 transition-colors"
            >
              {enregistre ? (<><Check size={16} /> Horaires enregistrés</>) : saving ? 'Enregistrement…' : 'Enregistrer les horaires'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
