// Partage natif d'un lien — LE mécanisme de partage de CHAIR (décision
// Julien 15/09/2026 : plus aucun visuel/template généré nulle part, « les
// gens savent que s'ils partagent, ils peuvent mettre ça en story »).
// La feuille de partage du téléphone fait le reste : story Instagram,
// WhatsApp, SMS, copier…

/**
 * Ouvre la feuille de partage native avec un texte + un lien.
 * Repli presse-papiers quand navigator.share n'existe pas (desktop).
 * À appeler DEPUIS un geste utilisateur (iOS refuse hors activation).
 */
export async function partagerLien(texte: string, url: string): Promise<'partage' | 'copie' | 'annule'> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ text: texte, url });
      return 'partage';
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'annule';
      // NotAllowedError ou autre : on retombe sur la copie.
    }
  }
  try {
    await navigator.clipboard.writeText(`${texte} ${url}`.trim());
    return 'copie';
  } catch {
    return 'annule';
  }
}
