'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface DashboardPageHeaderProps {
  title: string;
  backHref?: string;
  right?: ReactNode;
}

// Pas de cloche notifications par défaut ici — ProTopBar (montée sur toutes
// les pages /pro/*, voir app/pro/layout.tsx) en affiche déjà une en
// permanence tout en haut ; en remettre une systématiquement ici la
// dupliquait sur la quasi-totalité des pages mobiles.
export default function DashboardPageHeader({
  title,
  backHref = '/pro',
  right,
}: DashboardPageHeaderProps) {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(backHref);
    }
  }

  return (
    <header className="relative flex items-center justify-between h-12 mb-1 md:hidden">
      <button
        onClick={handleBack}
        className="flex items-center justify-center w-11 h-11 text-neutral-700 hover:text-neutral-900 transition-colors -ml-2.5 rounded-lg"
        aria-label="Retour"
      >
        <ArrowLeft size={20} strokeWidth={2} />
      </button>

      <h1 className="absolute left-1/2 -translate-x-1/2 text-[15px] font-semibold text-neutral-900 pointer-events-none">
        {title}
      </h1>

      {right ?? <div className="w-8 h-8" />}
    </header>
  );
}
