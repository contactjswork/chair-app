'use client';

import { useEffect, useState } from 'react';
import { ShieldOff } from 'lucide-react';
import { moderation } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  /** `users.id` du coiffeur affiché — c'est cette clé que porte le blocage. */
  authorUserId: number;
  authorName: string;
}

/**
 * Bandeau affiché en haut de la fiche d'un compte que le visiteur a bloqué.
 *
 * App Store Review Guideline 1.2 : le blocage doit produire un effet réel.
 * Il retire déjà le compte du fil, de la recherche, de l'exploration, des
 * suggestions et des recommandations. Reste le cas de la fiche ouverte par
 * lien direct : on ne renvoie volontairement pas un 404 — CHAIR est un
 * annuaire professionnel public et casser un lien partagé serait
 * disproportionné. La fiche s'affiche donc, mais le visiteur voit qu'il a
 * bloqué ce compte et peut revenir sur sa décision sans aller la chercher
 * dans les réglages. C'est exactement ce que promet la feuille de
 * confirmation du blocage : « sa fiche reste consultable si tu ouvres son
 * lien directement ».
 *
 * L'état est résolu côté client depuis GET /my-blocks : la fiche est rendue
 * côté serveur sans jeton d'authentification, le serveur ne peut donc pas
 * connaître le visiteur.
 */
export default function BlockedProfileNotice({ authorUserId, authorName }: Props) {
  const { isAuthenticated } = useAuth();
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    moderation
      .blockedList()
      .then((list) => {
        if (!cancelled) setBlocked(list.some((b) => b.user_id === authorUserId));
      })
      // Silencieux : ce bandeau est une information de confort. Un échec
      // réseau ne doit pas afficher une erreur en tête de fiche.
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isAuthenticated, authorUserId]);

  async function handleUnblock() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await moderation.unblock(authorUserId);
      setBlocked(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Le déblocage a échoué. Réessaie dans un instant.');
      setBusy(false);
    }
  }

  if (!blocked) return null;

  return (
    <div className="mx-4 mb-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3.5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center flex-shrink-0">
          <ShieldOff size={16} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-neutral-900 leading-snug break-words">
            Tu as bloqué {authorName}
          </p>
          <p className="text-[12px] text-neutral-500 leading-relaxed mt-0.5">
            Ses publications n&apos;apparaissent plus dans ton fil, ta recherche ni tes
            recommandations. Tu vois cette fiche parce que tu as ouvert son lien directement.
          </p>
          {error && <p className="text-[12px] text-red-600 mt-2 leading-relaxed">{error}</p>}
          <button
            onClick={handleUnblock}
            disabled={busy}
            className="mt-2.5 min-h-[44px] -my-1 inline-flex items-center text-[13px] font-semibold text-neutral-900 underline underline-offset-4 decoration-neutral-300 hover:decoration-neutral-900 transition-colors disabled:opacity-40"
          >
            {busy ? 'Déblocage…' : 'Débloquer ce compte'}
          </button>
        </div>
      </div>
    </div>
  );
}
