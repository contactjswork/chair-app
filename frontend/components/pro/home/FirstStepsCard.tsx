'use client';

import Link from 'next/link';
import { Check, ChevronRight } from 'lucide-react';
import { CARTE, MICRO_TITRE, RAIL_CREUX, RAIL_PLEIN } from '@/lib/proStyle';

/**
 * Bien démarrer — les gestes qui lancent un profil (refonte UX 15/09/2026,
 * validée Julien : « une checklist bien faite avec un bon UX » — sans jamais
 * pousser d'impression ni de visuel généré).
 *
 * La complétion de profil dit si la FICHE est prête ; ceux-ci disent si le
 * MÉTIER a commencé : publier, être vu, décrocher un premier avis.
 *
 * UX :
 *  - la carte vit EN TÊTE de la home tant qu'elle n'est pas finie (c'est la
 *    seule chose qui compte pour un profil neuf), puis disparaît ;
 *  - le PROCHAIN geste est mis en avant (fond, chevron noir) — un seul
 *    « à faire maintenant », pas six injonctions à égalité ;
 *  - un geste peut être une ACTION directe (ex. partager son profil : la
 *    feuille native s'ouvre sur place) plutôt qu'une navigation.
 */

export interface Geste {
  libelle: string;
  fait: boolean;
  href?: string;
  /** Action immédiate (ex. ouvrir la feuille de partage) — prime sur href. */
  action?: () => void;
}

export default function FirstStepsCard({ gestes }: { gestes: Geste[] }) {
  const faits = gestes.filter((g) => g.fait).length;
  if (faits >= gestes.length) return null;

  const prochainIndex = gestes.findIndex((g) => !g.fait);

  return (
    <div className={`${CARTE} p-5`}>
      <div className="flex items-center justify-between gap-3">
        <p className={MICRO_TITRE}>Bien démarrer</p>
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

      <ul className="mt-4 space-y-0.5">
        {gestes.map((g, i) => {
          const prochain = i === prochainIndex;

          if (g.fait) {
            return (
              <li key={g.libelle} className="flex items-center gap-3 px-2 py-2 min-h-[42px]">
                <span className="w-5 h-5 rounded-full bg-neutral-900 flex items-center justify-center shrink-0">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </span>
                <span className="text-[13.5px] text-neutral-400 line-through decoration-neutral-300">
                  {g.libelle}
                </span>
              </li>
            );
          }

          const contenu = (
            <>
              <span className={`w-5 h-5 rounded-full border-2 shrink-0 ${prochain ? 'border-neutral-900' : 'border-neutral-200'}`} />
              <span className={`flex-1 text-[13.5px] ${prochain ? 'font-bold text-neutral-900' : 'font-medium text-neutral-500'}`}>
                {g.libelle}
              </span>
              <ChevronRight size={15} className={`shrink-0 ${prochain ? 'text-neutral-900' : 'text-neutral-300'}`} />
            </>
          );
          const cls = `w-full flex items-center gap-3 px-2 py-2 min-h-[42px] rounded-xl text-left transition-colors ${
            prochain ? 'bg-neutral-50 active:bg-neutral-100' : 'active:bg-neutral-50'
          }`;

          return (
            <li key={g.libelle}>
              {g.action ? (
                <button onClick={g.action} className={cls}>{contenu}</button>
              ) : (
                <Link href={g.href ?? '/pro'} className={cls}>{contenu}</Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
