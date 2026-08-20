'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';

/**
 * Petit badge "CHAIR+" réutilisé partout où une fonctionnalité/un profil
 * doit signaler le statut premium (recherche, portfolio, profil public).
 * Un seul style pour rester cohérent — noir plein, jamais doré/criard,
 * conforme à la DA CHAIR (monochrome, pas d'Instagram-gradient).
 * Plaque typographique sobre : capitales très espacées, fin liseré
 * intérieur, sans icône — le pictogramme "étincelles" faisait gadget
 * (retour Julien : "le badge est dégueulasse").
 */
export function PremiumBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const cls = size === 'md'
    ? 'text-[9px] px-2.5 py-[5px] rounded-lg'
    : 'text-[8px] px-2 py-[3.5px] rounded-md';
  return (
    <span className={`inline-flex items-center ${cls} font-bold uppercase tracking-[0.16em] leading-none bg-neutral-900 text-white ring-1 ring-inset ring-white/20 select-none`}>
      CHAIR+
    </span>
  );
}

/**
 * Verrou réutilisable pour toute fonctionnalité CHAIR+ non débloquée — même
 * traitement visuel partout (icône cadenas + titre + sous-texte + lien).
 * Les permissions réelles restent côté serveur (403) ; ceci n'est qu'un
 * évitement d'appel inutile + orientation claire vers l'abonnement, jamais
 * la seule barrière (voir EnsureChairPlus middleware / checks inline).
 */
export function PremiumLockCard({
  title, subtitle, compact = false,
}: { title: string; subtitle?: string; compact?: boolean }) {
  return (
    <Link
      href="/pro/chair-plus"
      className={`flex items-center gap-3 bg-white rounded-2xl border border-neutral-100 hover:border-neutral-300 transition-colors ${compact ? 'p-3' : 'p-4'}`}
    >
      <div className={`rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0 ${compact ? 'w-8 h-8' : 'w-10 h-10'}`}>
        <Lock size={compact ? 13 : 15} className="text-neutral-400" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-neutral-900 flex items-center gap-1.5 ${compact ? 'text-[13px]' : 'text-sm'}`}>
          {title} <PremiumBadge />
        </p>
        {subtitle && <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>}
      </div>
      <span className="text-[11px] font-bold text-neutral-900 flex-shrink-0">Débloquer</span>
    </Link>
  );
}
