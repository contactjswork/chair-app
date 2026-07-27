'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Check, X, Star, ShieldCheck, ShieldAlert, ExternalLink, Send } from 'lucide-react';
import { resolveMediaUrl, type ApiChairRentalRequest, type ChairRentalRequestStatus } from '@/lib/types';

const STATUS_LABELS: Record<ChairRentalRequestStatus, string> = {
  pending: 'Nouveau',
  in_discussion: 'Discussion',
  accepted: 'Accepté',
  declined: 'Refusé',
  cancelled: 'Annulé',
};

const STATUS_STYLES: Record<ChairRentalRequestStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  in_discussion: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-600',
  cancelled: 'bg-neutral-100 text-neutral-400',
};

interface Props {
  request: ApiChairRentalRequest;
  onAccept: () => void;
  onDecline: () => void;
  onSendMessage: (text: string) => Promise<void>;
}

/** Détail + fil de discussion d'une demande de location — contenu affiché dans un OwnerBottomSheet. */
export default function OwnerChairRequestSheet({ request, onAccept, onDecline, onSendMessage }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const hd = request.hairdresser;
  const avatarUrl = resolveMediaUrl(hd?.user?.avatar);
  const siretVerified = hd?.siret_verification_status === 'verified';
  const isTerminal = request.status === 'declined' || request.status === 'cancelled';

  async function handleSend() {
    if (!text.trim()) return;
    setSending(true);
    try {
      await onSendMessage(text.trim());
      setText('');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="relative w-11 h-11 rounded-full bg-neutral-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
          {avatarUrl
            ? <Image src={avatarUrl} alt="" fill className="object-cover" sizes="44px" />
            : <span className="text-sm font-bold text-neutral-500">{hd?.user?.name?.charAt(0).toUpperCase() ?? '?'}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-neutral-900">{hd?.user?.name ?? 'Coiffeur'}</p>
            <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${STATUS_STYLES[request.status]}`}>
              {STATUS_LABELS[request.status]}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {hd?.reviews_count != null && hd.reviews_count > 0 && (
              <span className="flex items-center gap-1 text-xs text-neutral-500">
                <Star size={11} className="fill-neutral-400 text-neutral-400" />{parseFloat(hd.avg_rating ?? '0').toFixed(1)} ({hd.reviews_count})
              </span>
            )}
            <span className={`flex items-center gap-1 text-xs font-medium ${siretVerified ? 'text-green-600' : 'text-amber-600'}`}>
              {siretVerified ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
              SIRET {siretVerified ? 'vérifié' : 'non vérifié'}
            </span>
          </div>
          {hd?.slug && (
            <Link href={`/app/coiffeur/${hd.slug}`} target="_blank" className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-700 mt-1">
              Voir le profil<ExternalLink size={10} />
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {request.message && (
          <div className="bg-neutral-50 rounded-2xl rounded-tl-sm px-3 py-2.5 max-w-[85%]">
            <p className="text-sm text-neutral-700">{request.message}</p>
          </div>
        )}
        {request.messages?.map((m) => (
          <div
            key={m.id}
            className={`px-3 py-2.5 max-w-[85%] rounded-2xl ${
              m.sender_type === 'owner'
                ? 'bg-neutral-900 text-white rounded-tr-sm ml-auto'
                : 'bg-neutral-50 text-neutral-700 rounded-tl-sm'
            }`}
          >
            <p className="text-sm">{m.body}</p>
          </div>
        ))}
      </div>

      {!isTerminal && (
        <>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Répondre..."
              className="flex-1 px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400"
            />
            <button
              onClick={handleSend}
              disabled={sending || !text.trim()}
              className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center disabled:opacity-40 flex-shrink-0"
            >
              <Send size={15} />
            </button>
          </div>

          {request.status !== 'accepted' && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={onDecline}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-neutral-600 border border-neutral-200 py-2.5 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors"
              >
                <X size={13} />Refuser
              </button>
              <button
                onClick={onAccept}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold bg-neutral-900 text-white py-2.5 rounded-xl hover:bg-neutral-700 transition-colors"
              >
                <Check size={13} />Accepter
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
