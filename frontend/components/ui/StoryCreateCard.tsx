'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, Lock, Trash2, Eye } from 'lucide-react';
import { getStoredToken } from '@/lib/auth';
import { stories as storiesApi } from '@/lib/api';
import { hasChairPlus, resolveMediaUrl } from '@/lib/types';
import type { ApiHairdresserProfile, ApiStory } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

// Création de story — réservée CHAIR+. Le serveur fait autorité (403 si pas
// abonné), cette carte évite juste à un non-abonné de tenter l'upload pour
// rien et l'oriente vers le parrainage, seul moyen d'obtenir CHAIR+ aujourd'hui
// (Stripe pas encore branché).
export default function StoryCreateCard({ profile }: { profile: ApiHairdresserProfile | null }) {
  const eligible = hasChairPlus(profile);
  const [mine, setMine] = useState<ApiStory[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!eligible) return;
    storiesApi.mine().then(setMine).catch(() => {});
  }, [eligible]);

  async function handleFile(file: File) {
    const isVideo = file.type.startsWith('video/');
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('media', file);
      form.append('type', isVideo ? 'video' : 'image');
      const token = getStoredToken();
      const res = await fetch(`${API_URL}/stories`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Erreur ${res.status}`);
      }
      const story: ApiStory = await res.json();
      setMine((prev) => [...prev, story]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la publication');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await storiesApi.remove(id);
      setMine((prev) => prev.filter((s) => s.id !== id));
    } catch { /* ignore */ }
  }

  if (!eligible) {
    return (
      <Link href="/pro/chair-plus" className="flex items-center gap-3 bg-white rounded-2xl border border-neutral-100 p-4 hover:border-neutral-200 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
          <Lock size={15} className="text-neutral-400" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-neutral-900">Stories — réservé CHAIR+</p>
          <p className="text-xs text-neutral-400 mt-0.5">Essai gratuit 30 jours, ou débloquez via le parrainage</p>
        </div>
      </Link>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-neutral-900">Stories</p>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-xs font-bold bg-neutral-900 text-white px-3 py-2 rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-50"
        >
          <Camera size={13} />{uploading ? 'Publication...' : 'Publier'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
        />
      </div>

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      {mine.length === 0 ? (
        <p className="text-xs text-neutral-400">Aucune story active. Publiez du contenu du jour — nouvelle couleur, place disponible, coulisses...</p>
      ) : (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {mine.map((s) => (
            <div key={s.id} className="relative flex-shrink-0 w-16 h-24 rounded-xl overflow-hidden bg-neutral-100 group">
              {s.type === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveMediaUrl(s.media_url) ?? s.media_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <video src={resolveMediaUrl(s.media_url) ?? s.media_url} className="w-full h-full object-cover" muted />
              )}
              <div className="absolute bottom-1 left-1 flex items-center gap-0.5 bg-black/50 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                <Eye size={9} />{s.views_count}
              </div>
              <button
                onClick={() => handleDelete(s.id)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={10} className="text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
