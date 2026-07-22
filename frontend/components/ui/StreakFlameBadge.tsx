'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Flame, X } from 'lucide-react';

interface Props {
  days: number;
  active: boolean;
  coiffeurName: string;
}

export default function StreakFlameBadge({ days, active, coiffeurName }: Props) {
  const [open, setOpen] = useState(false);
  if (days < 3) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={`${days} jours d'activité consécutifs sur CHAIR`}
        className={`absolute -top-1 -right-1 flex items-center gap-0.5 pl-1 pr-1.5 py-0.5 rounded-full border-2 border-white shadow-sm ${active ? 'bg-orange-500' : 'bg-neutral-400'}`}
      >
        <Flame size={10} className="text-white" fill="currentColor" strokeWidth={0} />
        <span className="text-[10px] font-bold text-white leading-none">{days}</span>
      </button>

      {/* Portalé dans body, z-index au-dessus de la bottom nav (z-[60]) : sinon
          le volet hérite du contexte d'empilement de l'avatar (relative z-10)
          et se retrouve sous le CTA / la bottom nav, texte coupé. */}
      {open && createPortal(
        <div className="fixed inset-0 z-[70] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-t-3xl shadow-2xl px-5 pt-5 pb-8 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[16px] font-bold text-neutral-900">Série active</p>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors flex-shrink-0"
              >
                <X size={15} />
              </button>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${active ? 'bg-orange-500' : 'bg-neutral-400'}`}>
                <Flame size={22} className="text-white" fill="currentColor" strokeWidth={0} />
              </div>
              <div>
                <p className="text-[15px] font-bold text-neutral-900">{days} jours d&apos;activité</p>
                <p className="text-[12px] text-neutral-400">{active ? 'Actif aujourd\'hui' : 'Toujours en cours'}</p>
              </div>
            </div>
            <p className="text-[13px] text-neutral-500 leading-relaxed">
              {coiffeurName} publie des réalisations, répond à ses avis et suit ses rendez-vous sans interruption depuis {days} jours d&apos;affilée. Un signe de régularité.
            </p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
