'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, ShieldCheck, Clock, Check, X, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { chairRentals } from '@/lib/api';
import SiretVerificationSheet from '@/components/ui/SiretVerificationSheet';
import type { ApiChairRentalRequest, ApiChairRentalRequestMessage, ChairRentalRequestStatus } from '@/lib/types';

const SENT_STATUS_LABEL: Record<ChairRentalRequestStatus, { label: string; icon: typeof Clock; cls: string }> = {
  pending: { label: 'Demande envoyée — en attente de réponse', icon: Clock, cls: 'text-amber-600 bg-amber-50' },
  in_discussion: { label: 'Le salon vous a répondu', icon: MessageSquare, cls: 'text-blue-600 bg-blue-50' },
  accepted: { label: 'Demande acceptée !', icon: Check, cls: 'text-green-600 bg-green-50' },
  declined: { label: 'Demande refusée', icon: X, cls: 'text-red-500 bg-red-50' },
  cancelled: { label: 'Demande annulée', icon: X, cls: 'text-neutral-400 bg-neutral-100' },
};

/** Statuts où le coiffeur peut encore écrire au salon et retirer sa demande. */
const OPEN_STATUSES: ChairRentalRequestStatus[] = ['pending', 'in_discussion'];

function formatSentAt(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

/** CTA "Faire une demande" de la fiche fauteuil — gère l'auth, le blocage SIRET, et l'état "déjà demandé". */
export default function ChairRequestPanel({ rentalId, rentalTitle }: { rentalId: number; rentalTitle: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [existing, setExisting] = useState<ApiChairRentalRequest | null | undefined>(undefined);
  const [siretSheetOpen, setSiretSheetOpen] = useState(false);

  // ── Fil de discussion (le coiffeur recevait la notification "le salon vous a
  //    répondu" sans jamais pouvoir lire ni répondre) ──
  const [threadOpen, setThreadOpen] = useState(false);
  const [thread, setThread] = useState<ApiChairRentalRequestMessage[] | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState('');
  const [reply, setReply] = useState('');
  const [replying, setReplying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const siretVerified = user?.hairdresser_profile?.siret_verification_status === 'verified';

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExisting(null);
      return;
    }
    chairRentals.myRequestsSent()
      .then((reqs) => setExisting(reqs.find((r) => r.chair_rental_id === rentalId) ?? null))
      .catch(() => setExisting(null));
  }, [user, rentalId]);

  // Id de la demande dont le chargement a déjà été tenté — sans ce garde-fou,
  // un fil qui échoue à charger laisse `thread` à null et l'effet d'ouverture
  // automatique relance la requête en boucle.
  const attemptedRef = useRef<number | null>(null);

  const loadThread = useCallback(async (requestId: number) => {
    attemptedRef.current = requestId;
    setThreadLoading(true);
    setThreadError('');
    try {
      const full = await chairRentals.showRequest(requestId);
      setThread(full.messages ?? []);
    } catch (e) {
      setThreadError(e instanceof Error ? e.message : 'Impossible de charger la discussion.');
    } finally {
      setThreadLoading(false);
    }
  }, []);

  // Le salon a répondu : on ouvre et on charge le fil d'emblée, sinon la
  // notification reçue par le coiffeur pointe vers un écran qui n'en parle pas.
  useEffect(() => {
    if (existing && existing.status === 'in_discussion' && attemptedRef.current !== existing.id) {
      setThreadOpen(true);
      void loadThread(existing.id);
    }
  }, [existing, loadThread]);

  async function handleSend() {
    if (!user) { router.push('/pro/connexion'); return; }
    if (!siretVerified) { setSiretSheetOpen(true); return; }

    setSending(true);
    setError('');
    try {
      const req = await chairRentals.sendRequest(rentalId, message || undefined);
      setExisting(req);
      setThread([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l’envoi.');
    } finally {
      setSending(false);
    }
  }

  function toggleThread() {
    if (!existing) return;
    const next = !threadOpen;
    setThreadOpen(next);
    // Rouvrir après un échec doit pouvoir réessayer : on repasse par
    // loadThread tant qu'aucun fil n'a été récupéré.
    if (next && thread === null && !threadLoading) void loadThread(existing.id);
  }

  async function handleReply() {
    if (!existing || !reply.trim()) return;
    setReplying(true);
    setThreadError('');
    try {
      const created = await chairRentals.sendMessage(existing.id, reply.trim());
      setThread((prev) => [...(prev ?? []), created]);
      setReply('');
      // Le premier message fait passer la demande en discussion côté serveur.
      setExisting((prev) => prev && prev.status === 'pending' ? { ...prev, status: 'in_discussion' } : prev);
    } catch (e) {
      setThreadError(e instanceof Error ? e.message : 'Message non envoyé.');
    } finally {
      setReplying(false);
    }
  }

  async function handleCancel() {
    if (!existing) return;
    setCancelling(true);
    setThreadError('');
    try {
      await chairRentals.cancelRequest(existing.id);
      setExisting((prev) => prev ? { ...prev, status: 'cancelled' } : prev);
      setConfirmCancel(false);
      setThreadOpen(false);
    } catch (e) {
      setThreadError(e instanceof Error ? e.message : 'Annulation impossible.');
    } finally {
      setCancelling(false);
    }
  }

  if (existing === undefined) {
    return <div className="h-12 bg-neutral-100 rounded-xl animate-pulse" />;
  }

  if (existing) {
    const { label, icon: Icon, cls } = SENT_STATUS_LABEL[existing.status];
    const isOpen = OPEN_STATUSES.includes(existing.status);
    const messageCount = thread?.length ?? 0;

    return (
      <div className="space-y-2">
        <button
          onClick={toggleThread}
          className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-left ${cls}`}
          aria-expanded={threadOpen}
        >
          <Icon size={15} className="flex-shrink-0" />
          <span className="flex-1 min-w-0">{label}</span>
          {threadOpen ? <ChevronUp size={15} className="flex-shrink-0" /> : <ChevronDown size={15} className="flex-shrink-0" />}
        </button>

        {threadOpen && (
          <div className="bg-white border border-neutral-200 rounded-2xl p-3 space-y-3">
            {threadError && <p className="text-xs text-red-600">{threadError}</p>}

            {threadLoading ? (
              <div className="h-16 bg-neutral-100 rounded-xl animate-pulse" />
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {/* Message d'accompagnement écrit à l'envoi de la demande. */}
                {existing.message && (
                  <div className="bg-neutral-900 text-white rounded-2xl rounded-tr-sm px-3 py-2.5 max-w-[85%] ml-auto">
                    <p className="text-sm">{existing.message}</p>
                    <p className="text-[10px] text-neutral-400 mt-1">{formatSentAt(existing.created_at)}</p>
                  </div>
                )}

                {thread?.map((m) => (
                  <div
                    key={m.id}
                    className={`px-3 py-2.5 max-w-[85%] rounded-2xl ${
                      m.sender_type === 'hairdresser'
                        ? 'bg-neutral-900 text-white rounded-tr-sm ml-auto'
                        : 'bg-neutral-50 text-neutral-700 rounded-tl-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-line">{m.body}</p>
                    <p className="text-[10px] mt-1 text-neutral-400">
                      {m.sender_type === 'hairdresser' ? 'Vous' : 'Le salon'} · {formatSentAt(m.created_at)}
                    </p>
                  </div>
                ))}

                {!existing.message && messageCount === 0 && (
                  <p className="text-xs text-neutral-400 py-2">Aucun message pour l’instant.</p>
                )}
              </div>
            )}

            {isOpen && (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleReply(); }}
                    placeholder="Écrire au salon..."
                    className="flex-1 min-w-0 px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400"
                  />
                  <button
                    onClick={handleReply}
                    disabled={replying || !reply.trim()}
                    aria-label="Envoyer le message"
                    className="w-11 h-11 rounded-xl bg-neutral-900 text-white flex items-center justify-center disabled:opacity-40 flex-shrink-0"
                  >
                    <Send size={15} />
                  </button>
                </div>

                {confirmCancel ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConfirmCancel(false)}
                      className="flex-1 min-h-[44px] text-sm font-semibold text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors"
                    >
                      Garder ma demande
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="flex-1 min-h-[44px] text-sm font-semibold text-red-600 border border-red-100 bg-red-50 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      {cancelling ? 'Annulation...' : 'Confirmer'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmCancel(true)}
                    className="w-full min-h-[44px] flex items-center justify-center gap-1.5 text-sm font-semibold text-neutral-500 border border-neutral-200 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors"
                  >
                    <X size={13} />Annuler ma demande
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      {siretVerified && (
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Présentez-vous en quelques mots (optionnel)"
          rows={2}
          className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400"
        />
      )}
      <button
        onClick={handleSend}
        disabled={sending}
        className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white font-semibold py-3.5 rounded-2xl hover:bg-neutral-700 transition-colors disabled:opacity-50"
      >
        {siretVerified ? <Send size={15} /> : <ShieldCheck size={15} />}
        {sending ? 'Envoi...' : siretVerified ? 'Faire une demande' : 'Vérifier mon SIRET pour continuer'}
      </button>
      {!siretVerified && user && (
        <p className="text-[11px] text-neutral-400 text-center">SIRET vérifié requis pour louer un espace — anti-fraude entre professionnels.</p>
      )}

      <SiretVerificationSheet
        open={siretSheetOpen}
        onClose={() => setSiretSheetOpen(false)}
        onVerified={handleSend}
        action={`louer "${rentalTitle}"`}
      />
    </div>
  );
}
