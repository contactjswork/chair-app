'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, QrCode, MessageCircle, MessageSquare } from 'lucide-react';
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
}

const isMobileUA = () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const hasNativeShare = () => typeof navigator !== 'undefined' && !!navigator.share;

// Volet de partage réutilisable — profil, réalisation, lien de parrainage.
// Dès que le téléphone sait le faire, "Partager" ouvre DIRECTEMENT la fenêtre
// de partage native (WhatsApp/Messages/Mail/AirDrop/copier... déjà tous là,
// gérés par l'OS) — ce volet à grille de canaux ne s'affiche qu'en repli, sur
// les navigateurs desktop sans Web Share API. Chaque canal loggé via
// /share-events pour la télémétrie (voir docs/GROWTH.md) mais ceci ne crédite
// JAMAIS de points — un partage/copie/QR n'est qu'une intention, pas une
// inscription réelle. Le crédit n'arrive que lorsque le filleul termine son
// inscription (voir ReferralService::attributeSignup côté backend).
// Instagram/Snapchat (repli desktop) n'ont pas d'URL web de partage
// préremplie fiable : le texte est copié + l'appli est ouverte (deep link).
export default function ShareSheet({ open, onClose, title, shareUrl, shareText, actionType, targetType, targetId }: Props) {
  const [copiedChannel, setCopiedChannel] = useState<ShareChannel | null>(null);
  const [showQr, setShowQr] = useState(false);
  /** Nettoyage du repli deep link en attente si le volet est démonté entre-temps. */
  const deepLinkCleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => { deepLinkCleanupRef.current?.(); }, []);

  function log(channel: ShareChannel) {
    // Télémétrie best-effort ("invitations envoyées") — jamais de crédit ici.
    referral.share(actionType, { targetType, targetId, channel }).catch(() => {});
  }

  async function handleNativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url: shareUrl });
        log('native');
      } catch { /* annulé par l'utilisateur */ }
    }
  }

  useEffect(() => {
    if (!open || !hasNativeShare()) return;
    handleNativeShare().finally(onClose);
    // Le partage natif est fire-and-forget à l'ouverture — pas de dépendance
    // sur onClose/handleNativeShare (recréées à chaque rendu du parent).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || hasNativeShare()) return null;

  const fullMessage = `${shareText ?? title}\n${shareUrl}`;

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

  /**
   * Ouvre Instagram/Snapchat par leur schéma d'URL, avec repli web si
   * l'application n'est pas installée.
   *
   * Le repli était auparavant un `setTimeout(..., 900)` inconditionnel : quand
   * l'application S'OUVRAIT bien, le minuteur restait armé et se déclenchait
   * au retour dans CHAIR — l'utilisateur qui venait d'annuler le partage dans
   * Instagram se retrouvait projeté sur instagram.com dans un onglet, sans
   * l'avoir demandé (double comportement).
   *
   * Le repli n'a de sens que dans un seul cas : le schéma n'a rien ouvert,
   * donc la page CHAIR est TOUJOURS au premier plan 900 ms plus tard. On
   * annule donc dès que la page passe en arrière-plan (`visibilitychange`,
   * `pagehide`, `blur` — c'est exactement ce qui se produit quand l'app tierce
   * prend la main), et on revérifie `document.hidden` avant d'ouvrir.
   */
  async function handleAppDeepLink(channel: 'instagram' | 'snapchat', scheme: string, webFallback: string) {
    // Anti double-tap : la garde est posée AVANT le `await` sur le
    // presse-papier, sinon deux appuis rapprochés passent tous les deux.
    if (deepLinkCleanupRef.current) return;
    deepLinkCleanupRef.current = () => {};

    await navigator.clipboard.writeText(fullMessage).catch(() => {});
    setCopiedChannel(channel);
    setTimeout(() => setCopiedChannel(null), 3500);

    if (!isMobileUA()) {
      deepLinkCleanupRef.current = null;
      window.open(webFallback, '_blank');
      log(channel);
      return;
    }

    let leftThePage = false;
    let timer = 0;
    const onLeave = () => { leftThePage = true; };
    const onVisibilityChange = () => { if (document.hidden) leftThePage = true; };
    const cleanup = () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onLeave);
      window.removeEventListener('blur', onLeave);
      window.clearTimeout(timer);
      deepLinkCleanupRef.current = null;
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onLeave);
    window.addEventListener('blur', onLeave);

    timer = window.setTimeout(() => {
      const shouldFallback = !leftThePage && !document.hidden;
      cleanup();
      if (shouldFallback) window.open(webFallback, '_blank');
    }, 900);
    deepLinkCleanupRef.current = cleanup;

    window.location.href = scheme;
    log(channel);
  }

  function handleQr() {
    setShowQr((v) => !v);
    if (!showQr) log('qr');
  }

  const channelBtnCls = 'flex flex-col items-center gap-1.5 group';
  const iconCircleCls = 'w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-700 group-hover:bg-neutral-200 group-active:scale-95 transition-all';
  const labelCls = 'text-[10px] font-semibold text-neutral-500';

  return createPortal(
    <BottomSheet onClose={onClose} maxHeight="max-h-[85vh]" zIndexClassName="z-[70]">
      <div className="px-5 pb-8">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[16px] font-bold text-neutral-900">{title}</p>
          <button onClick={onClose} className="w-8 h-8 relative before:absolute before:-inset-1.5 before:content-[''] flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors">
            <X size={15} />
          </button>
        </div>
        <p className="text-[12px] text-neutral-400 mb-4">
          Gagnez 5 points lorsqu&apos;un filleul crée son compte grâce à votre lien.
        </p>

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
