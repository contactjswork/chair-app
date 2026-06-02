'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  /** URL de repli si pas d'historique */
  backHref?: string;
  /** Élément optionnel aligné à droite */
  right?: React.ReactNode;
}

export default function PageHeader({
  title,
  backHref = '/',
  right,
}: PageHeaderProps) {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(backHref);
    }
  }

  return (
    <header className="relative flex items-center justify-between h-12 mb-2">
      <button
        onClick={handleBack}
        className="flex items-center gap-1.5 text-neutral-700 hover:text-neutral-900 transition-colors -ml-1 px-1 py-1 rounded-lg"
        aria-label="Retour"
      >
        <ArrowLeft size={18} strokeWidth={2} />
        <span className="text-[13px] font-medium">Retour</span>
      </button>

      <h1 className="absolute left-1/2 -translate-x-1/2 text-[15px] font-semibold text-neutral-900 pointer-events-none whitespace-nowrap">
        {title}
      </h1>

      <div>{right ?? <div className="w-10" />}</div>
    </header>
  );
}
