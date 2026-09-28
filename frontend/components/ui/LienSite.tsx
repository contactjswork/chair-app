'use client';

import Link from 'next/link';
import { Capacitor } from '@capacitor/core';
import { ouvrirPageSite } from '@/lib/pageSite';

/**
 * Lien vers une page légale / d'aide du site. Web : navigation normale.
 * App native : feuille Safari par-dessus l'app (voir lib/pageSite.ts).
 */
export default function LienSite({
  path, className, children,
}: { path: string; className?: string; children: React.ReactNode }) {
  return (
    <Link
      href={path}
      className={className}
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
