'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { CARTE_TAP, CARTE_SOMBRE_TAP } from '@/lib/proStyle';

interface OwnerActionCardProps {
  icon: LucideIcon;
  label: string;
  href: string;
  colorClassName?: string;
}

/**
 * Bouton d'action rapide du cockpit gérant ("Créer une offre", "Ajouter un
 * fauteuil"...). Rebasé sur lib/proStyle (audit DA 03/09/2026) : les surfaces
 * viennent de CARTE_TAP / CARTE_SOMBRE_TAP — plus de radius ni d'ombre maison,
 * et le retour tactile est l'enfoncement proStyle, pas un hover d'opacité.
 * `colorClassName` est conservé pour compatibilité : une valeur contenant
 * `neutral-900` sélectionne la variante sombre.
 */
export default function OwnerActionCard({ icon: Icon, label, href, colorClassName = 'bg-neutral-900 text-white' }: OwnerActionCardProps) {
  const sombre = colorClassName.includes('neutral-900');
  const surface = sombre ? CARTE_SOMBRE_TAP : CARTE_TAP;
  const texte = sombre ? 'text-white' : 'text-neutral-900';

  return (
    <Link href={href} className={`${surface} flex items-center gap-3 px-4 py-4 font-semibold text-[14px] ${texte}`}>
      <Icon size={18} strokeWidth={1.75} className="shrink-0" />
      <span className="leading-tight">{label}</span>
    </Link>
  );
}
