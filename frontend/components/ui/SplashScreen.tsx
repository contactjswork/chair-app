'use client';

import { useEffect, useState } from 'react';

interface SplashScreenProps {
  pro?: boolean;
}

/**
 * Écran d'ouverture de l'app.
 *
 * L'identité CHAIR est un logotype pur — pas d'icône, pas de symbole. Toute
 * l'animation repose donc sur la typographie : les cinq lettres montent
 * l'une après l'autre derrière un masque, un filet se trace sous le mot, et
 * l'ensemble s'efface. Rien qui tourne, rien qui rebondit : la marque est
 * sobre, son ouverture doit l'être.
 *
 * Durée totale 1,5 s, dont 1 s de présence réelle. C'est court volontairement :
 * un écran d'ouverture qu'on remarque est un écran d'ouverture trop long.
 *
 * Ne joue qu'une fois par session d'app — sinon l'animation rejoue à chaque
 * aller-retour vers /connexion, et l'app semble redémarrer alors qu'on vient
 * simplement de revenir en arrière.
 *
 * `prefers-reduced-motion` est respecté : les lettres sont posées d'emblée,
 * seul un fondu court subsiste. Une animation d'entrée ne doit jamais être
 * une épreuve pour qui a désactivé les mouvements.
 */

let hasPlayedOnce = false;
/**
 * Instant du tout premier montage. Le layout de l'app rend ce composant à
 * plusieurs endroits de l'arbre selon l'état d'authentification : quand
 * celle-ci se résout, React démonte l'instance et en remonte une neuve. Sans
 * cette référence, l'animation repartait de zéro en plein milieu — les
 * lettres redescendaient puis remontaient. On mesure donc le temps écoulé
 * depuis le début réel, et l'animation reprend où elle en était.
 */
let startedAt: number | null = null;

const WORD = 'CHAIR';
/** Décalage entre deux lettres — assez pour lire la vague, pas pour attendre. */
const LETTER_STAGGER_MS = 55;
/** Début de la sortie. */
const HOLD_MS = 1000;
/** Démontage complet. */
const TOTAL_MS = 1500;

export default function SplashScreen({ pro = false }: SplashScreenProps) {
  // Calculé une seule fois par instance, et jamais pendant le rendu serveur :
  // au premier rendu client (l'hydratation) le chronomètre démarre, donc la
  // valeur vaut 0 des deux côtés — aucun écart d'hydratation.
  const [offset] = useState(() => {
    if (typeof window === 'undefined') return 0;
    if (hasPlayedOnce) return TOTAL_MS;
    if (startedAt === null) startedAt = Date.now();
    return Date.now() - startedAt;
  });

  const [leaving, setLeaving] = useState(offset >= HOLD_MS);
  const [done, setDone] = useState(hasPlayedOnce || offset >= TOTAL_MS);

  useEffect(() => {
    if (hasPlayedOnce || offset >= TOTAL_MS) return;
    const t1 = setTimeout(() => setLeaving(true), Math.max(0, HOLD_MS - offset));
    const t2 = setTimeout(() => {
      hasPlayedOnce = true;
      setDone(true);
    }, Math.max(0, TOTAL_MS - offset));
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [offset]);

  if (done) return null;

  const palette = pro
    ? { bg: '#0a0a0a', fg: '#ffffff', sub: 'rgba(255,255,255,0.45)', rule: 'rgba(255,255,255,0.20)' }
    : { bg: '#ffffff', fg: '#111111', sub: 'rgba(0,0,0,0.45)',       rule: 'rgba(0,0,0,0.14)' };

  return (
    <div
      className="chair-splash"
      data-leaving={leaving}
      role="status"
      aria-label="Chargement de CHAIR"
      style={
        {
          '--sp-bg': palette.bg,
          '--sp-fg': palette.fg,
          '--sp-sub': palette.sub,
          '--sp-rule': palette.rule,
          // Retard négatif appliqué à toutes les animations : après un
          // remontage, chacune reprend à l'instant où elle en était.
          '--sp-offset': `${offset}ms`,
        } as React.CSSProperties
      }
    >
      <div className="chair-splash-mark">
        <div className="chair-splash-word">
          {WORD.split('').map((letter, i) => (
            <span key={i} className="chair-splash-mask" aria-hidden="true">
              <span
                className="chair-splash-letter"
                style={{ animationDelay: `calc(${i * LETTER_STAGGER_MS}ms - var(--sp-offset))` }}
              >
                {letter}
              </span>
            </span>
          ))}
          {pro && (
            <span className="chair-splash-pro" aria-hidden="true">
              PRO
            </span>
          )}
        </div>

        <span className="chair-splash-rule" aria-hidden="true" />

        {pro && <span className="chair-splash-sub">Espace professionnel</span>}
      </div>

      <style>{`
        .chair-splash {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--sp-bg);
          opacity: 1;
          transition: opacity 460ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        .chair-splash[data-leaving='true'] { opacity: 0; }

        .chair-splash-mark {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          transition: transform 460ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        /* L'ensemble s'ouvre très légèrement en partant — le regard est
           accompagné vers l'app plutôt que lâché d'un coup. */
        .chair-splash[data-leaving='true'] .chair-splash-mark { transform: scale(1.045); }

        .chair-splash-word {
          display: flex;
          align-items: baseline;
        }

        /* Chaque lettre monte derrière son propre masque : c'est ce qui donne
           l'impression qu'elles se posent, et non qu'elles apparaissent. */
        .chair-splash-mask {
          display: inline-block;
          overflow: hidden;
          line-height: 1;
          padding-bottom: 0.06em;
          /* La chasse serrée se joue ENTRE les masques, jamais à l'intérieur :
             un letter-spacing négatif sur la lettre réduit sa boîte sous la
             largeur du glyphe, et overflow:hidden lui rogne le bord droit —
             le R en faisait les frais. */
          margin-right: -0.035em;
        }
        .chair-splash-mask:last-of-type { margin-right: 0; }
        .chair-splash-letter {
          display: inline-block;
          font-size: 42px;
          font-weight: 800;
          color: var(--sp-fg);
          transform: translateY(115%);
          animation: chairSplashRise 760ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes chairSplashRise { to { transform: translateY(0); } }

        .chair-splash-pro {
          margin-left: 11px;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.16em;
          color: var(--sp-sub);
          opacity: 0;
          animation: chairSplashFade 520ms ease calc(440ms - var(--sp-offset)) forwards;
        }

        /* Le filet se trace après les lettres : il ponctue, il n'accompagne pas. */
        .chair-splash-rule {
          display: block;
          width: 68px;
          height: 1px;
          background: var(--sp-rule);
          transform: scaleX(0);
          animation: chairSplashRule 600ms cubic-bezier(0.16, 1, 0.3, 1) calc(340ms - var(--sp-offset)) forwards;
        }
        @keyframes chairSplashRule { to { transform: scaleX(1); } }

        .chair-splash-sub {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: var(--sp-sub);
          opacity: 0;
          animation: chairSplashFade 520ms ease calc(540ms - var(--sp-offset)) forwards;
        }

        @keyframes chairSplashFade { to { opacity: 1; } }

        @media (prefers-reduced-motion: reduce) {
          .chair-splash-letter,
          .chair-splash-rule,
          .chair-splash-pro,
          .chair-splash-sub {
            animation: none;
            transform: none;
            opacity: 1;
          }
          .chair-splash,
          .chair-splash .chair-splash-mark { transition-duration: 200ms; }
          .chair-splash[data-leaving='true'] .chair-splash-mark { transform: none; }
        }
      `}</style>
    </div>
  );
}
