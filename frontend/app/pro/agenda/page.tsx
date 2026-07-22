'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { appointments as apptApi, api, schedule as scheduleApi } from '@/lib/api';
import type { AppointmentStatus } from '@/lib/types';
import { type ApiAppointment, type ApiUnavailability, apptDateStr, resolveMediaUrl } from '@/lib/types';
import {
  CalendarDays, Clock, ChevronLeft, ChevronRight, Settings,
  Bell, ZoomIn, ZoomOut, User, X, Check, Phone, Mail,
  Calendar, AlertTriangle, CheckCircle2, Ban, UserX, Trash2,
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────

const DAY_LABELS  = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
const MONTH_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const MONTH_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

const START_HOUR  = 7;
const END_HOUR    = 21;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const SNAP_MIN    = 15;
const DRAG_THRESH = 6; // px before drag starts

const BLOCK: Record<string, { bg:string; bar:string; text:string; sub:string; label:string }> = {
  pending:   { bg:'bg-amber-50',    bar:'bg-amber-400',    text:'text-amber-900',   sub:'text-amber-700',  label:'En attente' },
  confirmed: { bg:'bg-emerald-50',  bar:'bg-emerald-500',  text:'text-emerald-900', sub:'text-emerald-700',label:'Confirmé'   },
  completed: { bg:'bg-neutral-100', bar:'bg-neutral-400',  text:'text-neutral-600', sub:'text-neutral-500',label:'Terminé'    },
  declined:  { bg:'bg-red-50',      bar:'bg-red-400',      text:'text-red-800',     sub:'text-red-600',    label:'Refusé'     },
  cancelled: { bg:'bg-neutral-50',  bar:'bg-neutral-300',  text:'text-neutral-400', sub:'text-neutral-400',label:'Annulé'     },
  no_show:   { bg:'bg-neutral-50',  bar:'bg-neutral-300',  text:'text-neutral-400', sub:'text-neutral-400',label:'Absent'     },
};

const STATUS_ACTIONS: Partial<Record<AppointmentStatus, {label:string; status:AppointmentStatus; cls:string; Icon: React.FC<{size?:number}>}[]>> = {
  pending: [
    { label:'Confirmer', status:'confirmed', cls:'bg-emerald-500 text-white', Icon:Check },
    { label:'Refuser',   status:'declined',  cls:'bg-red-50 text-red-600 border border-red-200', Icon:X },
  ],
  confirmed: [
    { label:'Terminé',   status:'completed', cls:'bg-neutral-900 text-white', Icon:CheckCircle2 },
    { label:'Absent',    status:'no_show',   cls:'bg-neutral-100 text-neutral-700', Icon:UserX },
    { label:'Annuler',   status:'cancelled', cls:'bg-red-50 text-red-600 border border-red-200', Icon:Ban },
  ],
  completed: [],
  no_show:   [{ label:'Réactiver', status:'confirmed', cls:'bg-emerald-50 text-emerald-700 border border-emerald-200', Icon:Check }],
  cancelled: [{ label:'Réactiver', status:'pending',   cls:'bg-amber-50 text-amber-700 border border-amber-200', Icon:AlertTriangle }],
  declined:  [{ label:'Réactiver', status:'pending',   cls:'bg-amber-50 text-amber-700 border border-amber-200', Icon:AlertTriangle }],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}
function fromMin(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const mn = ((m % 60) + 60) % 60;
  return `${String(h).padStart(2,'0')}:${String(mn).padStart(2,'0')}`;
}
function fmtTime(t?: string|null) { return t ? t.slice(0,5) : '—'; }
function isoDate(d: Date): string { return d.toISOString().slice(0,10); }
function addDays(d: Date, n: number): Date { const r=new Date(d); r.setDate(r.getDate()+n); return r; }
function getWeekStart(d: Date): Date {
  const r=new Date(d); r.setDate(d.getDate()-((d.getDay()+6)%7)); r.setHours(0,0,0,0); return r;
}
function snap(m: number): number { return Math.round(m/SNAP_MIN)*SNAP_MIN; }
function aptsForDate(apts: ApiAppointment[], ds: string) {
  return apts
    .filter(a => apptDateStr(a)===ds && !['declined','cancelled'].includes(a.status))
    .sort((a,b)=>(a.appointment_time??'').localeCompare(b.appointment_time??''));
}
function dayRevenue(apts: ApiAppointment[], ds: string) {
  return apts
    .filter(a=>apptDateStr(a)===ds && ['confirmed','completed'].includes(a.status))
    .reduce((s,a)=>s+(a.price?parseFloat(a.price):0),0);
}
function unavailForDate(items: ApiUnavailability[], ds: string) {
  return items.filter(u => {
    const s = u.start_datetime.slice(0,10);
    const e = u.end_datetime.slice(0,10);
    return ds >= s && ds <= e;
  });
}
// Bornes (en minutes depuis minuit) d'un blocage sur un jour donné — tronqué
// aux bornes de la journée pour les blocages qui s'étalent sur plusieurs jours.
function unavailBoundsForDate(u: ApiUnavailability, ds: string): { startMin: number; endMin: number } {
  const dayStartMs = new Date(ds+'T00:00:00').getTime();
  const dayEndMs   = new Date(ds+'T23:59:59').getTime();
  const sMs = Math.max(new Date(u.start_datetime.replace(' ','T')).getTime(), dayStartMs);
  const eMs = Math.min(new Date(u.end_datetime.replace(' ','T')).getTime(), dayEndMs);
  const startMin = Math.round((sMs-dayStartMs)/60000);
  const endMin   = Math.round((eMs-dayStartMs)/60000);
  return { startMin, endMin };
}

type ViewMode = 'day'|'week'|'month';

// ── AppointmentSheet ──────────────────────────────────────────────────────────

function AppointmentSheet({
  apt, onClose, onStatusChange, onReschedule, saving,
}: {
  apt: ApiAppointment;
  onClose: ()=>void;
  onStatusChange: (id:number, status:AppointmentStatus)=>Promise<void>;
  onReschedule: (id:number, date:string, time:string, dur:number|null)=>Promise<void>;
  saving: boolean;
}) {
  const b = BLOCK[apt.status] ?? BLOCK.confirmed;
  const avatar = resolveMediaUrl(apt.client?.avatar ?? null);
  const actions = STATUS_ACTIONS[apt.status] ?? [];

  const [newDate, setNewDate] = useState(apt.appointment_date ?? '');
  const [newTime, setNewTime] = useState(fmtTime(apt.appointment_time));
  const [newDur,  setNewDur]  = useState(String(apt.duration_minutes ?? 60));
  const [saved,   setSaved]   = useState(false);

  const dateLabel = apt.appointment_date
    ? new Date(apt.appointment_date+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})
    : '—';

  async function handleReschedule() {
    await onReschedule(apt.id, newDate, newTime+':00', parseInt(newDur)||null);
    setSaved(true);
    setTimeout(()=>setSaved(false),2000);
  }

  const hasChanges =
    newDate !== (apt.appointment_date??'') ||
    newTime !== fmtTime(apt.appointment_time) ||
    newDur  !== String(apt.duration_minutes??60);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-neutral-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-4 border-b border-neutral-100 flex items-center gap-4">
          <div className="relative flex-shrink-0">
            {avatar ? (
              <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-neutral-100">
                <Image src={avatar} alt={apt.client_name} fill className="object-cover" sizes="56px" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center">
                <User size={24} className="text-neutral-400" />
              </div>
            )}
            <span className={`absolute -bottom-1.5 -right-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full border-2 border-white ${b.bar.replace('bg-','bg-').replace('bg-','text-white bg-')}`}>
              {b.label}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-bold text-neutral-900 truncate">{apt.client_name}</h2>
            <p className="text-[13px] text-neutral-500 truncate">{apt.service}</p>
            {apt.price && (
              <p className="text-[13px] font-semibold text-neutral-700 mt-0.5">
                {parseFloat(apt.price)}€
                {apt.duration_minutes ? ` · ${apt.duration_minutes} min` : ''}
              </p>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 flex-shrink-0">
            <X size={15} />
          </button>
        </div>

        {/* Contact */}
        {(apt.client_phone || apt.client_email) && (
          <div className="px-5 py-3 flex gap-3 border-b border-neutral-50">
            {apt.client_phone && (
              <a href={`tel:${apt.client_phone}`} className="flex items-center gap-1.5 text-[12px] text-neutral-500 hover:text-neutral-900">
                <Phone size={13} />{apt.client_phone}
              </a>
            )}
            {apt.client_email && (
              <a href={`mailto:${apt.client_email}`} className="flex items-center gap-1.5 text-[12px] text-neutral-500 hover:text-neutral-900 min-w-0 truncate">
                <Mail size={13} className="flex-shrink-0" /><span className="truncate">{apt.client_email}</span>
              </a>
            )}
          </div>
        )}

        {/* Reschedule */}
        <div className="px-5 py-4 border-b border-neutral-100">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400 mb-3">Planification</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-neutral-400 font-medium block mb-1">Date</label>
              <input
                type="date"
                value={newDate}
                onChange={e=>setNewDate(e.target.value)}
                className="w-full text-[12px] font-medium text-neutral-900 bg-neutral-50 rounded-xl px-3 py-2.5 border border-neutral-100 focus:outline-none focus:border-neutral-300 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 font-medium block mb-1">Heure</label>
              <input
                type="time"
                value={newTime}
                onChange={e=>setNewTime(e.target.value)}
                className="w-full text-[12px] font-medium text-neutral-900 bg-neutral-50 rounded-xl px-3 py-2.5 border border-neutral-100 focus:outline-none focus:border-neutral-300 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 font-medium block mb-1">Durée (min)</label>
              <input
                type="number"
                value={newDur}
                onChange={e=>setNewDur(e.target.value)}
                min={15}
                step={15}
                className="w-full text-[12px] font-medium text-neutral-900 bg-neutral-50 rounded-xl px-3 py-2.5 border border-neutral-100 focus:outline-none focus:border-neutral-300 transition-colors"
              />
            </div>
          </div>

          {hasChanges && (
            <button
              onClick={handleReschedule}
              disabled={saving}
              className="mt-3 w-full py-3 bg-neutral-900 text-white text-[13px] font-semibold rounded-2xl hover:bg-neutral-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : saved ? (
                <><Check size={14} /> Enregistré</>
              ) : (
                <><Calendar size={14} /> Enregistrer le changement</>
              )}
            </button>
          )}

          {/* Notification note */}
          <p className="mt-2.5 text-[11px] text-neutral-400 flex items-center gap-1.5">
            <Bell size={11} className="text-violet-400 flex-shrink-0" />
            Le client sera notifié automatiquement de tout changement.
          </p>
        </div>

        {/* Status actions */}
        {actions.length > 0 && (
          <div className="px-5 py-4 pb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400 mb-3">Actions</p>
            <div className="flex flex-col gap-2">
              {actions.map((act) => (
                <button
                  key={act.status}
                  onClick={async ()=>{ await onStatusChange(apt.id, act.status); onClose(); }}
                  disabled={saving}
                  className={`flex items-center gap-2.5 px-4 py-3.5 rounded-2xl text-[13px] font-semibold transition-colors disabled:opacity-50 ${act.cls}`}
                >
                  <act.Icon size={15} />
                  {act.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state for completed */}
        {actions.length === 0 && apt.status === 'completed' && (
          <div className="px-5 py-6 pb-8 text-center">
            <CheckCircle2 size={28} className="text-neutral-200 mx-auto mb-2" />
            <p className="text-[13px] text-neutral-400">Ce rendez-vous est terminé.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── AppointmentBlock (visual only — drag handled by DayView) ─────────────────

interface BlockProps {
  apt: ApiAppointment;
  hourHeight: number;
  topPx: number;
  heightPx: number;
  isDragging: boolean;
  isResizing: boolean;
  isGhost: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onResizePointerDown: (e: React.PointerEvent) => void;
  weekMode?: boolean;
}

function AppointmentBlock({
  apt, hourHeight, topPx, heightPx,
  isDragging, isResizing, isGhost,
  onPointerDown, onResizePointerDown, weekMode,
}: BlockProps) {
  const b = BLOCK[apt.status] ?? BLOCK.confirmed;
  const avatar  = resolveMediaUrl(apt.client?.avatar ?? null);
  const compact = heightPx < 52;

  return (
    <div
      className={`absolute left-0.5 right-1 rounded-xl overflow-hidden select-none ${b.bg} border-l-2 ${b.bar.replace('bg-','border-')} ${
        isGhost ? 'opacity-30' : ''
      } ${
        isDragging
          ? 'shadow-2xl scale-[1.015] z-50 ring-1 ring-black/10'
          : isResizing
          ? 'z-50'
          : 'z-10 hover:shadow-md cursor-pointer'
      }`}
      style={{
        top: topPx,
        height: Math.max(heightPx, 26),
        transition: (isDragging || isResizing) ? 'none' : 'box-shadow 0.15s',
      }}
      onPointerDown={onPointerDown}
    >
      <div className="px-2 py-1.5 h-full flex flex-col">
        {compact ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`text-[11px] font-bold truncate ${b.text}`}>{apt.client_name}</span>
            <span className={`text-[10px] flex-shrink-0 ${b.sub}`}>{fmtTime(apt.appointment_time)}</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5 mb-0.5">
              {avatar ? (
                <div className="relative w-[18px] h-[18px] rounded-full overflow-hidden flex-shrink-0">
                  <Image src={avatar} alt={apt.client_name} fill className="object-cover" sizes="18px" />
                </div>
              ) : (
                <User size={12} className={`${b.sub} flex-shrink-0`} />
              )}
              <span className={`text-[12px] font-bold truncate ${b.text}`}>{apt.client_name}</span>
            </div>
            <span className={`text-[11px] truncate leading-tight ${b.sub}`}>{apt.service}</span>
            {!weekMode && heightPx > 76 && (
              <div className="flex items-center gap-2 mt-auto pt-1 flex-wrap">
                {apt.duration_minutes && (
                  <span className={`text-[10px] ${b.sub}`}>{apt.duration_minutes} min</span>
                )}
                {apt.price && (
                  <span className={`text-[10px] font-bold ${b.text}`}>{parseFloat(apt.price)}€</span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Resize handle */}
      <div
        className="absolute bottom-0 left-0 right-0 h-4 cursor-ns-resize flex items-end justify-center pb-0.5"
        onPointerDown={onResizePointerDown}
      >
        <div className={`w-6 h-0.5 rounded-full opacity-40 ${b.bar}`} />
      </div>
    </div>
  );
}

// ── UnavailabilityBlock (visuel, non draggable) ───────────────────────────────

function UnavailabilityBlock({
  unavail, hourHeight, topPx, heightPx, onClick, compact,
}: {
  unavail: ApiUnavailability; hourHeight: number; topPx: number; heightPx: number;
  onClick: () => void; compact?: boolean;
}) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="absolute left-0.5 right-1 rounded-xl overflow-hidden select-none cursor-pointer z-10 border-l-2 border-neutral-300 bg-neutral-100/80 hover:bg-neutral-150 transition-colors"
      style={{
        top: topPx,
        height: Math.max(heightPx, 22),
        backgroundImage: 'repeating-linear-gradient(135deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 6px, transparent 6px, transparent 12px)',
      }}
    >
      <div className="px-2 py-1.5 h-full flex items-center gap-1.5 min-w-0">
        <Ban size={compact?10:12} className="text-neutral-400 flex-shrink-0" />
        <span className="text-[11px] font-semibold text-neutral-500 truncate">
          {unavail.reason || 'Bloqué'}
        </span>
      </div>
    </div>
  );
}

// ── BlockCreateSheet — création d'un blocage depuis l'agenda ──────────────────

function BlockCreateSheet({
  date, time, presetReason, onClose, onCreated,
}: {
  date: string; time: string; presetReason?: string;
  onClose: () => void; onCreated: () => void;
}) {
  const [startTime, setStartTime] = useState(time);
  const [endTime,   setEndTime]   = useState(() => fromMin(toMin(time) + (presetReason ? 30 : 120)));
  const [reason,    setReason]    = useState(presetReason ?? '');
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  async function handleCreate() {
    setError('');
    const start = `${date}T${startTime}:00`;
    const end   = `${date}T${endTime}:00`;
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
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl p-5" onClick={e=>e.stopPropagation()}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400 mb-0.5">
          {new Date(date+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}
        </p>
        <p className="text-[18px] font-bold text-neutral-900 mb-4">
          {presetReason ? 'Marquer une pause' : 'Bloquer un créneau'}
        </p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[10px] text-neutral-400 font-medium block mb-1">Début</label>
            <input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)}
              className="w-full text-[13px] font-medium text-neutral-900 bg-neutral-50 rounded-xl px-3 py-2.5 border border-neutral-100 focus:outline-none focus:border-neutral-300" />
          </div>
          <div>
            <label className="text-[10px] text-neutral-400 font-medium block mb-1">Fin</label>
            <input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)}
              className="w-full text-[13px] font-medium text-neutral-900 bg-neutral-50 rounded-xl px-3 py-2.5 border border-neutral-100 focus:outline-none focus:border-neutral-300" />
          </div>
        </div>
        <input
          type="text" value={reason} onChange={e=>setReason(e.target.value)}
          placeholder="Motif (optionnel)"
          className="w-full text-[13px] text-neutral-900 bg-neutral-50 rounded-xl px-3 py-2.5 border border-neutral-100 focus:outline-none focus:border-neutral-300 placeholder:text-neutral-300 mb-3"
        />
        {error && <p className="text-[12px] text-red-600 mb-2">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl text-[13px] font-semibold text-neutral-400 bg-neutral-50 hover:bg-neutral-100 transition-colors">
            Annuler
          </button>
          <button onClick={handleCreate} disabled={saving} className="flex-1 py-3 rounded-2xl text-[13px] font-semibold text-white bg-neutral-900 hover:bg-neutral-700 transition-colors disabled:opacity-50">
            {saving ? 'Création…' : (presetReason ? 'Marquer la pause' : 'Bloquer')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── UnavailabilityConfirmSheet — suppression d'un blocage existant ────────────

function UnavailabilityConfirmSheet({
  unavail, onClose, onDeleted,
}: { unavail: ApiUnavailability; onClose: () => void; onDeleted: (id: number) => void }) {
  const [deleting, setDeleting] = useState(false);
  const s = new Date(unavail.start_datetime.replace(' ','T'));
  const e = new Date(unavail.end_datetime.replace(' ','T'));

  async function handleDelete() {
    setDeleting(true);
    try {
      await scheduleApi.unavailabilities.delete(unavail.id);
      onDeleted(unavail.id);
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl p-5" onClick={e2=>e2.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
            <Ban size={18} className="text-neutral-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-neutral-900">{unavail.reason || 'Créneau bloqué'}</p>
            <p className="text-[12px] text-neutral-400">
              {s.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})} · {s.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})} – {e.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl text-[13px] font-semibold text-neutral-400 bg-neutral-50 hover:bg-neutral-100 transition-colors">
            Fermer
          </button>
          <button onClick={handleDelete} disabled={deleting} className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-[13px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50">
            <Trash2 size={13} /> {deleting ? 'Suppression…' : 'Débloquer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DayView ──────────────────────────────────────────────────────────────────

interface DayViewProps {
  date: Date;
  appointments: ApiAppointment[];
  unavailabilities: ApiUnavailability[];
  hourHeight: number;
  loading: boolean;
  onMove: (id:number, date:string, time:string, dur?:number) => void;
  onSelectApt: (apt:ApiAppointment) => void;
  onSelectUnavailability: (u:ApiUnavailability) => void;
  onQuickCreate: (time:string, date:string) => void;
}

function DayView({ date, appointments, unavailabilities, hourHeight, loading, onMove, onSelectApt, onSelectUnavailability, onQuickCreate }: DayViewProps) {
  const dateStr      = isoDate(date);
  const dayApts      = aptsForDate(appointments, dateStr);
  const dayUnavail   = unavailForDate(unavailabilities, dateStr);
  const scrollRef    = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isToday      = dateStr === isoDate(new Date());
  const now          = new Date();
  const nowMin       = now.getHours()*60 + now.getMinutes();

  // Drag state
  const pointerInfo  = useRef<{ aptId:number; startY:number; startMin:number; ts:number } | null>(null);
  const [dragAptId,   setDragAptId]   = useState<number|null>(null);
  const [dragPreview, setDragPreview] = useState<number|null>(null);

  // Resize state
  const resizeInfo = useRef<{ aptId:number; startY:number; origDur:number } | null>(null);
  const [resizeAptId, setResizeAptId] = useState<number|null>(null);
  const [resizeDur,   setResizeDur]   = useState<number|null>(null);

  // Long press (quick create)
  const longTimer  = useRef<ReturnType<typeof setTimeout>|null>(null);
  const longActive = useRef(false);

  // Auto-scroll to current time
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = Math.max(0, ((nowMin - START_HOUR*60)/60)*hourHeight - 120);
    el.scrollTop = target;
  }, [dateStr]); // only on date change

  const getMinFromY = (clientY: number): number => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return START_HOUR*60;
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    const relY = clientY - rect.top + scrollTop;
    const raw  = START_HOUR*60 + (relY/hourHeight)*60;
    return Math.max(START_HOUR*60, Math.min((END_HOUR-1)*60, snap(raw)));
  };

  const onContainerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only fires on empty area (blocks call e.stopPropagation on pointer down)
    if (longActive.current) return;
    const min = getMinFromY(e.clientY);
    longTimer.current = setTimeout(() => {
      longActive.current = true;
      onQuickCreate(fromMin(min), dateStr);
    }, 500);
  };

  const onBlockPointerDown = (e: React.PointerEvent, apt: ApiAppointment) => {
    e.stopPropagation();
    if (longTimer.current) clearTimeout(longTimer.current);
    const startMin = apt.appointment_time ? toMin(apt.appointment_time) : START_HOUR*60;
    pointerInfo.current = { aptId:apt.id, startY:e.clientY, startMin, ts:Date.now() };
  };

  const onResizePointerDown = (e: React.PointerEvent, apt: ApiAppointment) => {
    e.stopPropagation();
    if (longTimer.current) clearTimeout(longTimer.current);
    resizeInfo.current = { aptId:apt.id, startY:e.clientY, origDur: apt.duration_minutes??60 };
    setResizeAptId(apt.id);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    // Drag
    if (pointerInfo.current) {
      const dy = e.clientY - pointerInfo.current.startY;
      if (Math.abs(dy) > DRAG_THRESH) {
        setDragAptId(pointerInfo.current.aptId);
        setDragPreview(getMinFromY(e.clientY));
      }
    }
    // Resize
    if (resizeInfo.current) {
      const dy = e.clientY - resizeInfo.current.startY;
      const delta = snap((dy/hourHeight)*60);
      const newDur = Math.max(SNAP_MIN, resizeInfo.current.origDur + delta);
      setResizeDur(newDur);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (longTimer.current) { clearTimeout(longTimer.current); longTimer.current=null; }
    setTimeout(()=>{ longActive.current=false; }, 50);

    const info = pointerInfo.current;
    pointerInfo.current = null;

    if (info) {
      const dy = e.clientY - info.startY;
      const elapsed = Date.now() - info.ts;
      if (Math.abs(dy) <= DRAG_THRESH && elapsed < 400) {
        // Click → open sheet
        const apt = appointments.find(a=>a.id===info.aptId);
        if (apt) onSelectApt(apt);
      } else if (dragPreview !== null) {
        onMove(info.aptId, dateStr, fromMin(dragPreview));
      }
      setDragAptId(null);
      setDragPreview(null);
    }

    const ri = resizeInfo.current;
    if (ri && resizeDur !== null) {
      const apt = appointments.find(a=>a.id===ri.aptId);
      if (apt && resizeDur !== (apt.duration_minutes??60)) {
        onMove(ri.aptId, dateStr, fmtTime(apt.appointment_time), resizeDur);
      }
      resizeInfo.current = null;
      setResizeAptId(null);
      setResizeDur(null);
    }
  };

  const hours = Array.from({length:TOTAL_HOURS+1}, (_,i)=>START_HOUR+i);
  const totalHeight = TOTAL_HOURS * hourHeight;
  const nowTop = isToday ? ((nowMin-START_HOUR*60)/60)*hourHeight : null;

  if (loading) {
    return (
      <div className="flex-1 overflow-hidden px-4 pt-4 space-y-3">
        {[1,2,3].map(i=><div key={i} className="h-20 bg-neutral-100 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto touch-pan-y" style={{height:'calc(100vh - 160px)'}}>
      <div
        className="flex"
        style={{minHeight:totalHeight+40}}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerDown={onContainerPointerDown}
        onPointerLeave={onPointerUp}
      >
        {/* Hour labels */}
        <div className="flex-shrink-0 w-12 relative select-none pointer-events-none" style={{height:totalHeight}}>
          {hours.map(h=>(
            <div key={h} className="absolute right-2 text-[10px] text-neutral-300 font-medium -translate-y-2" style={{top:(h-START_HOUR)*hourHeight}}>
              {String(h).padStart(2,'0')}h
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div ref={containerRef} className="flex-1 relative mr-2" style={{height:totalHeight}}>
          {/* Hour lines */}
          {hours.map(h=>(
            <div key={h} className="absolute left-0 right-0 border-t border-neutral-100" style={{top:(h-START_HOUR)*hourHeight}} />
          ))}
          {/* Half-hour lines */}
          {Array.from({length:TOTAL_HOURS},(_,i)=>(
            <div key={i} className="absolute left-0 right-0 border-t border-neutral-50" style={{top:(i+0.5)*hourHeight}} />
          ))}

          {/* Current time */}
          {nowTop!==null && (
            <div className="absolute left-0 right-0 z-20 flex items-center pointer-events-none" style={{top:nowTop}}>
              <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <div className="flex-1 h-px bg-red-400" />
            </div>
          )}

          {/* Drag preview ghost */}
          {dragAptId!==null && dragPreview!==null && (() => {
            const apt = appointments.find(a=>a.id===dragAptId);
            if (!apt) return null;
            const dur = apt.duration_minutes??60;
            const topPx = ((dragPreview-START_HOUR*60)/60)*hourHeight;
            const heightPx = (dur/60)*hourHeight;
            const b = BLOCK[apt.status]??BLOCK.confirmed;
            return (
              <div
                className={`absolute left-0.5 right-1 rounded-xl border-l-2 ${b.bg} ${b.bar.replace('bg-','border-')} shadow-2xl ring-1 ring-black/10 pointer-events-none z-50`}
                style={{top:topPx, height:Math.max(heightPx,26), opacity:0.9}}
              >
                <div className="px-2 py-1.5">
                  <span className={`text-[12px] font-bold ${b.text}`}>{apt.client_name}</span>
                  <span className={`block text-[11px] ${b.sub}`}>{fromMin(dragPreview)} · {dur} min</span>
                </div>
              </div>
            );
          })()}

          {/* Appointment blocks */}
          {dayApts.map(apt => {
            const startMin = apt.appointment_time ? toMin(apt.appointment_time) : START_HOUR*60;
            const dur      = (resizeAptId===apt.id && resizeDur!==null) ? resizeDur : (apt.duration_minutes??60);
            const topPx    = ((startMin-START_HOUR*60)/60)*hourHeight;
            const heightPx = (dur/60)*hourHeight;
            return (
              <AppointmentBlock
                key={apt.id}
                apt={apt}
                hourHeight={hourHeight}
                topPx={topPx}
                heightPx={heightPx}
                isDragging={dragAptId===apt.id}
                isResizing={resizeAptId===apt.id}
                isGhost={dragAptId===apt.id && dragPreview!==null}
                onPointerDown={e=>onBlockPointerDown(e,apt)}
                onResizePointerDown={e=>onResizePointerDown(e,apt)}
              />
            );
          })}

          {/* Blocages / indisponibilités */}
          {dayUnavail.map(u => {
            const { startMin, endMin } = unavailBoundsForDate(u, dateStr);
            const topPx    = ((startMin-START_HOUR*60)/60)*hourHeight;
            const heightPx = ((endMin-startMin)/60)*hourHeight;
            return (
              <UnavailabilityBlock
                key={u.id}
                unavail={u}
                hourHeight={hourHeight}
                topPx={topPx}
                heightPx={heightPx}
                onClick={()=>onSelectUnavailability(u)}
              />
            );
          })}

          {dayApts.length===0 && dayUnavail.length===0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <CalendarDays size={32} className="text-neutral-100 mb-2" />
              <p className="text-[13px] text-neutral-300 font-medium">Aucun rendez-vous</p>
              <p className="text-[11px] text-neutral-200 mt-1">Maintenez appuyé pour créer un créneau</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── WeekView ─────────────────────────────────────────────────────────────────

function WeekView({
  weekStart, appointments, unavailabilities, hourHeight, loading, onMove, onDayClick, onSelectApt, onSelectUnavailability,
}: {
  weekStart:Date; appointments:ApiAppointment[]; unavailabilities:ApiUnavailability[]; hourHeight:number; loading:boolean;
  onMove:(id:number,date:string,time:string,dur?:number)=>void;
  onDayClick:(d:Date)=>void;
  onSelectApt:(apt:ApiAppointment)=>void;
  onSelectUnavailability:(u:ApiUnavailability)=>void;
}) {
  const days     = Array.from({length:7},(_,i)=>addDays(weekStart,i));
  const todayStr = isoDate(new Date());
  const hours    = Array.from({length:TOTAL_HOURS+1},(_,i)=>START_HOUR+i);
  const totalH   = TOTAL_HOURS*hourHeight;

  return (
    <div className="flex-1 overflow-auto" style={{height:'calc(100vh - 160px)'}}>
      {/* Day headers */}
      <div className="sticky top-0 z-20 bg-white border-b border-neutral-100 flex">
        <div className="w-10 flex-shrink-0" />
        {days.map((d,i)=>{
          const ds = isoDate(d);
          const isToday = ds===todayStr;
          const count = aptsForDate(appointments,ds).length;
          return (
            <button key={i} onClick={()=>onDayClick(d)}
              className="flex-1 py-2 flex flex-col items-center gap-0.5 hover:bg-neutral-50 transition-colors">
              <span className={`text-[9px] font-bold uppercase ${isToday?'text-violet-600':'text-neutral-400'}`}>{DAY_LABELS[d.getDay()]}</span>
              <span className={`text-[13px] font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday?'bg-neutral-900 text-white':'text-neutral-700'}`}>{d.getDate()}</span>
              {count>0&&<span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isToday?'bg-violet-100 text-violet-700':'bg-neutral-100 text-neutral-500'}`}>{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="flex">
        {/* Hour labels */}
        <div className="w-10 flex-shrink-0 relative select-none" style={{height:totalH}}>
          {hours.map(h=>(
            <div key={h} className="absolute right-1 text-[9px] text-neutral-300 font-medium -translate-y-2" style={{top:(h-START_HOUR)*hourHeight}}>
              {String(h).padStart(2,'0')}h
            </div>
          ))}
        </div>
        {/* Columns */}
        {days.map((d,ci)=>{
          const ds = isoDate(d);
          const isToday=ds===todayStr;
          const now=new Date();
          const nowTop=isToday?((now.getHours()*60+now.getMinutes()-START_HOUR*60)/60)*hourHeight:null;
          const dayApts=aptsForDate(appointments,ds);
          const dayUnavail=unavailForDate(unavailabilities,ds);
          return (
            <div key={ci} className="flex-1 relative border-l border-neutral-100 min-w-0" style={{height:totalH}}>
              {hours.map(h=><div key={h} className="absolute left-0 right-0 border-t border-neutral-100" style={{top:(h-START_HOUR)*hourHeight}} />)}
              {nowTop!==null&&<div className="absolute left-0 right-0 z-10 flex items-center pointer-events-none" style={{top:nowTop}}><div className="w-1.5 h-1.5 rounded-full bg-red-500 -ml-0.5 flex-shrink-0"/><div className="flex-1 h-px bg-red-400"/></div>}
              {dayUnavail.map(u=>{
                const { startMin, endMin } = unavailBoundsForDate(u, ds);
                const topPx=((startMin-START_HOUR*60)/60)*hourHeight;
                const heightPx=((endMin-startMin)/60)*hourHeight;
                return (
                  <UnavailabilityBlock
                    key={u.id} unavail={u} hourHeight={hourHeight}
                    topPx={topPx} heightPx={heightPx} compact
                    onClick={()=>onSelectUnavailability(u)}
                  />
                );
              })}
              {dayApts.map(apt=>{
                const startMin=apt.appointment_time?toMin(apt.appointment_time):START_HOUR*60;
                const dur=apt.duration_minutes??60;
                const topPx=((startMin-START_HOUR*60)/60)*hourHeight;
                const heightPx=(dur/60)*hourHeight;
                return (
                  <AppointmentBlock
                    key={apt.id} apt={apt} hourHeight={hourHeight}
                    topPx={topPx} heightPx={heightPx}
                    isDragging={false} isResizing={false} isGhost={false}
                    weekMode
                    onPointerDown={e=>{e.stopPropagation(); onSelectApt(apt);}}
                    onResizePointerDown={e=>e.stopPropagation()}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MonthView ─────────────────────────────────────────────────────────────────

function MonthView({year,month,appointments,today,onDayClick}:{
  year:number; month:number; appointments:ApiAppointment[]; today:string; onDayClick:(d:Date)=>void;
}) {
  const firstDay=new Date(year,month,1);
  const totalDays=new Date(year,month+1,0).getDate();
  const startOffset=(firstDay.getDay()+6)%7;
  const cells:Array<Date|null>=Array.from({length:startOffset+totalDays},(_,i)=>i<startOffset?null:new Date(year,month,i-startOffset+1));
  while(cells.length%7!==0) cells.push(null);

  return (
    <div className="px-3 pt-2">
      <div className="grid grid-cols-7 mb-1">
        {['L','M','M','J','V','S','D'].map((d,i)=><div key={i} className="text-center text-[10px] font-semibold text-neutral-400 py-1.5">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {cells.map((d,i)=>{
          if(!d) return <div key={i}/>;
          const ds=isoDate(d);
          const isToday=ds===today;
          const dayApts=aptsForDate(appointments,ds);
          const rev=dayRevenue(appointments,ds);
          return (
            <button key={i} onClick={()=>onDayClick(d)}
              className={`flex flex-col items-center py-2 rounded-xl transition-all hover:bg-neutral-50 min-h-[66px] ${isToday?'bg-neutral-50':''}`}>
              <span className={`text-[13px] font-bold w-7 h-7 flex items-center justify-center rounded-full mb-1 ${isToday?'bg-neutral-900 text-white':'text-neutral-700'}`}>{d.getDate()}</span>
              {dayApts.length>0&&<>
                <span className="text-[9px] font-bold text-neutral-500">{dayApts.length} RDV</span>
                {rev>0&&<span className="text-[9px] text-emerald-600 font-semibold">{rev}€</span>}
                <div className="flex gap-0.5 mt-0.5">
                  {dayApts.slice(0,4).map((a,j)=><div key={j} className={`w-1 h-1 rounded-full ${(BLOCK[a.status]??BLOCK.confirmed).bar}`}/>)}
                </div>
              </>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── PendingBanner ─────────────────────────────────────────────────────────────

function PendingBanner({pending,updating,collapsed,onToggle,onConfirm,onDecline,onOpen}:{
  pending:ApiAppointment[]; updating:number|null; collapsed:boolean;
  onToggle:()=>void; onConfirm:(id:number)=>void; onDecline:(id:number)=>void;
  onOpen:(apt:ApiAppointment)=>void;
}) {
  return (
    <div className="mx-3 mt-2 bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center gap-3 text-left">
        <div className="w-7 h-7 bg-amber-400 rounded-xl flex items-center justify-center flex-shrink-0">
          <Bell size={13} className="text-white"/>
        </div>
        <p className="flex-1 text-[12px] font-bold text-amber-900">
          {pending.length} demande{pending.length>1?'s':''} en attente
        </p>
        <ChevronRight size={14} className={`text-amber-400 transition-transform ${collapsed?'':'rotate-90'}`}/>
      </button>
      {!collapsed&&(
        <div className="divide-y divide-amber-100">
          {pending.map(apt=>{
            const dl=apt.appointment_date?new Date(apt.appointment_date+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'}):'—';
            return (
              <div key={apt.id} className="px-4 py-3">
                <button onClick={()=>onOpen(apt)} className="w-full text-left mb-2.5">
                  <p className="text-[13px] font-bold text-neutral-900">{apt.client_name}</p>
                  <p className="text-[11px] text-neutral-500">{apt.service}</p>
                  <p className="text-[11px] text-neutral-400">{dl}{apt.appointment_time?` · ${fmtTime(apt.appointment_time)}`:''}{apt.duration_minutes?` · ${apt.duration_minutes} min`:''}{apt.price?` · ${parseFloat(apt.price)}€`:''}</p>
                </button>
                <div className="flex gap-2">
                  <button onClick={()=>onConfirm(apt.id)} disabled={updating===apt.id} className="flex-1 flex items-center justify-center gap-1.5 bg-neutral-900 text-white text-[11px] font-bold py-2.5 rounded-xl disabled:opacity-50"><Check size={11}/>Confirmer</button>
                  <button onClick={()=>onDecline(apt.id)} disabled={updating===apt.id} className="flex-1 flex items-center justify-center gap-1.5 border border-amber-200 bg-white text-neutral-600 text-[11px] font-semibold py-2.5 rounded-xl hover:border-red-300 hover:text-red-500 disabled:opacity-50"><X size={11}/>Refuser</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── QuickCreatePopup ──────────────────────────────────────────────────────────

function QuickCreatePopup({date,time,onClose,onBlock,onPause}:{
  date:string; time:string; onClose:()=>void;
  onBlock:()=>void; onPause:()=>void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"/>
      <div className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="px-5 pt-5 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400 mb-0.5">
            {new Date(date+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}
          </p>
          <p className="text-[22px] font-bold text-neutral-900">{fmtTime(time)}</p>
        </div>
        <div className="px-3 pb-4 space-y-1.5">
          <Link href={`/pro/reservations/nouveau?date=${date}&time=${time}`}
            className="flex items-center justify-between px-4 py-3.5 rounded-2xl text-[14px] font-semibold transition-colors bg-neutral-900 text-white hover:bg-neutral-700">
            Nouveau rendez-vous<ChevronRight size={16} className="opacity-40"/>
          </Link>
          <button onClick={onBlock}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-[14px] font-semibold transition-colors bg-neutral-50 text-neutral-700 hover:bg-neutral-100">
            Bloquer un créneau<ChevronRight size={16} className="opacity-40"/>
          </button>
          <button onClick={onPause}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-[14px] font-semibold transition-colors bg-neutral-50 text-neutral-700 hover:bg-neutral-100">
            Marquer une pause<ChevronRight size={16} className="opacity-40"/>
          </button>
          <button onClick={onClose} className="w-full py-3 text-[13px] font-semibold text-neutral-400">Annuler</button>
        </div>
      </div>
    </div>
  );
}

// ── Header helpers ─────────────────────────────────────────────────────────────

function formatDayHeader(d:Date):string {
  if(isoDate(d)===isoDate(new Date())) return "Aujourd'hui";
  return d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
}
function formatWeekHeader(ws:Date):string {
  const we=addDays(ws,6);
  if(ws.getMonth()===we.getMonth()) return `${ws.getDate()} – ${we.getDate()} ${MONTH_SHORT[ws.getMonth()]}`;
  return `${ws.getDate()} ${MONTH_SHORT[ws.getMonth()]} – ${we.getDate()} ${MONTH_SHORT[we.getMonth()]}`;
}

// ── AgendaPage ─────────────────────────────────────────────────────────────────

export default function AgendaPage() {
  const {user,isLoading:authLoading} = useRequireAuth(['hairdresser']);
  const [appointments, setAppointments] = useState<ApiAppointment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [view,     setView]     = useState<ViewMode>('day');
  const [current,  setCurrent]  = useState(()=>new Date());
  const [hourH,    setHourH]    = useState(72);
  const [updating, setUpdating] = useState<number|null>(null);
  const [pendingCollapsed, setPendingCollapsed] = useState(false);
  const [selectedApt, setSelectedApt] = useState<ApiAppointment|null>(null);
  const [saving,   setSaving]   = useState(false);
  const [quickCreate, setQuickCreate] = useState<{time:string;date:string}|null>(null);
  const [aiHint,   setAiHint]   = useState<string|null>(null);
  const [unavailabilities, setUnavailabilities] = useState<ApiUnavailability[]>([]);
  const [blockCreate, setBlockCreate] = useState<{date:string;time:string;presetReason?:string}|null>(null);
  const [selectedUnavail, setSelectedUnavail] = useState<ApiUnavailability|null>(null);

  const isIndependent = user?.hairdresser_profile?.is_independent !== false;
  const weekStart = getWeekStart(current);

  function loadUnavailabilities() {
    scheduleApi.unavailabilities.list()
      .then(data=>setUnavailabilities(data as ApiUnavailability[]))
      .catch(()=>{});
  }

  useEffect(()=>{
    if(!user) return;
    apptApi.list()
      .then(data=>setAppointments(data as ApiAppointment[]))
      .catch(()=>{})
      .finally(()=>setLoading(false));
    loadUnavailabilities();
  },[user]);

  // Keep selectedApt in sync with appointments array
  useEffect(()=>{
    if(!selectedApt) return;
    const updated = appointments.find(a=>a.id===selectedApt.id);
    if(updated) setSelectedApt(updated);
  },[appointments]);

  async function updateStatus(id:number, status:AppointmentStatus) {
    setUpdating(id); setSaving(true);
    try {
      await apptApi.updateStatus(id,status);
      setAppointments(prev=>prev.map(a=>a.id===id?{...a,status}:a));
    } catch {}
    setUpdating(null); setSaving(false);
  }

  async function reschedule(id:number, date:string, time:string, dur:number|null) {
    setSaving(true);
    // Optimistic update
    setAppointments(prev=>prev.map(a=>a.id===id?{
      ...a,
      appointment_date:date,
      appointment_time:time,
      ...(dur!=null?{duration_minutes:dur}:{}),
    }:a));
    // AI hint
    const movedStart = toMin(time);
    const movedEnd   = movedStart+(dur??appointments.find(a=>a.id===id)?.duration_minutes??60);
    const next = appointments.find(a=>
      a.id!==id && apptDateStr(a)===date &&
      ['confirmed','pending'].includes(a.status) &&
      a.appointment_time &&
      toMin(a.appointment_time)>=movedEnd &&
      toMin(a.appointment_time)<movedEnd+90
    );
    if(next){ setAiHint(`Décaler aussi "${next.client_name}" à ${fromMin(movedEnd)} ?`); setTimeout(()=>setAiHint(null),6000); }
    // API
    try {
      await api.put(`/appointments/${id}/reschedule`,{appointment_date:date,appointment_time:time,...(dur!=null?{duration_minutes:dur}:{})});
    } catch {}
    setSaving(false);
  }

  function moveAppointment(id:number,date:string,time:string,dur?:number) {
    reschedule(id,date,time,dur??null);
  }

  function navigate(dir:-1|1) {
    setCurrent(d=>{
      const n=new Date(d);
      if(view==='day')   n.setDate(d.getDate()+dir);
      if(view==='week')  n.setDate(d.getDate()+dir*7);
      if(view==='month') n.setMonth(d.getMonth()+dir);
      return n;
    });
  }

  if(authLoading||!user) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin"/>
    </div>
  );

  if(!isIndependent) return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-16 text-center">
        <CalendarDays size={40} className="text-neutral-200 mx-auto mb-4"/>
        <p className="text-neutral-400 text-sm">L&apos;agenda est disponible pour les coiffeurs indépendants.</p>
      </div>
    </div>
  );

  const pending = appointments.filter(a=>a.status==='pending');

  return (
    <div className="min-h-screen bg-white flex flex-col pb-20">

      {/* Header */}
      <div className="sticky top-content-mobile-pro md:top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-100">
        <div className="flex items-center gap-1 px-3 h-12">
          <button onClick={()=>navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors">
            <ChevronLeft size={17}/>
          </button>
          <span className="flex-1 text-center text-[14px] font-bold text-neutral-900 truncate">
            {view==='day'   && formatDayHeader(current)}
            {view==='week'  && formatWeekHeader(weekStart)}
            {view==='month' && `${MONTH_NAMES[current.getMonth()]} ${current.getFullYear()}`}
          </span>
          <button onClick={()=>navigate(1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors">
            <ChevronRight size={17}/>
          </button>
          {view==='day'&&<>
            <button onClick={()=>setHourH(h=>Math.max(48,h-16))} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-neutral-100"><ZoomOut size={13} className="text-neutral-400"/></button>
            <button onClick={()=>setHourH(h=>Math.min(120,h+16))} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-neutral-100"><ZoomIn size={13} className="text-neutral-400"/></button>
          </>}
          <Link href="/pro/planning" className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-neutral-100 ml-0.5">
            <Settings size={13} className="text-neutral-400"/>
          </Link>
        </div>
        <div className="flex items-center px-3 pb-2.5 gap-1.5">
          <div className="flex items-center gap-0.5 bg-neutral-100 rounded-full p-0.5">
            {(['day','week','month'] as ViewMode[]).map(v=>(
              <button key={v} onClick={()=>setView(v)}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold transition-all ${view===v?'bg-white text-neutral-900 shadow-sm':'text-neutral-500'}`}>
                {v==='day'?'Jour':v==='week'?'Semaine':'Mois'}
              </button>
            ))}
          </div>
          <button onClick={()=>setCurrent(new Date())} className="ml-auto text-[11px] font-semibold text-violet-600 px-3 py-1.5 rounded-full hover:bg-violet-50 transition-colors">Auj.</button>
          {pending.length>0&&(
            <div className="relative">
              <Bell size={15} className="text-amber-500"/>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">{pending.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Pending */}
      {pending.length>0&&(
        <PendingBanner
          pending={pending} updating={updating}
          collapsed={pendingCollapsed} onToggle={()=>setPendingCollapsed(c=>!c)}
          onConfirm={id=>updateStatus(id,'confirmed')}
          onDecline={id=>updateStatus(id,'declined')}
          onOpen={apt=>setSelectedApt(apt)}
        />
      )}

      {/* AI hint */}
      {aiHint&&(
        <div className="mx-3 mt-2 bg-violet-50 border border-violet-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-violet-500 rounded-full flex-shrink-0"/>
          <p className="text-[12px] text-violet-800 font-medium flex-1">{aiHint}</p>
          <button onClick={()=>setAiHint(null)} className="text-violet-400"><X size={13}/></button>
        </div>
      )}

      {/* Views */}
      {view==='day'&&(
        <DayView
          date={current} appointments={appointments} unavailabilities={unavailabilities}
          hourHeight={hourH} loading={loading}
          onMove={moveAppointment}
          onSelectApt={apt=>setSelectedApt(apt)}
          onSelectUnavailability={u=>setSelectedUnavail(u)}
          onQuickCreate={(time,date)=>setQuickCreate({time,date})}
        />
      )}
      {view==='week'&&(
        <WeekView
          weekStart={weekStart} appointments={appointments} unavailabilities={unavailabilities}
          hourHeight={Math.max(44,Math.round(hourH*0.7))} loading={loading}
          onMove={moveAppointment}
          onDayClick={d=>{setCurrent(d);setView('day');}}
          onSelectApt={apt=>setSelectedApt(apt)}
          onSelectUnavailability={u=>setSelectedUnavail(u)}
        />
      )}
      {view==='month'&&(
        <MonthView
          year={current.getFullYear()} month={current.getMonth()}
          appointments={appointments} today={isoDate(new Date())}
          onDayClick={d=>{setCurrent(d);setView('day');}}
        />
      )}

      {/* Appointment detail sheet */}
      {selectedApt&&(
        <AppointmentSheet
          apt={selectedApt}
          onClose={()=>setSelectedApt(null)}
          onStatusChange={updateStatus}
          onReschedule={reschedule}
          saving={saving}
        />
      )}

      {/* Quick create */}
      {quickCreate&&(
        <QuickCreatePopup
          date={quickCreate.date} time={quickCreate.time}
          onClose={()=>setQuickCreate(null)}
          onBlock={()=>{ setBlockCreate({date:quickCreate.date,time:quickCreate.time}); setQuickCreate(null); }}
          onPause={()=>{ setBlockCreate({date:quickCreate.date,time:quickCreate.time,presetReason:'Pause'}); setQuickCreate(null); }}
        />
      )}

      {/* Créer un blocage */}
      {blockCreate&&(
        <BlockCreateSheet
          date={blockCreate.date} time={blockCreate.time} presetReason={blockCreate.presetReason}
          onClose={()=>setBlockCreate(null)}
          onCreated={()=>{ setBlockCreate(null); loadUnavailabilities(); }}
        />
      )}

      {/* Supprimer un blocage */}
      {selectedUnavail&&(
        <UnavailabilityConfirmSheet
          unavail={selectedUnavail}
          onClose={()=>setSelectedUnavail(null)}
          onDeleted={(id)=>{ setUnavailabilities(prev=>prev.filter(u=>u.id!==id)); setSelectedUnavail(null); }}
        />
      )}
    </div>
  );
}
