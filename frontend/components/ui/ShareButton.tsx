'use client';

import { Share2 } from 'lucide-react';

export default function ShareButton() {
  function handleShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ url: window.location.href }).catch(() => {});
    } else if (typeof navigator !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href);
    }
  }

  return (
    <button
      onClick={handleShare}
      className="ml-auto flex items-center gap-2 text-neutral-400 hover:text-neutral-700 transition-colors"
      aria-label="Partager"
    >
      <Share2 size={18} strokeWidth={1.5} />
    </button>
  );
}
