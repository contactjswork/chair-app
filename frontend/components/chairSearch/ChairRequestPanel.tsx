'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, ShieldCheck, Clock, Check, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { chairRentals } from '@/lib/api';
import SiretVerificationSheet from '@/components/ui/SiretVerificationSheet';
import type { ApiChairRentalRequest, ChairRentalRequestStatus } from '@/lib/types';

const SENT_STATUS_LABEL: Record<ChairRentalRequestStatus, { label: string; icon: typeof Clock; cls: string }> = {
  pending: { label: 'Demande envoyée — en attente de réponse', icon: Clock, cls: 'text-amber-600 bg-amber-50' },
  in_discussion: { label: 'Le salon vous a répondu', icon: Clock, cls: 'text-blue-600 bg-blue-50' },
  accepted: { label: 'Demande acceptée !', icon: Check, cls: 'text-green-600 bg-green-50' },
  declined: { label: 'Demande refusée', icon: X, cls: 'text-red-500 bg-red-50' },
  cancelled: { label: 'Demande annulée', icon: X, cls: 'text-neutral-400 bg-neutral-100' },
};

/** CTA "Faire une demande" de la fiche fauteuil — gère l'auth, le blocage SIRET, et l'état "déjà demandé". */
export default function ChairRequestPanel({ rentalId, rentalTitle }: { rentalId: number; rentalTitle: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [existing, setExisting] = useState<ApiChairRentalRequest | null | undefined>(undefined);
  const [siretSheetOpen, setSiretSheetOpen] = useState(false);

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

  async function handleSend() {
    if (!user) { router.push('/pro/connexion'); return; }
    if (!siretVerified) { setSiretSheetOpen(true); return; }

    setSending(true);
    setError('');
    try {
      const req = await chairRentals.sendRequest(rentalId, message || undefined);
      setExisting(req);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l’envoi.');
    } finally {
      setSending(false);
    }
  }

  if (existing === undefined) {
    return <div className="h-12 bg-neutral-100 rounded-xl animate-pulse" />;
  }

  if (existing) {
    const { label, icon: Icon, cls } = SENT_STATUS_LABEL[existing.status];
    return (
      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold ${cls}`}>
        <Icon size={15} />{label}
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
