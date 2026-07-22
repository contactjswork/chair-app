'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { stories as storiesApi } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/types';
import type { ApiStoryBubble } from '@/lib/types';
import StoryViewer from './StoryViewer';

// Bulles horizontales sous la barre de recherche sticky — UNIQUEMENT les
// coiffeurs suivis (jamais un feed mondial, jamais d'algorithme). Réflexe
// quotidien, pas un outil de découverte. DA CHAIR : anneau noir/blanc, pas
// le dégradé coloré Instagram.
export default function StoriesBar() {
  const [bubbles, setBubbles] = useState<ApiStoryBubble[]>([]);
  const [loading, setLoading] = useState(true);
  const [openHairdresserId, setOpenHairdresserId] = useState<number | null>(null);

  useEffect(() => {
    storiesApi.feed()
      .then((data) => setBubbles(data.bubbles))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function markSeen(hairdresserId: number) {
    setBubbles((prev) => prev.map((b) => b.hairdresser_id === hairdresserId ? { ...b, has_unseen: false } : b));
  }

  if (loading || bubbles.length === 0) return null;

  return (
    <>
      <div className="border-b border-neutral-100 bg-white">
        <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 py-3 max-w-2xl md:max-w-3xl md:mx-auto">
          {bubbles.map((b) => {
            const avatar = resolveMediaUrl(b.avatar);
            return (
              <button
                key={b.hairdresser_id}
                onClick={() => setOpenHairdresserId(b.hairdresser_id)}
                className="flex flex-col items-center gap-1 flex-shrink-0 w-16"
              >
                <div className={`relative w-14 h-14 rounded-full p-[2px] ${b.has_unseen ? 'bg-neutral-900' : 'bg-neutral-200'}`}>
                  <div className="relative w-full h-full rounded-full overflow-hidden bg-neutral-100 ring-2 ring-white">
                    {avatar ? (
                      <Image src={avatar} alt={b.name} fill className="object-cover" sizes="56px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-neutral-500">
                        {b.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-neutral-600 font-medium truncate w-full text-center">
                  {b.name.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {openHairdresserId !== null && (
        <StoryViewer
          hairdresserId={openHairdresserId}
          onClose={() => setOpenHairdresserId(null)}
          onViewed={() => markSeen(openHairdresserId)}
        />
      )}
    </>
  );
}
