'use client';

import { ExternalLink, Sparkles } from 'lucide-react';
import type { AppContext } from '@/lib/appContext';

interface Props {
  /** Nom commercial du plan concerné, tel qu'il s'affiche ailleurs (« CHAIR+ », « CHAIR Business »). */
  planName: string;
  /** Contexte d'exécution résolu — sert uniquement à expliquer le cas 'unknown'. */
  context: AppContext;
}

/**
 * Écran affiché à la place d'une page d'abonnement quand le binaire courant
 * ne doit pas présenter d'interface d'achat numérique.
 *
 * Pourquoi : CHAIR+ et CHAIR Business sont des abonnements NUMÉRIQUES vendus
 * via Stripe. La règle App Store 3.1.1(a) interdit, hors storefront américain
 * — donc en France — qu'une app contienne « des boutons, liens externes ou
 * appels à l'action dirigeant vers un mécanisme d'achat autre que l'achat
 * intégré ». CHAIR CLIENT et CHAIR PRO partageant le même site distant, un
 * professionnel connecté dans le binaire CLIENT pouvait atteindre ces pages.
 *
 * Ce n'est PAS un contournement d'App Review : le comportement ne dépend que
 * de l'identité du binaire, il est identique pour tout le monde — reviewer
 * compris — et rien n'est réactivé après validation. La sortie proposée mène
 * à l'espace professionnel, pas à un tunnel de paiement : aucun prix, aucun
 * verbe d'achat.
 */
export default function SubscriptionElsewhereState({ planName, context }: Props) {
  return (
    <div className="max-w-sm mx-auto px-6 py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-5">
        <Sparkles size={22} className="text-neutral-400" strokeWidth={1.5} />
      </div>
      <h1 className="text-xl font-black text-neutral-900 mb-2">
        {planName} se gère dans l&apos;espace professionnel
      </h1>
      <p className="text-sm text-neutral-500 leading-relaxed mb-3">
        La souscription, le tarif et la résiliation de {planName} se trouvent dans l&apos;espace
        professionnel CHAIR PRO, sur le web. Ils ne sont pas disponibles depuis cette application.
      </p>
      <p className="text-sm text-neutral-500 leading-relaxed mb-7">
        Si vous êtes déjà abonné, votre accès reste actif — rien n&apos;est interrompu ici.
      </p>

      <a
        href="/pro"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full min-h-[48px] flex items-center justify-center gap-2 bg-neutral-900 text-white font-bold py-4 rounded-2xl text-[15px] hover:bg-neutral-700 active:scale-[0.98] transition-all"
      >
        <ExternalLink size={15} />
        Ouvrir l&apos;espace professionnel
      </a>
      <p className="text-[11px] text-neutral-400 mt-3">S&apos;ouvre dans votre navigateur.</p>

      {/* Binaire natif sans marqueur d'identité : compilé avant l'ajout de
          `appendUserAgent`. On le dit plutôt que de laisser un professionnel
          de CHAIR PRO devant un écran inexpliqué (voir lib/appContext.ts). */}
      {context === 'unknown' && (
        <p className="text-[11px] text-neutral-400 leading-relaxed mt-6 pt-6 border-t border-neutral-100">
          Cette version de l&apos;application n&apos;est pas identifiée. Si vous utilisez CHAIR PRO,
          installez la dernière mise à jour pour retrouver la gestion de l&apos;abonnement directement
          dans l&apos;app.
        </p>
      )}
    </div>
  );
}
