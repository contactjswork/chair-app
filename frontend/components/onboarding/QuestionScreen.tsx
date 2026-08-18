'use client';

import { ArrowRight } from 'lucide-react';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';

interface Props {
  eyebrow: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
  ctaLabel: string;
  ctaDisabled?: boolean;
  ctaLoading?: boolean;
  onNext: () => void;
  /** 'dark' = écrans d'arrivée (inscription), 'light' = onboarding post-inscription */
  theme?: 'dark' | 'light';
}

/**
 * Gabarit unique pour tout écran d'onboarding CHAIR PRO : une question, un
 * champ, un CTA. Utilisé par l'inscription (thème sombre) ET l'onboarding
 * post-inscription (thème clair) pour ne jamais dupliquer la mise en page.
 *
 * Le CTA est fixe et suit le clavier virtuel (useKeyboardInset) — retour de
 * Julien : il restait sous le clavier ouvert, obligeant à le refermer avant
 * de pouvoir continuer. Suppose qu'aucun ancêtre ne porte de `transform`
 * (voir useStepTransition.ts : le fondu d'étape ne pose plus translate-y-0
 * au repos, exprès pour ça — un transform, même identité, ancrerait ce
 * `position: fixed` à cet ancêtre au lieu du vrai viewport).
 */
export default function QuestionScreen({
  eyebrow, title, hint, children, ctaLabel, ctaDisabled, ctaLoading, onNext, theme = 'light',
}: Props) {
  const isDark = theme === 'dark';
  const keyboardInset = useKeyboardInset();

  return (
    <div className="flex-1 flex flex-col min-h-0 px-6">
      <div className="mb-6 flex-shrink-0">
        <p className={`text-[10px] font-bold tracking-[0.3em] uppercase mb-2 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>{eyebrow}</p>
        <h1 className={`text-[26px] font-bold leading-tight tracking-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>{title}</h1>
        {hint && <p className={`text-[13px] mt-2 leading-relaxed ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>{hint}</p>}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pb-28">{children}</div>

      <div
        className={`fixed left-0 right-0 z-40 px-6 pt-3 ${isDark ? 'bg-neutral-950/95' : 'bg-white/95'} backdrop-blur-sm`}
        style={{ bottom: keyboardInset, paddingBottom: keyboardInset > 0 ? '0.75rem' : 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={onNext}
          disabled={ctaDisabled || ctaLoading}
          className={`w-full flex items-center justify-center gap-2 font-bold py-4 rounded-2xl text-[15px] transition-colors disabled:opacity-40 ${
            isDark ? 'bg-white text-neutral-900 active:bg-neutral-200' : 'bg-neutral-900 text-white active:bg-neutral-700'
          }`}
        >
          {ctaLoading ? 'Un instant...' : ctaLabel}
          {!ctaLoading && <ArrowRight size={16} />}
        </button>
      </div>
    </div>
  );
}
