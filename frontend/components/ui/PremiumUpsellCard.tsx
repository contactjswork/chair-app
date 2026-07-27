'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { hasChairPlus } from '@/lib/types';
import type { ApiHairdresserProfile } from '@/lib/types';

/**
 * Un seul emplacement non-intrusif pour l'upsell CHAIR+ sur la home — décrit
 * la valeur globale (pas Stories en particulier, StoryCreateCard s'en charge
 * déjà juste au-dessus). Disparaît entièrement dès que l'abonnement est actif.
 */
export default function PremiumUpsellCard({ profile }: { profile: ApiHairdresserProfile | null }) {
  if (hasChairPlus(profile)) return null;

  return (
    <Link
      href="/pro/chair-plus"
      className="group relative flex items-center gap-3.5 bg-neutral-900 rounded-2xl p-4 overflow-hidden hover:bg-neutral-800 transition-colors"
    >
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{
        background: 'radial-gradient(240px circle at 0% 0%, rgba(255,255,255,0.15), transparent 70%)',
      }} />
      <div className="relative w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
        <Sparkles size={17} className="text-white" strokeWidth={1.5} />
      </div>
      <div className="relative flex-1 min-w-0">
        <p className="text-sm font-bold text-white">Passe CHAIR+</p>
        <p className="text-xs text-white/50 mt-0.5">Vidéos, boost, analytics — essai gratuit 30 jours</p>
      </div>
      <ArrowRight size={16} className="relative text-white/40 flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
