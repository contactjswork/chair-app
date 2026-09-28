'use client';

import { ChevronRight, LifeBuoy, Shield, FileText, Scale } from 'lucide-react';
import LienSite from '@/components/ui/LienSite';
import { CARTE, MICRO_TITRE } from '@/lib/proStyle';

// Bloc « Aide & informations » des réglages — le même dans les 3 apps.
// Apple exige la politique de confidentialité accessible DANS l'app
// (5.1.1) ; ces pages s'ouvrent depuis le site (feuille Safari en natif).
const LIGNES = [
  { path: '/contact',          label: 'Aide & contact',              icon: LifeBuoy },
  { path: '/confidentialite',  label: 'Confidentialité',             icon: Shield },
  { path: '/cgu',              label: "Conditions d'utilisation",    icon: FileText },
  { path: '/mentions-legales', label: 'Mentions légales',            icon: Scale },
];

export default function ReglagesLegaux({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <p className={`${MICRO_TITRE} mb-2 px-1`}>Aide &amp; informations</p>
      <div className={`${CARTE} divide-y divide-neutral-50 overflow-hidden`}>
        {LIGNES.map(({ path, label, icon: Icon }) => (
          <LienSite
            key={path}
            path={path}
            className="flex items-center gap-3.5 px-4 py-3.5 active:bg-neutral-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
              <Icon size={16} className="text-neutral-600" strokeWidth={1.5} />
            </div>
            <span className="flex-1 text-sm font-medium text-neutral-900">{label}</span>
            <ChevronRight size={16} className="text-neutral-300 flex-shrink-0" />
          </LienSite>
        ))}
      </div>
    </div>
  );
}
