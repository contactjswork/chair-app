'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarOff, X } from 'lucide-react';

const DAYS = [
  { value: 1, label: 'Lun' }, { value: 2, label: 'Mar' }, { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' }, { value: 5, label: 'Ven' }, { value: 6, label: 'Sam' }, { value: 7, label: 'Dim' },
];

/** Date locale → ISO (yyyy-mm-dd). PAS toISOString() : il passe par UTC et
 *  décale d'un jour toute sélection faite le soir en France. */
function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${j}`;
}

function formatCourt(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

interface Props {
  availableDays: number[];
  onToggleDay: (day: number) => void;
  blockedDates: string[];
  onToggleDate: (iso: string) => void;
}

/**
 * Disponibilités — refonte UX 15/09/2026 (retour Julien : « c'est pas beau »).
 * Deux gestes simples : la semaine type en pilules, puis un calendrier propre
 * (cellules rondes, aujourd'hui cerclé, dates bloquées en noir barré) pour
 * les exceptions — avec les dates bloquées rappelées en chips retirables,
 * pour ne jamais avoir à re-naviguer de mois en mois pour en libérer une.
 */
export default function AvailabilityStep({ availableDays, onToggleDay, blockedDates, onToggleDate }: Props) {
  const [monthOffset, setMonthOffset] = useState(0);

  const base = new Date();
  const viewMonth = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  const monthLabel = viewMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const firstWeekday = (viewMonth.getDay() + 6) % 7; // lundi=0
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const todayISO = toISODate(new Date());

  const cells: Array<{ iso: string; day: number } | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1);
      return { iso: toISODate(d), day: i + 1 };
    }),
  ];

  const blocageTries = [...blockedDates].sort();

  return (
    <div className="space-y-7">
      {/* ── La semaine type ── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400 mb-2.5">Semaine type</p>
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS.map((d) => {
            const active = availableDays.includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => onToggleDay(d.value)}
                className={`h-11 rounded-full text-xs font-bold transition-all active:scale-95 ${
                  active
                    ? 'bg-neutral-900 text-white shadow-[0_4px_12px_-4px_rgba(10,10,10,0.4)]'
                    : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200'
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-neutral-400 mt-2">
          Les jours où le fauteuil est proposé, chaque semaine.
        </p>
      </div>

      {/* ── Les exceptions ── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400 mb-2.5">Exceptions</p>
        <div className="bg-white rounded-[24px] ring-1 ring-neutral-100 shadow-[0_1px_2px_rgba(10,10,10,0.04),0_10px_26px_-14px_rgba(10,10,10,0.14)] p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setMonthOffset((m) => m - 1)}
              disabled={monthOffset === 0}
              className="w-9 h-9 rounded-full hover:bg-neutral-100 flex items-center justify-center disabled:opacity-30 transition-colors"
              aria-label="Mois précédent"
            >
              <ChevronLeft size={17} />
            </button>
            <p className="text-[14px] font-bold text-neutral-900 capitalize">{monthLabel}</p>
            <button
              type="button"
              onClick={() => setMonthOffset((m) => m + 1)}
              className="w-9 h-9 rounded-full hover:bg-neutral-100 flex items-center justify-center transition-colors"
              aria-label="Mois suivant"
            >
              <ChevronRight size={17} />
            </button>
          </div>
          <div className="grid grid-cols-7 mb-1.5">
            {DAYS.map((d) => (
              <p key={d.value} className="text-center text-[10px] font-bold uppercase tracking-wide text-neutral-300">{d.label.charAt(0)}</p>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((cell, i) => {
              if (!cell) return <div key={`empty-${i}`} />;
              const isPast = cell.iso < todayISO;
              const isToday = cell.iso === todayISO;
              const isBlocked = blockedDates.includes(cell.iso);
              return (
                <div key={cell.iso} className="flex items-center justify-center">
                  <button
                    type="button"
                    disabled={isPast}
                    onClick={() => onToggleDate(cell.iso)}
                    className={`w-10 h-10 rounded-full text-[13px] font-semibold flex items-center justify-center transition-all active:scale-90 ${
                      isPast
                        ? 'text-neutral-200 cursor-not-allowed'
                        : isBlocked
                          ? 'bg-neutral-900 text-white line-through decoration-white/60'
                          : `text-neutral-700 hover:bg-neutral-100 ${isToday ? 'ring-1 ring-neutral-300' : ''}`
                    }`}
                  >
                    {cell.day}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {blocageTries.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {blocageTries.map((iso) => (
              <button
                key={iso}
                type="button"
                onClick={() => onToggleDate(iso)}
                className="group flex items-center gap-1.5 bg-neutral-900 text-white text-[11px] font-semibold pl-3 pr-2 py-1.5 rounded-full transition-colors hover:bg-neutral-700"
              >
                {formatCourt(iso)}
                <X size={11} className="text-white/50 group-hover:text-white transition-colors" />
              </button>
            ))}
          </div>
        ) : (
          <p className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-2.5">
            <CalendarOff size={11} />
            Touchez un jour pour le bloquer (vacances, travaux…) — re-touchez pour le libérer.
          </p>
        )}
      </div>
    </div>
  );
}
