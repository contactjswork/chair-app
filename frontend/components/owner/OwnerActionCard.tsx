'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

interface OwnerActionCardProps {
  icon: LucideIcon;
  label: string;
  href: string;
  colorClassName?: string;
}

/** Bouton d'action rapide du cockpit gérant ("Créer une offre", "Ajouter un fauteuil"...). */
export default function OwnerActionCard({ icon: Icon, label, href, colorClassName = 'bg-neutral-900 text-white' }: OwnerActionCardProps) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-4 py-4 rounded-[20px] shadow-[0_6px_18px_-8px_rgba(10,10,10,0.25)] font-semibold text-[14px] hover:opacity-90 transition-opacity ${colorClassName}`}>
      <Icon size={18} />
      <span className="leading-tight">{label}</span>
    </Link>
  );
}
