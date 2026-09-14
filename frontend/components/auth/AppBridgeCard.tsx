'use client';

import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { isNativeApp } from '@/hooks/useGeolocation';

/**
 * Pont entre apps sur les écrans de connexion/inscription (retour Julien
 * 09/09/2026) : un gérant qui installe CHAIR PRO doit voir « vous êtes
 * gérant ? » et être mené vers CHAIR BUSINESS — et inversement un coiffeur
 * arrivé sur CHAIR BUSINESS est mené vers CHAIR PRO. Un seul compte pro pour
 * les deux apps : le pont oriente vers la bonne APP, jamais vers un autre
 * compte.
 *
 * Cible du lien, dans l'ordre :
 *  1. la fiche App Store de l'app visée (storeUrl), dès qu'elle existe ;
 *  2. dans un binaire natif sans fiche publiée : l'espace web public
 *     (externalUrl, navigateur externe) — même repli que BusinessAppGate ;
 *  3. sur le web : la page interne correspondante (internalPath).
 */
interface AppBridgeCardProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  storeUrl: string;
  externalUrl: string;
  internalPath: string;
}

const CARD_CLS =
  'w-full flex items-center gap-3.5 bg-neutral-50 hover:bg-neutral-100 ring-1 ring-neutral-100 rounded-2xl p-4 text-left transition-colors group';

export default function AppBridgeCard({ icon: Icon, title, subtitle, storeUrl, externalUrl, internalPath }: AppBridgeCardProps) {
  const inner = (
    <>
      <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-white" strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-neutral-900 leading-tight">{title}</p>
        <p className="text-[11.5px] text-neutral-500 leading-snug mt-0.5">{subtitle}</p>
      </div>
      <ArrowRight size={15} className="text-neutral-300 group-hover:text-neutral-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </>
  );

  const external = storeUrl || (isNativeApp() ? externalUrl : '');
  if (external) {
    return (
      <a href={external} target="_blank" rel="noopener noreferrer" className={CARD_CLS}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={internalPath} className={CARD_CLS}>
      {inner}
    </Link>
  );
}
