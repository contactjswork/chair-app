'use client';

import Link from 'next/link';
import type { ApiStats } from '@/lib/types';

// Réservé à l'activité commerciale — n'a de sens que pour un indépendant qui
// facture directement (un salarié n'a ni prix ni réservation directe).
export default function BusinessSnapshotCard({ stats }: { stats: ApiStats | null }) {
  if (!stats) return null;

  const cells = [
    { value: String(stats.appointments_this_month), label: 'Ce mois' },
    { value: String(stats.appointments_pending),    label: 'En attente' },
    { value: `${Math.round(stats.revenue_estimate)} €`, label: 'Estimé' },
  ];

  return (
    <Link href="/pro/business" className="grid grid-cols-3 bg-neutral-50 rounded-[20px] divide-x divide-neutral-200/60 hover:bg-neutral-100/80 transition-colors">
      {cells.map((c) => (
        <div key={c.label} className="px-4 py-5 text-center">
          <p className="text-[22px] font-bold text-neutral-900 tracking-[-0.02em] leading-none tabular-nums">{c.value}</p>
          <p className="text-[12px] text-neutral-400 mt-2">{c.label}</p>
        </div>
      ))}
    </Link>
  );
}
