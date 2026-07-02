'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

interface BackButtonProps {
  fallbackHref?: string;
  className?: string;
}

export default function BackButton({ fallbackHref = '/', className }: BackButtonProps) {
  const router = useRouter();

  function handleClick() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <button
      onClick={handleClick}
      aria-label="Retour"
      className={className ?? 'absolute top-4 left-4 w-9 h-9 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors md:hidden'}
    >
      <ChevronLeft size={19} />
    </button>
  );
}
