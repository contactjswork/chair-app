'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { CARTE_TAP, MICRO_TITRE } from '@/lib/proStyle';
import { QrCode, Star, ChevronRight } from 'lucide-react';

/**
 * « Ma semaine » — la carte du jour pour le coiffeur SALARIÉ.
 *
 * Un salarié n'a ni agenda ni CA sur CHAIR : ses chiffres à lui sont ses
 * passages scannés et ses avis. La home lui parlait surtout de rendez-vous
 * (le monde de l'indépendant) — cette carte remplace TodayCard pour lui
 * (lot « coiffeurs salariés », 01/09/2026). Mène vers Mon QR : c'est le
 * geste qui fait monter ces deux chiffres.
 */

interface Semaine {
  scans_7j: number;
  avis_7j: number;
  avis_moyenne_7j: number | null;
}

export default function WeekCard() {
  const [semaine, setSemaine] = useState<Semaine | null>(null);

  useEffect(() => {
    api.get<Semaine>('/my-week').then(setSemaine).catch(() => {});
  }, []);

  return (
    <Link href="/pro/mon-qr" className={`block ${CARTE_TAP} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <p className={MICRO_TITRE}>Ma semaine</p>
        <ChevronRight size={14} className="text-neutral-300" />
      </div>
      {semaine === null ? (
        <div className="h-12 bg-neutral-100 rounded-xl animate-pulse" />
      ) : semaine.scans_7j === 0 && semaine.avis_7j === 0 ? (
        <p className="text-[14px] text-neutral-600 leading-relaxed">
          Aucun passage scanné ces 7 derniers jours — faites scanner votre QR
          à chaque client : c&apos;est lui qui fait monter votre niveau.
        </p>
      ) : (
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center">
              <QrCode size={16} className="text-neutral-600" />
            </div>
            <div>
              <p className="text-[20px] font-bold text-neutral-900 leading-none tabular-nums">{semaine.scans_7j}</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">passage{semaine.scans_7j > 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <Star size={16} className="text-amber-500" fill="currentColor" />
            </div>
            <div>
              <p className="text-[20px] font-bold text-neutral-900 leading-none tabular-nums">
                {semaine.avis_7j}
                {semaine.avis_moyenne_7j != null && (
                  <span className="text-[13px] font-semibold text-neutral-400"> · {semaine.avis_moyenne_7j}★</span>
                )}
              </p>
              <p className="text-[11px] text-neutral-400 mt-0.5">avis reçu{semaine.avis_7j > 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      )}
    </Link>
  );
}
