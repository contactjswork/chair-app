'use client';

import { useRouter } from 'next/navigation';
import { Check, BarChart3, Camera, Film, Pin, TrendingUp, BadgeCheck } from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';

interface Props {
  open: boolean;
  onClose: () => void;
}

const POINTS = [
  { icon: BarChart3,  label: 'Analytics avancées' },
  { icon: Camera,     label: 'Stories 24h' },
  { icon: Film,       label: 'Vidéos' },
  { icon: Pin,        label: 'Posts épinglés' },
  { icon: TrendingUp, label: 'Boost local' },
  { icon: BadgeCheck, label: 'Badge CHAIR+' },
];

/**
 * Bottom sheet réutilisable d'upsell CHAIR+ — même coquille que les autres
 * sheets de l'app (voir BottomSheet.tsx). But : un rappel court et sobre des
 * avantages, sans dupliquer toute la page /pro/chair-plus, avec un seul CTA
 * qui y renvoie. À déclencher depuis n'importe quel endroit pertinent de
 * l'app (la page CHAIR+ elle-même, une carte d'upsell, un mur de fonctionnalité
 * verrouillée...).
 */
export default function PremiumUpsellSheet({ open, onClose }: Props) {
  const router = useRouter();

  if (!open) return null;

  function handleCta() {
    onClose();
    router.push('/pro/chair-plus');
  }

  return (
    <BottomSheet onClose={onClose} maxHeight="max-h-[70vh]">
      <div className="px-6 pb-8 pt-1">
        <h2 className="text-xl font-black text-neutral-900 text-center mb-1.5">Passez à CHAIR+</h2>
        <p className="text-sm text-neutral-500 text-center leading-relaxed mb-6 max-w-xs mx-auto">
          Analysez précisément votre activité et augmentez votre visibilité.
        </p>

        <ul className="space-y-2.5 mb-7">
          {POINTS.map((p) => (
            <li key={p.label} className="flex items-center gap-3 bg-neutral-50 rounded-xl px-3.5 py-2.5">
              <div className="w-7 h-7 rounded-lg bg-neutral-900 flex items-center justify-center flex-shrink-0">
                <Check size={12} className="text-white" strokeWidth={3} />
              </div>
              <p.icon size={15} className="text-neutral-400 flex-shrink-0" strokeWidth={1.5} />
              <span className="text-[13px] font-semibold text-neutral-900">{p.label}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={handleCta}
          className="w-full bg-neutral-900 text-white font-bold py-4 rounded-2xl text-[15px] hover:bg-neutral-700 transition-colors"
        >
          Essayer gratuitement pendant 30 jours
        </button>
      </div>
    </BottomSheet>
  );
}
