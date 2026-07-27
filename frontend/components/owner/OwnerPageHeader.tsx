'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface OwnerPageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  showBack?: boolean;
  right?: ReactNode;
}

/**
 * En-tête de page côté gérant — mobile : barre compacte avec retour, comme
 * DashboardPageHeader (côté coiffeur). Desktop : titre + sous-titre en clair,
 * pas de bouton retour (la sidebar dessert déjà la navigation).
 */
export default function OwnerPageHeader({ title, subtitle, backHref = '/pro/salon-owner', showBack = true, right }: OwnerPageHeaderProps) {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(backHref);
    }
  }

  return (
    <>
      <header className="relative flex items-center justify-between h-12 mb-1 md:hidden">
        {showBack ? (
          <button
            onClick={handleBack}
            className="flex items-center text-neutral-700 hover:text-neutral-900 transition-colors -ml-1 p-1.5 rounded-lg"
            aria-label="Retour"
          >
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
        ) : <div className="w-8 h-8" />}

        <h1 className="absolute left-1/2 -translate-x-1/2 text-[15px] font-semibold text-neutral-900 pointer-events-none">
          {title}
        </h1>

        {right ?? <div className="w-8 h-8" />}
      </header>

      <div className="hidden md:flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
          {subtitle && <p className="text-sm text-neutral-400 mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </div>
    </>
  );
}
