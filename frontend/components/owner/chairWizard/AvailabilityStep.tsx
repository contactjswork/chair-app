'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Ban } from 'lucide-react';

const DAYS = [
  { value: 1, label: 'Lun' }, { value: 2, label: 'Mar' }, { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' }, { value: 5, label: 'Ven' }, { value: 6, label: 'Sam' }, { value: 7, label: 'Dim' },
];

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface Props {
  availableDays: number[];
  onToggleDay: (day: number) => void;
  blockedDates: string[];
  onToggleDate: (iso: string) => void;
}

/** Récurrence hebdomadaire (gros toggles) + calendrier mensuel pour bloquer/débloquer des dates précises (sélection multiple par clics). */
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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-neutral-700 mb-2">Jours de la semaine disponibles</p>
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS.map((d) => {
            const active = availableDays.includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => onToggleDay(d.value)}
                className={`py-3 rounded-xl text-xs font-bold transition-colors ${
                  active ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-neutral-700">Bloquer des dates précises (vacances, indisponibilité...)</p>
        </div>
        <div className="bg-white shadow-[0_4px_16px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-100 rounded-2xl p-3">
          <div className="flex items-center justify-between mb-2 px-1">
            <button type="button" onClick={() => setMonthOffset((m) => m - 1)} className="w-7 h-7 rounded-full hover:bg-neutral-100 flex items-center justify-center">
              <ChevronLeft size={15} />
            </button>
            <p className="text-xs font-bold capitalize">{monthLabel}</p>
            <button type="button" onClick={() => setMonthOffset((m) => m + 1)} className="w-7 h-7 rounded-full hover:bg-neutral-100 flex items-center justify-center">
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
              <p key={i} className="text-center text-[10px] font-bold text-neutral-400">{d}</p>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              if (!cell) return <div key={`empty-${i}`} />;
              const isPast = cell.iso < todayISO;
              const isBlocked = blockedDates.includes(cell.iso);
              return (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={isPast}
                  onClick={() => onToggleDate(cell.iso)}
                  className={`aspect-square rounded-lg text-xs font-semibold flex items-center justify-center transition-colors ${
                    isPast ? 'text-neutral-200 cursor-not-allowed' :
                    isBlocked ? 'bg-red-50 text-red-600 line-through' : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>
        {blockedDates.length > 0 && (
          <p className="text-[11px] text-neutral-400 mt-2 flex items-center gap-1">
            <Ban size={11} />{blockedDates.length} date{blockedDates.length > 1 ? 's' : ''} bloquée{blockedDates.length > 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
