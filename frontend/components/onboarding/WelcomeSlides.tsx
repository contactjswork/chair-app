'use client';

import { useState } from 'react';
import { ArrowRight, Award, Scissors, Sparkles, TrendingUp } from 'lucide-react';
import ChairLogo from '@/components/ui/ChairLogo';
import { useStepTransition, tapFeedback } from '@/hooks/useStepTransition';

interface Slide {
  eyebrow: string;
  title: string;
  body: string;
  icon: React.ElementType;
}

const SLIDES: Slide[] = [
  {
    eyebrow: 'CHAIR PRO',
    title: 'Bienvenue sur CHAIR PRO.',
    body: "L'application pensée pour faire grandir les coiffeurs.",
    icon: Scissors,
  },
  {
    eyebrow: 'Réputation',
    title: 'Développe ta réputation.',
    body: 'Montre ton travail. Gagne des abonnés. Monte dans les classements.',
    icon: TrendingUp,
  },
  {
    eyebrow: 'Carrière',
    title: 'Fais évoluer ta carrière.',
    body: 'Stories, CHAIR+, classements, badges, statistiques — tout est réuni.',
    icon: Sparkles,
  },
  {
    eyebrow: 'À toi de jouer',
    title: 'Prêt à commencer ?',
    body: 'Ton profil se construit en quelques minutes.',
    icon: Award,
  },
];

/** Composition décorative abstraite — pas d'illustration commandée, un jeu de
 *  cercles + icône reprenant le style déjà utilisé sur les cards CTA sombres
 *  de la home (HomePersonalized). */
function SlideVisual({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <div className="relative w-full aspect-square max-w-[240px] mx-auto flex items-center justify-center">
      <div className="absolute -top-4 -right-6 w-28 h-28 rounded-full bg-white/5" />
      <div className="absolute -bottom-6 -left-8 w-36 h-36 rounded-full bg-white/5" />
      <div className="absolute inset-0 rounded-full border border-white/10" />
      <div className="absolute inset-6 rounded-full border border-white/10" />
      <div className="relative w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-2xl">
        <Icon size={38} strokeWidth={1.5} className="text-neutral-900" />
      </div>
    </div>
  );
}

interface Props {
  onDone: () => void;
}

export default function WelcomeSlides({ onDone }: Props) {
  const [index, setIndex] = useState(0);
  const { animClass, transition } = useStepTransition();
  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  function next() {
    tapFeedback();
    if (isLast) { onDone(); return; }
    transition(() => setIndex((i) => i + 1));
  }

  function goTo(i: number) {
    if (i === index) return;
    tapFeedback();
    transition(() => setIndex(i));
  }

  return (
    <div className="h-[100svh] bg-neutral-950 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-safe-5 pb-2">
        <ChairLogo href="/pro" size="sm" pro dark />
        <button onClick={onDone} className="text-[13px] font-medium text-neutral-500 hover:text-neutral-300 transition-colors">
          Passer
        </button>
      </div>

      {/* Contenu */}
      <div className={`flex-1 flex flex-col min-h-0 px-6 transition-all duration-180 ease-out ${animClass}`}>
        <div className="flex-1 flex items-center justify-center min-h-0">
          <SlideVisual icon={slide.icon} />
        </div>

        <div className="flex-shrink-0 pb-4 text-center">
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-neutral-500 mb-2">{slide.eyebrow}</p>
          <h1 className="text-[28px] font-bold text-white leading-tight tracking-tight mb-2.5">{slide.title}</h1>
          <p className="text-[14px] text-neutral-400 leading-relaxed max-w-xs mx-auto">{slide.body}</p>
        </div>
      </div>

      {/* Dots + CTA */}
      <div className="flex-shrink-0 px-6 pb-8 pt-2">
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Aller à l'étape ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-6 bg-white' : 'w-1.5 bg-neutral-700'}`}
            />
          ))}
        </div>
        <button
          onClick={next}
          className="w-full flex items-center justify-center gap-2 bg-white text-neutral-900 font-bold py-4 rounded-2xl text-[15px] active:bg-neutral-200 transition-colors"
        >
          {isLast ? 'Créer mon profil' : 'Continuer'}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
