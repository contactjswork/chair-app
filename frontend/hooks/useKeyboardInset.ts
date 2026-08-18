'use client';

import { useEffect, useState } from 'react';

/**
 * Hauteur actuelle du clavier virtuel en px (0 si fermé). S'appuie sur
 * l'API VisualViewport — supportée par Safari/WKWebView iOS et Chrome
 * Android, donc fiable dans la WebView Capacitor sans plugin natif — plutôt
 * que sur `dvh`/le scroll natif seuls : retour de Julien, le CTA restait
 * sous le clavier tant qu'il fallait le refermer pour continuer. Combiné à
 * un CTA `position: fixed; bottom: <inset>` (voir QuestionScreen.tsx), ça le
 * garde visible juste au-dessus du clavier pendant la frappe.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function update() {
      // window.innerHeight - hauteur visible - décalage haut = ce qui est
      // couvert en bas (le clavier), jamais négatif.
      const offset = window.innerHeight - vv!.height - vv!.offsetTop;
      setInset(Math.max(0, Math.round(offset)));
    }

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return inset;
}
