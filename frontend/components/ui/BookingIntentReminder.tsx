'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { QrCode, X } from 'lucide-react';
import { bookingIntents } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Rappel de faire scanner le QR après un départ vers un agenda externe.
 *
 * Le problème qu'il résout : quand un client réserve chez un coiffeur salarié,
 * la réservation se fait sur l'agenda du salon, hors de CHAIR. La personne
 * disparaît alors du radar — pas de rendez-vous enregistré, donc pas
 * d'invitation à noter, donc aucune réputation possible pour ce coiffeur.
 *
 * Ce qu'on ne fait PAS : demander au client s'il a réservé, ni pour quand.
 * Lui faire remplir la comptabilité de CHAIR est exactement la friction à
 * éviter, et sa réponse serait déclarative — donc peu fiable, et incapable de
 * distinguer un rendez-vous pris avec un COLLÈGUE du même salon, puisque
 * l'agenda est commun.
 *
 * Ce qu'on fait : une phrase, une fois, qui prépare le seul geste qui prouve
 * vraiment la visite — le scan du QR sur place. La carte disparaît d'elle-même
 * dès que ce scan a lieu (résolution côté serveur), sans que le client ait
 * jamais rien à confirmer.
 */
export default function BookingIntentReminder({ className = '' }: { className?: string }) {
  const { user, isLoading } = useAuth();
  const [intent, setIntent] = useState<{ id: number; hairdresser_name: string | null; hairdresser_slug: string | null } | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (isLoading || !user || user.role !== 'client') return;
    let cancelled = false;
    bookingIntents.pending()
      .then((d) => { if (!cancelled) setIntent(d.intent); })
      // Silencieux : l'absence de rappel est le cas normal, et un rappel qui
      // ne s'affiche pas ne prive l'utilisateur de rien d'essentiel.
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user, isLoading]);

  if (!intent || hidden) return null;

  async function dismiss() {
    setHidden(true);
    if (intent) {
      try { await bookingIntents.dismiss(intent.id); } catch { /* best-effort */ }
    }
  }

  const name = intent.hairdresser_name ?? 'ton coiffeur';

  return (
    <div className={`relative rounded-3xl bg-neutral-900 px-5 py-4 pr-11 ${className}`}>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Ne plus afficher ce rappel"
        className="absolute top-1 right-1 w-11 h-11 flex items-center justify-center text-white/40 hover:text-white/80 active:scale-90 transition-all"
      >
        <X size={15} />
      </button>

      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
          <QrCode size={16} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-white leading-snug">
            Rendez-vous chez {name} ?
          </p>
          <p className="text-[12.5px] text-white/55 leading-relaxed mt-1">
            Demande-lui son QR code sur place : ton avis sera certifié, et ça compte
            beaucoup plus pour lui.
          </p>
          {intent.hairdresser_slug && (
            <Link
              href={`/app/coiffeur/${intent.hairdresser_slug}`}
              className="inline-block mt-2.5 text-[12.5px] font-semibold text-white underline underline-offset-4 decoration-white/30"
            >
              Voir son profil
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
