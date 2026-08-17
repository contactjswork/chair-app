'use client';

import Link from 'next/link';
import { ChevronRight, Euro, CalendarCheck, Clock } from 'lucide-react';
import type { ApiStats } from '@/lib/types';

// Réservé à l'activité commerciale — n'a de sens que pour un indépendant qui
// facture directement (un salarié n'a ni prix ni réservation directe).
export default function BusinessSnapshotCard({ stats }: { stats: ApiStats | null }) {
  if (!stats) return null;

  return (
    <Link href="/pro/business" className="block bg-white rounded-[22px] p-5 shadow-[0_2px_10px_-4px_rgba(10,10,10,0.08)] ring-1 ring-neutral-100 hover:shadow-[0_6px_18px_-6px_rgba(10,10,10,0.14)] transition-all">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-neutral-900">Activité commerciale</p>
        <ChevronRight size={14} className="text-neutral-300" />
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-neutral-50 rounded-xl p-3 text-center">
          <CalendarCheck size={14} className="text-neutral-300 mx-auto mb-1" strokeWidth={1.5} />
          <p className="text-base font-bold text-neutral-900 leading-none">{stats.appointments_this_month}</p>
          <p className="text-[8px] text-neutral-400 font-medium mt-1.5 uppercase tracking-wide">Ce mois</p>
        </div>
        <div className="bg-neutral-50 rounded-xl p-3 text-center">
          <Clock size={14} className="text-neutral-300 mx-auto mb-1" strokeWidth={1.5} />
          <p className="text-base font-bold text-neutral-900 leading-none">{stats.appointments_pending}</p>
          <p className="text-[8px] text-neutral-400 font-medium mt-1.5 uppercase tracking-wide">En attente</p>
        </div>
        <div className="bg-neutral-50 rounded-xl p-3 text-center">
          <Euro size={14} className="text-neutral-300 mx-auto mb-1" strokeWidth={1.5} />
          <p className="text-base font-bold text-neutral-900 leading-none">{Math.round(stats.revenue_estimate)}€</p>
          <p className="text-[8px] text-neutral-400 font-medium mt-1.5 uppercase tracking-wide">Estimé</p>
        </div>
      </div>
    </Link>
  );
}
