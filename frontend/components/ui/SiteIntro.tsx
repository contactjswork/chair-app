'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Rideau d'ouverture du site vitrine.
 *
 * Un panneau sombre couvre la page, le logotype s'y pose, puis le panneau se
 * lève et découvre le site. Le contraste fait tout le travail : on passe du
 * noir au blanc, ce qui donne au site l'air de s'ouvrir plutôt que de se
 * charger.
 *
 * Une seule fois par chargement de page — arrivée ou rafraîchissement. Les
 * navigations internes ne le rejouent pas : un rideau qui retombe à chaque
 * clic transforme un site en diaporama.
 *
 * Volontairement absent de /app, /pro et /admin : l'app et l'espace pro ont
 * déjà leur propre ouverture (SplashScreen), et l'admin est un outil de
 * travail — on n'y met pas de mise en scène.
 *
 * Rendu dès le HTML initial (l'état de départ est « visible »), sinon la page
 * apparaîtrait une fraction de seconde avant que le rideau ne tombe dessus —
 * exactement l'effet inverse de celui recherché.
 */

let hasPlayedOnce = false;

const WORD = 'CHAIR';
const LETTER_STAGGER_MS = 50;
/** Début de la levée du rideau. */
const HOLD_MS = 820;
/** Démontage complet. */
const TOTAL_MS = 1520;

export default function SiteIntro() {
  const pathname = usePathname();
  const [leaving, setLeaving] = useState(false);
  const [done, setDone] = useState(hasPlayedOnce);

  useEffect(() => {
    if (hasPlayedOnce) return;
    const t1 = setTimeout(() => setLeaving(true), HOLD_MS);
    const t2 = setTimeout(() => {
      hasPlayedOnce = true;
      setDone(true);
    }, TOTAL_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Surfaces qui ont leur propre ouverture, ou qui n'en veulent pas.
  if (pathname?.startsWith('/app') || pathname?.startsWith('/pro') || pathname?.startsWith('/admin')) {
    return null;
  }

  if (done) return null;

  return (
    <div className="chair-intro" data-leaving={leaving} role="status" aria-label="Ouverture de CHAIR">
      <div className="chair-intro-mark">
        <div className="chair-intro-word">
          {WORD.split('').map((letter, i) => (
            <span key={i} className="chair-intro-mask" aria-hidden="true">
              <span className="chair-intro-letter" style={{ animationDelay: `${i * LETTER_STAGGER_MS}ms` }}>
                {letter}
              </span>
            </span>
          ))}
        </div>
        <span className="chair-intro-rule" aria-hidden="true" />
      </div>

      <style>{`
        .chair-intro {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a0a0a;
          transform: translateY(0);
          /* Une levée de rideau doit partir vite et finir en douceur : sans ça
             elle donne l'impression de glisser au lieu de se lever. */
          transition: transform 620ms cubic-bezier(0.76, 0, 0.24, 1);
          will-change: transform;
        }
        .chair-intro[data-leaving='true'] { transform: translateY(-100%); }

        .chair-intro-mark {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 13px;
          transition: opacity 320ms ease, transform 620ms cubic-bezier(0.76, 0, 0.24, 1);
        }
        /* Le logotype s'efface un peu avant le rideau : il ne doit pas partir
           collé au bord de l'écran. */
        .chair-intro[data-leaving='true'] .chair-intro-mark {
          opacity: 0;
          transform: translateY(14px);
        }

        .chair-intro-word { display: flex; align-items: baseline; }

        .chair-intro-mask {
          display: inline-block;
          overflow: hidden;
          line-height: 1;
          padding-bottom: 0.06em;
          /* La chasse serrée se joue ENTRE les masques, jamais à l'intérieur :
             un letter-spacing négatif sur la lettre réduit sa boîte sous la
             largeur du glyphe, et overflow:hidden lui rogne le bord droit. */
          margin-right: -0.035em;
        }
        .chair-intro-mask:last-of-type { margin-right: 0; }
        .chair-intro-letter {
          display: inline-block;
          font-size: 46px;
          font-weight: 800;
          color: #ffffff;
          transform: translateY(115%);
          animation: chairIntroRise 720ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes chairIntroRise { to { transform: translateY(0); } }

        .chair-intro-rule {
          display: block;
          width: 72px;
          height: 1px;
          background: rgba(255, 255, 255, 0.22);
          transform: scaleX(0);
          animation: chairIntroRule 560ms cubic-bezier(0.16, 1, 0.3, 1) 300ms forwards;
        }
        @keyframes chairIntroRule { to { transform: scaleX(1); } }

        @media (min-width: 768px) {
          .chair-intro-letter { font-size: 60px; }
          .chair-intro-rule { width: 92px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .chair-intro-letter,
          .chair-intro-rule {
            animation: none;
            transform: none;
          }
          .chair-intro { transition: opacity 200ms ease; }
          .chair-intro[data-leaving='true'] { transform: none; opacity: 0; }
          .chair-intro .chair-intro-mark { transition: opacity 200ms ease; }
          .chair-intro[data-leaving='true'] .chair-intro-mark { transform: none; }
        }
      `}</style>
    </div>
  );
}
