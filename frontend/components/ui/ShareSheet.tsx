'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, QrCode, MessageCircle, MessageSquare, MoreHorizontal } from 'lucide-react';
import { referral } from '@/lib/api';
import type { ShareActionType, ShareChannel } from '@/lib/types';
import { InstagramGlyph, SnapchatGlyph } from './BrandIcons';
import BottomSheet from '@/components/ui/BottomSheet';

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

// Points réels par action — dupliqué de ReferralService::ACTIONS (backend),
// juste pour l'indice affiché ici ("+5 pts à chaque partage"). Le vrai crédit
// vient toujours du backend (res.points via onRewarded), jamais inventé ici.
const ACTION_POINTS: Record<ShareActionType, number> = {
  share_profile: 5,
  share_post: 5,
  social_post: 30,
  invite_hairdresser: 80,
  invite_salon: 150,
  invite_client: 40,
  first_review: 10,
  first_favorite: 5,
};

const isMobileUA = () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Volet de partage réutilisable — profil, réalisation, lien de parrainage.
// Chaque canal loggé via /share-events pour le programme ambassadeur (voir
// docs/GROWTH.md). Instagram/Snapchat n'ont pas d'URL web de partage prérempli
// fiable : le texte est copié + l'appli est ouverte (deep link), au lieu de
// prétendre à un partage direct qui n'existe pas.
export default function ShareSheet({ open, onClose, title, shareUrl, shareText, actionType, targetType, targetId, onRewarded }: Props) {
  const [copiedChannel, setCopiedChannel] = useState<ShareChannel | null>(null);
  const [showQr, setShowQr] = useState(false);

  if (!open) return null;

  const fullMessage = `${shareText ?? title}\n${shareUrl}`;

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
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedChannel('copy_link');
      log('copy_link');
      setTimeout(() => setCopiedChannel(null), 2000);
    } catch { /* clipboard indisponible (permissions, contexte non sécurisé...) */ }
  }

  function handleWhatsapp() {
    const text = encodeURIComponent(fullMessage);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    log('whatsapp');
  }

  function handleSms() {
    const text = encodeURIComponent(fullMessage);
    window.location.href = `sms:?&body=${text}`;
    log('native');
  }

  async function handleAppDeepLink(channel: 'instagram' | 'snapchat', scheme: string, webFallback: string) {
    await navigator.clipboard.writeText(fullMessage).catch(() => {});
    setCopiedChannel(channel);
    setTimeout(() => setCopiedChannel(null), 3500);
    if (isMobileUA()) {
      window.location.href = scheme;
      setTimeout(() => { window.open(webFallback, '_blank'); }, 900);
    } else {
      window.open(webFallback, '_blank');
    }
    log(channel);
  }

  function handleQr() {
    setShowQr((v) => !v);
    if (!showQr) log('qr');
  }

  const points = ACTION_POINTS[actionType];

  const channelBtnCls = 'flex flex-col items-center gap-1.5 group';
  const iconCircleCls = 'w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-700 group-hover:bg-neutral-200 group-active:scale-95 transition-all';
  const labelCls = 'text-[10px] font-semibold text-neutral-500';

  return createPortal(
    <BottomSheet onClose={onClose} maxHeight="max-h-[85vh]" zIndexClassName="z-[70]">
      <div className="px-5 pb-8">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[16px] font-bold text-neutral-900">{title}</p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors">
            <X size={15} />
          </button>
        </div>
        {!!points && (
          <p className="text-[12px] text-neutral-400 mb-4">
            <span className="font-bold text-neutral-700">+{points} points CHAIR</span> à chaque partage.
          </p>
        )}

        {showQr && (
          <div className="flex justify-center mb-5">
            <div className="p-4 bg-white rounded-2xl border-2 border-neutral-100">
              <QRCodeSVG value={shareUrl} size={180} level="M" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-y-4 gap-x-1 mb-2">
          <button onClick={handleCopy} className={channelBtnCls}>
            <div className={iconCircleCls}>
              {copiedChannel === 'copy_link' ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
            </div>
            <span className={labelCls}>{copiedChannel === 'copy_link' ? 'Copié !' : 'Copier'}</span>
          </button>
          <button onClick={handleSms} className={channelBtnCls}>
            <div className={iconCircleCls}><MessageSquare size={18} /></div>
            <span className={labelCls}>SMS</span>
          </button>
          <button onClick={handleWhatsapp} className={channelBtnCls}>
            <div className={iconCircleCls}><MessageCircle size={18} /></div>
            <span className={labelCls}>WhatsApp</span>
          </button>
          <button onClick={() => handleAppDeepLink('instagram', 'instagram://app', 'https://instagram.com')} className={channelBtnCls}>
            <div className={iconCircleCls}><InstagramGlyph size={18} /></div>
            <span className={labelCls}>Instagram</span>
          </button>
          <button onClick={() => handleAppDeepLink('snapchat', 'snapchat://', 'https://www.snapchat.com')} className={channelBtnCls}>
            <div className={iconCircleCls}><SnapchatGlyph size={18} /></div>
            <span className={labelCls}>Snapchat</span>
          </button>
          <button onClick={handleQr} className={channelBtnCls}>
            <div className={iconCircleCls}><QrCode size={18} /></div>
            <span className={labelCls}>QR code</span>
          </button>
          {typeof navigator !== 'undefined' && !!navigator.share && (
            <button onClick={handleNativeShare} className={channelBtnCls}>
              <div className={iconCircleCls}><MoreHorizontal size={18} /></div>
              <span className={labelCls}>Plus</span>
            </button>
          )}
        </div>

        {(copiedChannel === 'instagram' || copiedChannel === 'snapchat') && (
          <p className="text-[11px] text-neutral-400 text-center mb-2">
            Message copié — colle-le dans {copiedChannel === 'instagram' ? 'Instagram' : 'Snapchat'}.
          </p>
        )}
      </div>
    </BottomSheet>,
    document.body
  );
}
