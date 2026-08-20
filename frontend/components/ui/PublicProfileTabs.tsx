'use client';

import { useRef, useState, type ReactNode } from 'react';

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
// le bloc identité, toujours visible une fois collée (contrairement à la
// barre de recherche de l'accueil) : la masquer au scroll créait un flash
// où elle glissait par-dessus les boutons S'abonner/Sauvegarder juste au-dessus.
export default function PublicProfileTabs({ tabs, defaultTab, stickyCta, hideStickyCtaOnTab }: Props) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.key);
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];
  const anchorRef = useRef<HTMLDivElement>(null);

  // Changer d'onglet alors qu'on est descendu loin dans le portfolio faisait
  // atterrir en plein milieu d'un onglet plus court, parfois sous le pied de
  // page. On se recale sur la barre uniquement si elle est déjà collée en
  // haut — sinon on ne touche pas au scroll de l'utilisateur.
  function selectTab(key: string) {
    setActive(key);
    const anchor = anchorRef.current;
    if (!anchor) return;
    if (anchor.getBoundingClientRect().top < 0) {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <div className="mt-1">
      <div ref={anchorRef} className="scroll-mt-[calc(3.5rem+env(safe-area-inset-top,0px)+4px)]" />
      <div className="sticky top-content-mobile md:top-[60px] z-40 bg-white border-b border-neutral-100">
        {/* overflow-x-auto : à 5 onglets sur petit écran, la barre défile au
            lieu d'écraser les libellés — chaque onglet garde sa largeur utile
            (min-w-fit) et s'étire (flex-1) quand la place suffit. */}
        <div role="tablist" className="flex px-2 md:px-0 max-w-2xl mx-auto overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = tab.key === active;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => selectTab(tab.key)}
                className={`relative flex-1 min-w-fit px-3 flex items-center justify-center gap-1.5 h-12 text-[13px] font-semibold whitespace-nowrap transition-colors ${
                  isActive ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'
                }`}
              >
                {tab.label}
                {tab.count != null && tab.count > 0 && (
                  <span className={`text-[11px] font-normal tabular-nums ${isActive ? 'text-neutral-400' : 'text-neutral-300'}`}>
                    {tab.count}
                  </span>
                )}
                {/* Le trait actif descend sur le filet du conteneur sticky
                    (-bottom-px) : il se lit comme un curseur sur un rail, pas
                    comme un soulignement flottant au-dessus d'une bordure. */}
                <span
                  className={`absolute -bottom-px left-2 right-2 h-[2px] rounded-full bg-neutral-900 transition-opacity duration-200 ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-7">
        {activeTab?.content}
      </div>

      {stickyCta && active !== hideStickyCtaOnTab && stickyCta}
    </div>
  );
}
