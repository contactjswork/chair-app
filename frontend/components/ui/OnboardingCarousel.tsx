'use client';

import { useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';

export interface OnboardingSlide {
  Icon: React.ElementType;
  title: string;
  body: string;
}

interface Props {
  slides: OnboardingSlide[];
  dark?: boolean;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
  onSkip: () => void;
}

/**
 * Carousel premium affiché une seule fois à la toute première ouverture de
 * l'app (avant inscription/connexion) — mémorisé côté appelant via localStorage,
 * ce composant ne gère que l'affichage/la navigation entre slides.
 */
export default function OnboardingCarousel({
  slides, dark, primaryLabel, secondaryLabel, onPrimary, onSecondary, onSkip,
}: Props) {
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLast = index === slides.length - 1;

  function goTo(i: number) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
    setIndex(i);
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  }

  const bg = dark ? 'bg-neutral-950' : 'bg-white';
  const fg = dark ? 'text-white' : 'text-neutral-900';
  const sub = dark ? 'text-neutral-400' : 'text-neutral-500';
  const dotIdle = dark ? 'bg-neutral-700' : 'bg-neutral-200';
  const iconBg = dark ? 'bg-white/10' : 'bg-neutral-100';
  const iconFg = dark ? 'text-white' : 'text-neutral-900';
  const skipCls = dark ? 'text-neutral-500 hover:text-neutral-300' : 'text-neutral-400 hover:text-neutral-600';
  const secondaryCls = dark
    ? 'text-neutral-400 hover:text-neutral-200'
    : 'text-neutral-500 hover:text-neutral-800';
  const primaryCls = dark
    ? 'bg-white text-neutral-900 hover:bg-neutral-100'
    : 'bg-neutral-900 text-white hover:bg-neutral-700';

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col ${bg} pt-safe pb-safe`}>
      {/* Skip */}
      <div className="flex justify-end px-5 pt-3">
        <button onClick={onSkip} className={`relative before:absolute before:-inset-y-[4px] before:inset-x-0 before:content-[''] text-[13px] font-medium px-3 py-2 transition-colors ${skipCls}`}>
          Passer
        </button>
      </div>

      {/* Slides */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 flex overflow-x-auto snap-x snap-mandatory no-scrollbar touch-pan-x"
      >
        {slides.map((s, i) => (
          <div key={i} className="w-full flex-shrink-0 snap-center flex flex-col items-center justify-center px-8 text-center">
            <div className={`w-20 h-20 rounded-[28px] flex items-center justify-center mb-8 ${iconBg}`}>
              <s.Icon size={32} className={iconFg} strokeWidth={1.5} />
            </div>
            <h2 className={`text-[24px] font-bold leading-tight mb-3 ${fg}`}>{s.title}</h2>
            <p className={`text-[15px] leading-relaxed max-w-[300px] ${sub}`}>{s.body}</p>
          </div>
        ))}
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 py-6">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
            className={`relative before:absolute before:-inset-y-[19px] before:-inset-x-1 before:content-[''] h-1.5 rounded-full transition-all ${i === index ? `w-6 ${dark ? 'bg-white' : 'bg-neutral-900'}` : `w-1.5 ${dotIdle}`}`}
          />
        ))}
      </div>

      {/* CTA */}
      <div className="px-6 pb-6">
        {isLast ? (
          <div className="flex flex-col gap-3">
            <button
              onClick={onPrimary}
              className={`w-full flex items-center justify-center gap-1.5 font-semibold py-4 rounded-2xl text-[15px] transition-colors ${primaryCls}`}
            >
              {primaryLabel}
              <ChevronRight size={17} />
            </button>
            <button onClick={onSecondary} className={`text-center text-[13px] font-medium py-2 transition-colors ${secondaryCls}`}>
              {secondaryLabel}
            </button>
          </div>
        ) : (
          <button
            onClick={() => goTo(index + 1)}
            className={`w-full flex items-center justify-center gap-1.5 font-semibold py-4 rounded-2xl text-[15px] transition-colors ${primaryCls}`}
          >
            Suivant
            <ChevronRight size={17} />
          </button>
        )}
      </div>
    </div>
  );
}
