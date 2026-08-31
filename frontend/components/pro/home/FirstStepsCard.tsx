'use client';

import Link from 'next/link';
import { Check, ChevronRight } from 'lucide-react';
import { CARTE, MICRO_TITRE, RAIL_CREUX, RAIL_PLEIN } from '@/lib/proStyle';

/**
 * Les premiers pas — les cinq gestes qui lancent un profil.
 *
 * La complétion de profil (photo, bio, ville…) dit si la FICHE est prête.
 * Elle ne dit pas si le MÉTIER a commencé : publier, imprimer son QR,
 * décrocher un premier avis. Un coiffeur au profil parfait mais sans
 * réalisation ni QR sur le comptoir n'a encore rien lancé.
 *
 * La carte disparaît une fois les cinq gestes faits — comme la complétion :
 * une checklist terminée qui reste affichée devient un trophée en carton.
 * Chaque ligne mène à l'endroit exact du geste, pas à un écran d'accueil.
 */

export interface Geste {
  libelle: string;
  fait: boolean;
  href: string;
}

export default function FirstStepsCard({ gestes }: { gestes: Geste[] }) {
  const faits = gestes.filter((g) => g.fait).length;
  if (faits >= gestes.length) return null;

  return (
    <div className={`${CARTE} p-5`}>
      <div className="flex items-center justify-between gap-3">
        <p className={MICRO_TITRE}>Premiers pas</p>
        <span className="text-[12px] font-semibold text-neutral-500 tabular-nums">
          {faits}/{gestes.length}
        </span>
      </div>

      <div className={`mt-3 h-2 rounded-full overflow-hidden ${RAIL_CREUX}`}>
        <div
          className={`h-full rounded-full ${RAIL_PLEIN} transition-[width] duration-500`}
          style={{ width: `${Math.max(4, (faits / gestes.length) * 100)}%` }}
        />
      </div>

      <ul className="mt-4 divide-y divide-neutral-50">
        {gestes.map((g) => (
          <li key={g.libelle}>
            {g.fait ? (
              <div className="flex items-center gap-3 py-2.5 min-h-[44px]">
                <span className="w-5 h-5 rounded-full bg-neutral-900 flex items-center justify-center shrink-0">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </span>
                <span className="text-[14px] text-neutral-400 line-through decoration-neutral-300">
                  {g.libelle}
                </span>
              </div>
            ) : (
              <Link href={g.href} className="flex items-center gap-3 py-2.5 min-h-[44px] active:bg-neutral-50 transition-colors">
                <span className="w-5 h-5 rounded-full border-2 border-neutral-200 shrink-0" />
                <span className="flex-1 text-[14px] font-semibold text-neutral-900">{g.libelle}</span>
                <ChevronRight size={15} className="text-neutral-300 shrink-0" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
