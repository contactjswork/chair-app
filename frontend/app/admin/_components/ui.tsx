'use client';

import { useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Info, Zap, HammerIcon } from 'lucide-react';

// ─── Skeleton ────────────────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-neutral-100 dark:bg-neutral-800 rounded-xl ${className ?? ''}`} />;
}

// ─── Carte / conteneur ───────────────────────────────────────────────────────

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm ${className ?? ''}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3">
      <div>
        <h2 className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">{title}</h2>
        {subtitle && <p className="text-[12px] text-neutral-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Pastilles de statut ─────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  verified: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  hidden: 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
  visible: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  suspended: 'Suspendu',
  pending: 'En attente',
  verified: 'Vérifié',
  hidden: 'Masqué',
  visible: 'Visible',
  rejected: 'Rejeté',
};

export function StatusPill({ status, labelOverride }: { status: string; labelOverride?: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${
        STATUS_STYLES[status] ?? 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
      }`}
    >
      {labelOverride ?? STATUS_LABELS[status] ?? status}
    </span>
  );
}

const ROLE_STYLES: Record<string, string> = {
  client: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  hairdresser: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
  salon_owner: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  admin: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
};

const ROLE_LABELS: Record<string, string> = {
  client: 'Client',
  hairdresser: 'Coiffeur',
  salon_owner: 'Gérant',
  admin: 'Admin',
};

export function RolePill({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${ROLE_STYLES[role] ?? 'bg-neutral-100 text-neutral-500'}`}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

// ─── Info-bulle pédagogique (paramètres non-triviaux) ───────────────────────

/**
 * Utilisée à côté de chaque réglage algo/feature flag non-trivial. Distingue
 * toujours clairement "instantané" (pris en compte immédiatement, cache
 * invalidé côté serveur à l'écriture) de "nécessite un build" (constante
 * codée en dur, un futur agent devra la migrer vers app_settings) — c'est
 * une exigence explicite de Julien, pas une nuance cosmétique.
 */
export function InfoTip({ text, effect }: { text: string; effect: 'instant' | 'build' }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-neutral-300 hover:text-neutral-500 dark:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
      >
        <Info size={13} />
      </button>
      {open && (
        <div className="absolute z-30 left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 rounded-xl bg-neutral-900 dark:bg-neutral-700 text-white text-[12px] leading-snug shadow-xl">
          <p>{text}</p>
          <div className={`mt-2 inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide ${effect === 'instant' ? 'text-emerald-400' : 'text-amber-400'}`}>
            {effect === 'instant' ? <Zap size={11} /> : <HammerIcon size={11} />}
            {effect === 'instant' ? 'Effet instantané' : 'Nécessite un build'}
          </div>
        </div>
      )}
    </span>
  );
}

export function EffectBadge({ effect }: { effect: 'instant' | 'build' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap ${
        effect === 'instant'
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
          : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
      }`}
    >
      {effect === 'instant' ? <Zap size={10} /> : <HammerIcon size={10} />}
      {effect === 'instant' ? 'Instantané' : 'Build requis'}
    </span>
  );
}

// ─── Modale de confirmation (action sensible) ───────────────────────────────

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  danger = true,
  onCancel,
  onConfirm,
  loading,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl max-w-sm w-full p-6 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-50 text-red-500 dark:bg-red-500/15' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/15'}`}>
            <AlertTriangle size={16} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-neutral-900 dark:text-neutral-50">{title}</h3>
            <div className="text-[13px] text-neutral-500 dark:text-neutral-400 mt-1">{message}</div>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-colors disabled:opacity-50 ${
              danger ? 'bg-red-500 hover:bg-red-600' : 'bg-neutral-900 hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200'
            }`}
          >
            {loading ? 'En cours…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1;
    if (page <= 4) return i + 1;
    if (page >= totalPages - 3) return totalPages - 6 + i;
    return page - 3 + i;
  }).filter((p) => p >= 1 && p <= totalPages);

  return (
    <div className="flex items-center gap-1 justify-center">
      <button onClick={() => onChange(page - 1)} disabled={page === 1} className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 transition-colors">
        <ChevronLeft size={16} />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`w-8 h-8 rounded-lg text-[13px] font-medium transition-colors ${
            p === page ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
          }`}
        >
          {p}
        </button>
      ))}
      <button onClick={() => onChange(page + 1)} disabled={page === totalPages} className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 transition-colors">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ─── États vides / erreurs ───────────────────────────────────────────────────

export function EmptyState({ text }: { text: string }) {
  return <div className="px-5 py-12 text-center text-[13px] text-neutral-400">{text}</div>;
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="px-4 py-3 bg-red-50 dark:bg-red-500/10 rounded-xl text-[13px] text-red-600 dark:text-red-400 flex items-center gap-2">
      <AlertTriangle size={15} className="flex-shrink-0" />
      {message}
    </div>
  );
}

export function PermissionDenied() {
  return (
    <Card className="p-10 flex flex-col items-center text-center gap-2">
      <AlertTriangle size={22} className="text-amber-500" />
      <p className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">Permission refusée</p>
      <p className="text-[13px] text-neutral-400 max-w-sm">
        Votre rôle admin ne vous donne pas accès à cette section. Contactez un Super Admin si vous pensez que c&apos;est une erreur.
      </p>
    </Card>
  );
}

// ─── Champ de recherche ──────────────────────────────────────────────────────

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className ?? ''}`}>
      <svg
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Rechercher…'}
        className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-[13px] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600"
      />
    </div>
  );
}

export const selectCls =
  'px-3 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-[13px] text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600';

export const inputCls =
  'w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-[13px] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600';

// ─── Stat tile ───────────────────────────────────────────────────────────────

export function StatTile({
  icon: Icon,
  value,
  label,
  tone = 'neutral',
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  tone?: 'neutral' | 'violet' | 'blue' | 'emerald' | 'amber' | 'red';
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
    red: 'bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400',
  };
  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tones[tone]}`}>
        <Icon size={17} />
      </div>
      <div>
        <div className="text-[24px] font-bold text-neutral-900 dark:text-neutral-50 leading-none tabular-nums">{value}</div>
        <div className="text-[12px] text-neutral-400 mt-1">{label}</div>
      </div>
    </Card>
  );
}

// ─── Table header cell ───────────────────────────────────────────────────────

export function Th({ children, align = 'left' }: { children?: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className={`px-4 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}

export function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-40 ${
        checked ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-700'
      }`}
    >
      <span className={`inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}
