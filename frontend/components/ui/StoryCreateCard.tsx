'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, Lock, Trash2, Eye } from 'lucide-react';
import { getStoredToken } from '@/lib/auth';
import { stories as storiesApi } from '@/lib/api';
import { hasChairPlus, resolveMediaUrl } from '@/lib/types';
import { allowsDigitalSubscriptionUI, useAppContext } from '@/lib/appContext';
import type { ApiHairdresserProfile, ApiStory } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
// Doit rester synchronisé avec la limite serveur (StoryController::store,
// 'video_duration_seconds' => 'max:15') et avec le portfolio (même règle).
const MAX_VIDEO_SECONDS = 15;

/**
 * Recadre une photo en 9:16 (centré) avant envoi, comme Instagram — une
 * story doit toujours remplir l'écran, jamais de bandes noires en haut/bas
 * parce que la photo d'origine était dans un autre format.
 */
function cropImageTo9x16(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);

      const targetRatio = 9 / 16;
      const srcRatio = img.width / img.height;

      let cropWidth = img.width;
      let cropHeight = img.height;
      if (srcRatio > targetRatio) {
        // Photo trop large — on recadre les côtés.
        cropWidth = img.height * targetRatio;
      } else {
        // Photo trop haute/carrée — on recadre haut/bas.
        cropHeight = img.width / targetRatio;
      }
      const srcX = (img.width - cropWidth) / 2;
      const srcY = (img.height - cropHeight) / 2;

      // Résolution de sortie plafonnée (perf/poids), en gardant le 9:16 exact.
      const outWidth = Math.min(1080, Math.round(cropWidth));
      const outHeight = Math.round(outWidth * (16 / 9));

      const canvas = document.createElement('canvas');
      canvas.width = outWidth;
      canvas.height = outHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Recadrage impossible.')); return; }
      ctx.drawImage(img, srcX, srcY, cropWidth, cropHeight, 0, 0, outWidth, outHeight);

      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('Recadrage impossible.')); return; }
        resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.92);
    };
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error("Impossible de lire cette photo.")); };
    img.src = URL.createObjectURL(file);
  });
}

/** Mesure la durée d'une vidéo côté client avant upload (via onLoadedMetadata). */
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(video.src);
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Impossible de lire cette vidéo.'));
    };
    video.src = URL.createObjectURL(file);
  });
}

// Création de story — réservée CHAIR+. Le serveur fait autorité (403 si pas
// abonné), cette carte évite juste à un non-abonné de tenter l'upload pour
// rien et l'oriente vers le parrainage, seul moyen d'obtenir CHAIR+ aujourd'hui
// (Stripe pas encore branché).
export default function StoryCreateCard({ profile }: { profile: ApiHairdresserProfile | null }) {
  const eligible = hasChairPlus(profile);
  // Binaire CHAIR CLIENT (ou natif non identifié) : pas de mention d'essai
  // gratuit d'un abonnement numérique (App Store 3.1.1(a)) — on n'évoque que
  // le parrainage. Identique pour tous les utilisateurs du même binaire.
  const { context: appContext } = useAppContext();
  const [mine, setMine] = useState<ApiStory[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!eligible) return;
    storiesApi.mine().then(setMine).catch(() => {});
  }, [eligible]);

  async function handleFile(rawFile: File) {
    const isVideo = rawFile.type.startsWith('video/');
    setUploading(true);
    setError('');
    try {
      let durationSeconds: number | null = null;
      if (isVideo) {
        durationSeconds = Math.round(await getVideoDuration(rawFile));
        if (durationSeconds > MAX_VIDEO_SECONDS) {
          setError(`Vidéo story — ${MAX_VIDEO_SECONDS} secondes maximum. Coupez-la avant d'envoyer.`);
          setUploading(false);
          return;
        }
      }
      // Photo : toujours recadrée en 9:16 avant envoi (comme Instagram) — la
      // vidéo n'est pas recadrée ici (recadrage vidéo = ré-encodage, hors scope).
      const file = isVideo ? rawFile : await cropImageTo9x16(rawFile);
      const form = new FormData();
      form.append('media', file);
      form.append('type', isVideo ? 'video' : 'image');
      if (durationSeconds != null) form.append('video_duration_seconds', String(durationSeconds));
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
      <Link href="/pro/chair-plus" className="flex items-center gap-3 bg-neutral-50 rounded-[20px] p-4 hover:bg-neutral-100/80 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
          <Lock size={15} className="text-neutral-400" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-neutral-900">Stories — réservé CHAIR+</p>
          <p className="text-xs text-neutral-400 mt-0.5">
            {allowsDigitalSubscriptionUI(appContext)
              ? 'Essai gratuit 30 jours, ou débloquez via le parrainage'
              : 'Débloquez les stories via le parrainage'}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <div className="bg-neutral-50 rounded-[20px] p-4">
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

      <p className="text-[10px] text-neutral-400 mb-2">Vidéo story — {MAX_VIDEO_SECONDS} secondes maximum</p>

      {mine.length === 0 ? (
        <p className="text-xs text-neutral-400">Publiez du contenu du jour — nouvelle couleur, place disponible, coulisses...</p>
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
