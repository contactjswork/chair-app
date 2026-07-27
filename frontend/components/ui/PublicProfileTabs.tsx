'use client';

import { useState, type ReactNode } from 'react';
import HideOnScrollBar from '@/components/layout/HideOnScrollBar';

export interface PublicProfileTab {
  key: string;
  label: string;
  count?: number;
  content: ReactNode;
}

interface Props {
  tabs: PublicProfileTab[];
  defaultTab?: string;
  /** CTA sticky (réservation) — masqué quand l'onglet `hideStickyCtaOnTab` est actif pour éviter un doublon avec le bouton Réserver déjà présent dans cet onglet. */
  stickyCta?: ReactNode;
  hideStickyCtaOnTab?: string;
}

// Navigation par onglets — une seule route, changement instantané (tout le
// contenu est déjà en props, pas de nouvel appel réseau). Barre sticky sous
// le bloc identité, se masque au scroll vers le bas comme le reste de l'app.
export default function PublicProfileTabs({ tabs, defaultTab, stickyCta, hideStickyCtaOnTab }: Props) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.key);
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div className="mt-2">
      <HideOnScrollBar>
        <div className="flex px-4 md:px-0 max-w-2xl mx-auto">
          {tabs.map((tab) => {
            const isActive = tab.key === active;
            return (
              <button
                key={tab.key}
                onClick={() => setActive(tab.key)}
                className={`relative flex-1 flex items-center justify-center gap-1.5 py-3 text-[13px] font-semibold transition-colors ${
                  isActive ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'
                }`}
              >
                {tab.label}
                {tab.count != null && tab.count > 0 && (
                  <span className={`text-[11px] font-normal ${isActive ? 'text-neutral-400' : 'text-neutral-300'}`}>
                    {tab.count}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-neutral-900 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </HideOnScrollBar>

      <div className="pt-6">
        {activeTab?.content}
      </div>

      {stickyCta && active !== hideStickyCtaOnTab && stickyCta}
    </div>
  );
}
