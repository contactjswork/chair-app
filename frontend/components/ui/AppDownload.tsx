'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { isAppPublished, APP_STORE_URL, PLAY_STORE_URL } from '@/lib/appDownload';

function AppleBadge() {
  return (
    <svg viewBox="0 0 120 40" className="h-11 w-auto" fill="none">
      <rect x="0.5" y="0.5" width="119" height="39" rx="8" fill="#000" stroke="rgba(255,255,255,0.25)" />
      <g fill="#fff">
        <path d="M25.6 20.4c0-2.6 2.1-3.9 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.1 2.5-1.8 3.1-.5 7.6 1.3 10.1.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.4-.8s2 .8 3.3.8c1.4 0 2.3-1.2 3.1-2.5.7-1 1-1.5 1.5-2.6-3.9-1.5-4-4-4-4.2Zm-2.9-7.6c.7-.9 1.2-2.1 1-3.3-1 0-2.3.7-3.1 1.5-.7.8-1.3 2-1.1 3.2 1.2.1 2.4-.6 3.2-1.4Z" />
      </g>
      <text x="38" y="16" fontFamily="Arial, sans-serif" fontSize="7" fill="#fff">Télécharger dans l&apos;</text>
      <text x="38" y="29" fontFamily="Arial, sans-serif" fontSize="13" fontWeight="600" fill="#fff">App Store</text>
    </svg>
  );
}

function GoogleBadge() {
  return (
    <svg viewBox="0 0 135 40" className="h-11 w-auto" fill="none">
      <rect x="0.5" y="0.5" width="134" height="39" rx="8" fill="#000" stroke="rgba(255,255,255,0.25)" />
      <g transform="translate(12, 9)">
        <path d="M1 0.5C0.6 0.9 0.4 1.5 0.4 2.2v17.6c0 .7.2 1.3.6 1.7l.1.1L10.9 11.1v-.2L1.1.4 1 .5Z" fill="#00D2FF" />
        <path d="M14.3 14.5 10.9 11.1v-.2l3.4-3.4.1.1 4 2.3c1.2.7 1.2 1.8 0 2.5l-4.1 2.1Z" fill="#FFC700" />
        <path d="M14.4 14.4 10.9 10.9.9 20.9c.4.4 1 .4 1.7.1l11.8-6.6" fill="#FF3A44" />
        <path d="M14.4 7.6 2.6 1c-.7-.4-1.3-.3-1.7.1l9.9 9.8 3.6-3.3Z" fill="#00E177" />
      </g>
      <text x="34" y="16" fontFamily="Arial, sans-serif" fontSize="7" fill="#fff">Disponible sur</text>
      <text x="34" y="29" fontFamily="Arial, sans-serif" fontSize="13" fontWeight="600" fill="#fff">Google Play</text>
    </svg>
  );
}

interface AppDownloadProps {
  /** 'badges' = boutons stores classiques ; 'qr' = QR seul ; 'full' = badges + QR côte à côte */
  variant?: 'badges' | 'qr' | 'full';
  className?: string;
  qrSize?: number;
}

export default function AppDownload({ variant = 'badges', className = '', qrSize = 108 }: AppDownloadProps) {
  const [notified, setNotified] = useState(false);
  const published = isAppPublished();
  const qrValue = typeof window !== 'undefined' ? `${window.location.origin}/download` : 'https://getchair.app/download';

  if (!published) {
    // App pas encore publiée sur les stores — pas de lien mort, état honnête.
    return (
      <div className={`flex flex-col gap-3 ${className}`}>
        <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[13px] font-black">C</span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-[13px] font-semibold leading-tight">Bientôt sur l&apos;App Store et Google Play</p>
            <p className="text-white/40 text-[11.5px] leading-snug mt-0.5">L&apos;application est en cours de déploiement.</p>
          </div>
        </div>
        {!notified ? (
          <button
            onClick={() => setNotified(true)}
            className="text-[13px] font-semibold text-white underline underline-offset-4 decoration-white/30 hover:decoration-white/70 transition-colors text-left"
          >
            Me prévenir de la sortie
          </button>
        ) : (
          <p className="text-[13px] text-white/60">Merci — on vous tient au courant.</p>
        )}
      </div>
    );
  }

  if (variant === 'qr') {
    return (
      <div className={`inline-flex flex-col items-center gap-2 ${className}`}>
        <div className="p-2.5 bg-white rounded-xl">
          <QRCodeSVG value={qrValue} size={qrSize} level="M" />
        </div>
        <p className="text-[11px] text-white/40 text-center">Scannez pour télécharger</p>
      </div>
    );
  }

  const badges = (
    <div className="flex items-center gap-3 flex-wrap">
      {APP_STORE_URL && (
        <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="Télécharger CHAIR sur l'App Store">
          <AppleBadge />
        </a>
      )}
      {PLAY_STORE_URL && (
        <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="Télécharger CHAIR sur Google Play">
          <GoogleBadge />
        </a>
      )}
    </div>
  );

  if (variant === 'badges') return <div className={className}>{badges}</div>;

  return (
    <div className={`flex items-center gap-5 ${className}`}>
      {badges}
      <div className="p-2 bg-white rounded-xl flex-shrink-0">
        <QRCodeSVG value={qrValue} size={qrSize} level="M" />
      </div>
    </div>
  );
}
