'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Eye } from 'lucide-react';
import { stories as storiesApi } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/types';
import type { ApiStory } from '@/lib/types';

const IMAGE_DURATION_MS = 5000;

export default function StoryViewer({
  hairdresserId, onClose, onViewed,
}: { hairdresserId: number; onClose: () => void; onViewed?: () => void }) {
  const [items, setItems] = useState<ApiStory[]>([]);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    storiesApi.byHairdresser(hairdresserId)
      .then((data) => setItems(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hairdresserId]);

  const current = items[index];

  useEffect(() => {
    if (!current) return;
    if (!viewedRef.current.has(current.id)) {
      viewedRef.current.add(current.id);
      storiesApi.view(current.id).catch(() => {});
      onViewed?.();
    }
  }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  function goNext() {
    if (index < items.length - 1) {
      setIndex((i) => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }

  function goPrev() {
    if (index > 0) {
      setIndex((i) => i - 1);
      setProgress(0);
    }
  }

  // Progression automatique — images uniquement (les vidéos avancent sur onEnded).
  useEffect(() => {
    if (!current || current.type === 'video') return;
    startRef.current = performance.now();

    function tick(now: number) {
      const pct = Math.min(100, ((now - startRef.current) / IMAGE_DURATION_MS) * 100);
      setProgress(pct);
      if (pct >= 100) { goNext(); return; }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || items.length === 0) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Barres de progression */}
      <div className="flex gap-1 px-3 pt-3 flex-shrink-0">
        {items.map((it, i) => (
          <div key={it.id} className="flex-1 h-[2.5px] bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full"
              style={{ width: i < index ? '100%' : i === index ? `${progress}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2 text-white text-xs font-semibold">
          <Eye size={13} />{current?.views_count ?? 0}
        </div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10">
          <X size={16} className="text-white" />
        </button>
      </div>

      {/* Média */}
      <div className="relative flex-1">
        <button onClick={goPrev} className="absolute left-0 top-0 bottom-0 w-1/3 z-10" aria-label="Précédent" />
        <button onClick={goNext} className="absolute right-0 top-0 bottom-0 w-1/3 z-10" aria-label="Suivant" />

        {current && current.type === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolveMediaUrl(current.media_url) ?? current.media_url}
            alt=""
            className="w-full h-full object-contain"
          />
        ) : current ? (
          <video
            ref={videoRef}
            src={resolveMediaUrl(current.media_url) ?? current.media_url}
            className="w-full h-full object-contain"
            autoPlay
            playsInline
            onEnded={goNext}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (v.duration) setProgress((v.currentTime / v.duration) * 100);
            }}
          />
        ) : null}
      </div>
    </div>,
    document.body
  );
}
