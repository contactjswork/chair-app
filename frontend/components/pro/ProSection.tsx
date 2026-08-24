'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/**
 * Chapitre du cockpit. La home pro empilait ~11 cartes de poids visuel
 * identique : sans repère, la page se lit comme un fil infini où tout
 * réclame la même attention. Un titre de section donne une progression
 * lisible (aujourd'hui → à faire → progression → vitrine → activité)
 * et permet de sauter ce qui ne concerne pas l'instant présent.
 */
export default function ProSection({
  label, action, children,
}: {
  label: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2 pt-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">{label}</h2>
        {action && (
          <Link href={action.href} className="flex items-center gap-0.5 text-[11px] font-semibold text-neutral-400 hover:text-neutral-900 transition-colors">
            {action.label}<ChevronRight size={12} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
