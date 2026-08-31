'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { ApiAppointment } from '@/lib/types';

/**
 * La journée, en un coup d'œil.
 *
 * Un coiffeur qui ouvre l'app entre deux clients cherche une seule chose :
 * qui arrive, et quand. Pas un tableau de bord — une réponse.
 *
 * D'où la hiérarchie : l'heure du prochain rendez-vous domine, le reste de la
 * journée tient en une ligne. Et quand la journée est finie ou vide, on le
 * dit franchement plutôt que d'afficher un zéro qui ressemble à un échec :
 * une journée sans rendez-vous n'est pas une contre-performance, c'est une
 * information.
 */

interface Props {
  appointments: ApiAppointment[];
  href?: string;
}

const ACTIFS = ['confirmed', 'pending'];

export default function TodayCard({ appointments, href = '/pro/agenda' }: Props) {
  const aujourdhui = ymdLocal(new Date());

  const duJour = appointments
    .filter((a) => a.appointment_date?.slice(0, 10) === aujourdhui && ACTIFS.includes(a.status))
    .sort((a, b) => (a.appointment_time ?? '').localeCompare(b.appointment_time ?? ''));

  const maintenant = new Date();
  const minutesActuelles = maintenant.getHours() * 60 + maintenant.getMinutes();
  const aVenir = duJour.filter((a) => enMinutes(a.appointment_time) >= minutesActuelles);
  const prochain = aVenir[0] ?? null;

  const ca = duJour.reduce((s, a) => s + (a.price ? parseFloat(a.price) : 0), 0);

  return (
    <Link
      href={href}
      className="block rounded-[24px] border border-neutral-100 p-5 active:bg-neutral-50 transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">Aujourd&apos;hui</p>
        <ChevronRight size={16} className="text-neutral-300 shrink-0" />
      </div>

      {duJour.length === 0 ? (
        <p className="text-[15px] text-neutral-500 mt-3 leading-relaxed">
          Aucun rendez-vous prévu. Bonne journée pour publier une réalisation.
        </p>
      ) : prochain ? (
        <>
          <div className="flex items-baseline gap-3 mt-3">
            <span className="text-[44px] font-bold leading-none tracking-[-0.03em] tabular-nums text-neutral-900">
              {prochain.appointment_time?.slice(0, 5)}
            </span>
            <span className="text-[15px] font-semibold text-neutral-900 truncate min-w-0">
              {prochain.client_name}
            </span>
          </div>
          <p className="text-[13px] text-neutral-500 mt-1.5 truncate">
            {prochain.service}
            {prochain.duration_minutes ? ` · ${prochain.duration_minutes} min` : ''}
          </p>
          <p className="text-[13px] text-neutral-500 mt-3 tabular-nums">
            {duJour.length} rendez-vous
            {aVenir.length !== duJour.length && ` · ${aVenir.length} à venir`}
            {ca > 0 && ` · ${ca.toFixed(0)} €`}
          </p>
        </>
      ) : (
        <>
          <p className="text-[19px] font-bold text-neutral-900 mt-3">Journée terminée</p>
          <p className="text-[13px] text-neutral-500 mt-1.5 tabular-nums">
            {duJour.length} rendez-vous{ca > 0 && ` · ${ca.toFixed(0)} €`}
          </p>
        </>
      )}
    </Link>
  );
}

/** Date locale au format YYYY-MM-DD — jamais toISOString(), qui bascule en UTC. */
function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function enMinutes(heure: string | null): number {
  if (!heure) return 24 * 60;
  const [h, m] = heure.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
