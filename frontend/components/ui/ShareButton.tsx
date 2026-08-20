'use client';

import { Share2 } from 'lucide-react';
import { getSharePayload } from '@/lib/share';

interface Props {
  /** Nom du coiffeur — contexte pour le texte de partage de la réalisation. */
  hairdresserName?: string;
  /** Description de la réalisation. */
  description?: string;
}

export default function ShareButton({ hairdresserName, description }: Props) {
  function handleShare() {
    if (typeof navigator === 'undefined') return;
    const { title, text, url } = getSharePayload('post', {
      url: window.location.href,
      name: hairdresserName,
      description,
    });
    if (navigator.share) {
      navigator.share({ title, text, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(`${text}\n${url}`);
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
