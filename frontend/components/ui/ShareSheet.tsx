'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Share2, QrCode, MessageCircle } from 'lucide-react';
import { referral } from '@/lib/api';
import type { ShareActionType, ShareChannel } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  shareUrl: string;
  shareText?: string;
  actionType: ShareActionType;
  targetType?: string;
  targetId?: number;
  /** Callback quand une récompense est accordée — pour afficher "+5 pts" côté appelant. */
  onRewarded?: (points: number) => void;
}

// Volet de partage réutilisable — profil, réalisation, lien de parrainage.
// Chaque canal loggé via /share-events pour le programme ambassadeur (voir
// docs/GROWTH.md). Web Share API en priorité sur mobile (couvre
// Instagram/Snapchat/TikTok nativement, sans intégration API par plateforme).
export default function ShareSheet({ open, onClose, title, shareUrl, shareText, actionType, targetType, targetId, onRewarded }: Props) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  if (!open) return null;

  async function log(channel: ShareChannel) {
    try {
      const res = await referral.share(actionType, { targetType, targetId, channel });
      if (res.rewarded && onRewarded) onRewarded(res.points);
    } catch { /* le partage reste utile même si le crédit échoue */ }
  }

  async function handleNativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url: shareUrl });
        log('native');
      } catch { /* annulé par l'utilisateur */ }
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    log('copy_link');
    setTimeout(() => setCopied(false), 2000);
  }

  function handleWhatsapp() {
    const text = encodeURIComponent(`${shareText ?? title} ${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    log('whatsapp');
  }

  function handleQr() {
    setShowQr((v) => !v);
    if (!showQr) log('qr');
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl shadow-2xl px-5 pt-5 pb-8 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <p className="text-[16px] font-bold text-neutral-900">{title}</p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors">
            <X size={15} />
          </button>
        </div>

        {showQr && (
          <div className="flex justify-center mb-5">
            <div className="p-4 bg-white rounded-2xl border-2 border-neutral-100">
              <QRCodeSVG value={shareUrl} size={180} level="M" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          {typeof navigator !== 'undefined' && !!navigator.share && (
            <button onClick={handleNativeShare} className="flex items-center justify-center gap-2 bg-neutral-900 text-white font-bold py-3.5 rounded-2xl text-sm hover:bg-neutral-700 transition-colors col-span-2">
              <Share2 size={15} />Partager
            </button>
          )}
          <button onClick={handleCopy} className="flex items-center justify-center gap-2 border border-neutral-200 text-neutral-700 font-semibold py-3 rounded-2xl text-sm hover:bg-neutral-50 transition-colors">
            {copied ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
            {copied ? 'Copié !' : 'Copier le lien'}
          </button>
          <button onClick={handleWhatsapp} className="flex items-center justify-center gap-2 border border-neutral-200 text-neutral-700 font-semibold py-3 rounded-2xl text-sm hover:bg-neutral-50 transition-colors">
            <MessageCircle size={15} />WhatsApp
          </button>
          <button onClick={handleQr} className="flex items-center justify-center gap-2 border border-neutral-200 text-neutral-700 font-semibold py-3 rounded-2xl text-sm hover:bg-neutral-50 transition-colors col-span-2">
            <QrCode size={15} />{showQr ? 'Masquer le QR' : 'Afficher le QR code'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
