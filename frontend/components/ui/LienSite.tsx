'use client';

import Link from 'next/link';
import { Capacitor } from '@capacitor/core';
import { ouvrirPageSite } from '@/lib/pageSite';

/**
 * Lien vers une page légale / d'aide du site. Web : navigation normale.
 * App native : feuille Safari par-dessus l'app (voir lib/pageSite.ts).
 */
export default function LienSite({
  path, className, children, nouvelOnglet = false,
}: {
  path: string; className?: string; children: React.ReactNode;
  /** Web : ouvre dans un nouvel onglet. Sans effet en natif (feuille Safari). */
  nouvelOnglet?: boolean;
}) {
  return (
    <Link
      href={path}
      className={className}
      {...(nouvelOnglet ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      onClick={(e) => {
        if (!Capacitor.isNativePlatform()) return;
        e.preventDefault();
        void ouvrirPageSite(path);
      }}
    >
      {children}
    </Link>
  );
}
