'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { Check, Loader2, ShieldOff, X } from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';
import { moderation } from '@/lib/api';
import type { BlockedAccount } from '@/lib/api';
import { getStoredToken } from '@/lib/auth';
import { resolveMediaUrl } from '@/lib/types';

/**
 * Blocage d'un compte — exigence App Store Review Guideline 1.2 (UGC) :
 * "The ability to block abusive users from the service".
 *
 * La confirmation décrit l'effet RÉEL du blocage, ni plus ni moins :
 * les réalisations du compte bloqué disparaissent du fil. On n'annonce pas
 * une disparition totale que le backend ne garantit pas encore (recherche et
 * fiche par lien direct restent accessibles — voir UserBlockController).
 *
 * Réversible : `mode="unblock"` réutilise la même feuille pour débloquer.
 */

interface Props {
  userId: number;
  userName: string;
  mode?: 'block' | 'unblock';
  onClose: () => void;
  /** Prévient le parent une fois l'action confirmée côté serveur. */
  onDone?: (blocked: boolean) => void;
}

export default function BlockConfirmSheet({
  userId,
  userName,
  mode = 'block',
  onClose,
  onDone,
}: Props) {
  const [working, setWorking] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const isAuthed  = !!getStoredToken();
  const isBlocking = mode === 'block';

  async function confirm() {
    if (working) return; // anti double-tap
    setWorking(true);
    setError(null);
    try {
      if (isBlocking) await moderation.block(userId);
      else await moderation.unblock(userId);
      setDone(true);
      onDone?.(isBlocking);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.');
    } finally {
      setWorking(false);
    }
  }

  // Portalé dans body, au-dessus de la bottom nav (z-[60]) — même raison que
  // ReportSheet : le déclencheur peut vivre dans un `fixed z-50` (feed).
  if (typeof document === 'undefined') return null;

  return createPortal(
    <BottomSheet onClose={onClose} maxHeight="max-h-[80vh]" zIndexClassName="z-[120]">
      <div className="px-5 pb-8">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-100">
          <p className="text-[16px] font-bold text-neutral-900">
            {done
              ? isBlocking ? 'Compte bloqué' : 'Compte débloqué'
              : isBlocking ? `Bloquer ${userName} ?` : `Débloquer ${userName} ?`}
          </p>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-11 h-11 -mr-2 -mt-2 flex items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="pt-8 pb-2 text-center">
            <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center mx-auto mb-4">
              <Check size={22} className="stroke-white" />
            </div>
            <p className="text-[14px] text-neutral-800 font-semibold">
              {isBlocking
                ? `Tu ne verras plus les publications de ${userName} dans ton fil.`
                : `Les publications de ${userName} peuvent à nouveau apparaître dans ton fil.`}
            </p>
            <p className="text-[12px] text-neutral-500 mt-2">
              Tu peux revenir sur cette décision à tout moment depuis les règles de communauté.
            </p>
            <button
              onClick={onClose}
              className="w-full mt-6 min-h-[48px] rounded-2xl bg-neutral-900 text-white text-[14px] font-semibold hover:bg-neutral-700 transition-colors"
            >
              Fermer
            </button>
          </div>
        ) : (
          <div className="pt-5">
            <div className="flex items-start gap-3 bg-neutral-50 rounded-2xl px-4 py-3.5">
              <ShieldOff size={16} className="text-neutral-400 mt-0.5 flex-shrink-0" />
              <div className="text-[13px] text-neutral-600 leading-relaxed space-y-2">
                {isBlocking ? (
                  <>
                    <p>Si tu bloques ce compte :</p>
                    <ul className="space-y-1.5">
                      <li className="flex gap-2">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-neutral-300 flex-shrink-0" />
                        <span>ses réalisations n&apos;apparaîtront plus dans ton fil ni dans tes suggestions&nbsp;;</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-neutral-300 flex-shrink-0" />
                        <span>{userName} n&apos;est pas prévenu&nbsp;;</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-neutral-300 flex-shrink-0" />
                        <span>sa fiche reste consultable si tu ouvres son lien directement.</span>
                      </li>
                    </ul>
                    <p className="text-neutral-400">
                      Le blocage ne remplace pas un signalement&nbsp;: si le contenu enfreint nos
                      règles, signale-le aussi pour que notre équipe le traite.
                    </p>
                  </>
                ) : (
                  <p>
                    Les réalisations de {userName} pourront à nouveau apparaître dans ton fil
                    et dans tes suggestions.
                  </p>
                )}
              </div>
            </div>

            {!isAuthed && (
              <p className="mt-4 text-[12px] text-neutral-500 bg-neutral-50 rounded-xl px-3 py-2.5">
                Connecte-toi pour bloquer un compte.
              </p>
            )}

            {error && (
              <p className="mt-4 text-[13px] text-red-600 bg-red-50 rounded-xl px-3 py-2.5">{error}</p>
            )}

            <button
              onClick={confirm}
              disabled={working || !isAuthed}
              className="w-full mt-5 min-h-[48px] rounded-2xl bg-neutral-900 text-white text-[14px] font-semibold hover:bg-neutral-700 transition-colors disabled:opacity-30 flex items-center justify-center gap-2"
            >
              {working ? <Loader2 size={16} className="animate-spin" /> : null}
              {working ? 'Un instant…' : isBlocking ? 'Bloquer ce compte' : 'Débloquer ce compte'}
            </button>
            <button
              onClick={onClose}
              className="w-full mt-2.5 min-h-[48px] rounded-2xl bg-neutral-100 text-neutral-700 text-[14px] font-semibold hover:bg-neutral-200 transition-colors"
            >
              Annuler
            </button>
          </div>
        )}
      </div>
    </BottomSheet>,
    document.body
  );
}

// ── Liste des comptes bloqués ─────────────────────────────────────────

/**
 * Gestion des comptes bloqués — le blocage doit rester réversible sans
 * repasser par la fiche de la personne (App Store 1.2). Affichée sur
 * /app/regles-communaute ; à relayer aussi depuis les réglages du compte
 * (/app/compte, hors périmètre de ce lot).
 */
type BlockedListState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'ready'; items: BlockedAccount[] }
  | { status: 'error'; message: string };

export function BlockedAccountsList() {
  // Un seul état : le token n'est lisible que côté navigateur, le lire pendant
  // le rendu produirait une divergence d'hydratation (SSR = déconnecté).
  const [state, setState]   = useState<BlockedListState>({ status: 'loading' });
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!getStoredToken()) {
        if (!cancelled) setState({ status: 'anonymous' });
        return;
      }
      try {
        const list = await moderation.blockedList();
        if (!cancelled) setState({ status: 'ready', items: list });
      } catch (e) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: e instanceof Error ? e.message : 'Impossible de charger la liste.',
          });
        }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  async function unblock(userId: number) {
    if (busyId !== null) return; // anti double-tap
    setBusyId(userId);
    try {
      await moderation.unblock(userId);
      setState((prev) =>
        prev.status === 'ready'
          ? { status: 'ready', items: prev.items.filter((i) => i.user_id !== userId) }
          : prev
      );
    } catch (e) {
      setState({
        status: 'error',
        message: e instanceof Error ? e.message : 'Une erreur est survenue.',
      });
    } finally {
      setBusyId(null);
    }
  }

  if (state.status === 'anonymous') {
    return (
      <p className="text-[13px] text-neutral-500">
        Connecte-toi pour voir et gérer les comptes que tu as bloqués.
      </p>
    );
  }

  if (state.status === 'loading') {
    return (
      <p className="text-[13px] text-neutral-400 flex items-center gap-2">
        <Loader2 size={14} className="animate-spin" /> Chargement…
      </p>
    );
  }

  if (state.status === 'error') {
    return (
      <p className="text-[13px] text-red-600 bg-red-50 rounded-xl px-3 py-2.5">{state.message}</p>
    );
  }

  const items = state.items;

  return (
    <div>
      {items.length === 0 ? (
        <p className="text-[13px] text-neutral-500">Tu n&apos;as bloqué aucun compte.</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {items.map((b) => {
            const avatar = resolveMediaUrl(b.avatar);
            return (
              <li key={b.user_id} className="flex items-center gap-3 py-3">
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-100 flex-shrink-0 flex items-center justify-center">
                  {avatar ? (
                    <Image src={avatar} alt={b.name} fill className="object-cover" sizes="40px" />
                  ) : (
                    <span className="text-[13px] font-bold text-neutral-400">
                      {b.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {b.slug ? (
                    <Link href={`/app/coiffeur/${b.slug}`} className="text-[14px] font-semibold text-neutral-900 truncate block">
                      {b.name}
                    </Link>
                  ) : (
                    <p className="text-[14px] font-semibold text-neutral-900 truncate">{b.name}</p>
                  )}
                  <p className="text-[11px] text-neutral-400">Bloqué</p>
                </div>
                <button
                  onClick={() => unblock(b.user_id)}
                  disabled={busyId === b.user_id}
                  className="min-h-[44px] px-4 rounded-full bg-neutral-100 text-neutral-700 text-[13px] font-semibold hover:bg-neutral-200 transition-colors disabled:opacity-40 flex-shrink-0"
                >
                  {busyId === b.user_id ? '…' : 'Débloquer'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
