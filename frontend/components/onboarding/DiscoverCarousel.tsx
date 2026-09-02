'use client';

import type { LucideIcon } from 'lucide-react';
import { Award, Gift, Sparkles, Trophy } from 'lucide-react';

export interface DiscoverFeature {
  icon: LucideIcon;
  title: string;
  desc: string;
}

// Les stories sont gratuites depuis le 01/09/2026 (sorties de CHAIR+) — la
// carte CHAIR+ vend désormais le carnet client illimité, le badge et le boost.
const HAIRDRESSER_FEATURES: DiscoverFeature[] = [
  { icon: Trophy,   title: 'Classements',      desc: 'Grimpe dans le top de ta spécialité et de ta ville — vu par tous les clients qui cherchent près de chez eux.' },
  { icon: Award,    title: 'Badges & niveau',  desc: 'Chaque réalisation, chaque avis, chaque visite te fait gagner des points et monter de niveau.' },
  { icon: Sparkles, title: 'CHAIR+',           desc: 'Carnet client illimité, badge vérifié et mise en avant locale — pour sortir du lot.' },
  { icon: Gift,     title: 'Parrainage',       desc: "Invite d'autres coiffeurs ou salons : 1 mois de CHAIR+ offert pour toi et ton filleul." },
];

interface Props {
  features?: DiscoverFeature[];
}

/**
 * Un seul écran consolidé pour présenter les fonctionnalités clés (au lieu
 * d'un écran plein par fonctionnalité) — l'idée reste "une idée par carte",
 * sans transformer l'onboarding en série de dix écrans quasi vides.
 * `features` par défaut = coiffeur ; l'onboarding gérant passe sa propre liste.
 */
export default function DiscoverCarousel({ features = HAIRDRESSER_FEATURES }: Props) {
  return (
    <div className="space-y-2.5">
      {features.map(({ icon: Icon, title, desc }) => (
        <div key={title} className="flex items-start gap-3.5 bg-neutral-50 rounded-2xl px-4 py-3.5">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center flex-shrink-0">
            <Icon size={18} className="text-white" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 pt-0.5">
            <p className="text-[14px] font-bold text-neutral-900 leading-tight">{title}</p>
            <p className="text-[12px] text-neutral-500 leading-snug mt-0.5">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
