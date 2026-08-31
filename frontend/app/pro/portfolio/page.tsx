'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import type { ApiPost, ApiSpecialty } from '@/lib/types';
import { getAllImagesRaw, resolveMediaUrl } from '@/lib/types';
import { getStoredToken } from '@/lib/auth';
import { PremiumBadge } from '@/components/ui/PremiumLock';
import { SPECIALTY_ILLUSTRATIONS, HOMME_SPECIALTY_SLUGS, FEMME_SPECIALTY_SLUGS } from '@/lib/specialties';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import {
  Plus, X, Check, Camera, Loader, ImageIcon,
  Eye, Star, TrendingUp, Award, Scissors,
  Pin, GripVertical, Move, Bookmark, Sparkles, Film, Play, ChevronLeft, MoreHorizontal,
} from 'lucide-react';
import PostActionsSheet from '@/components/pro/PostActionsSheet';

const MAX_VIDEO_MB = 25;
const MAX_VIDEO_SECONDS = 15;
// Doit rester synchronisé avec PostController::MAX_PINNED_POSTS côté backend
// (défense en profondeur : cette limite est vérifiée ici ET côté serveur).
const MAX_PINNED_POSTS = 3;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
const MAX_PHOTOS = 10;

// Fonction top-level (pas dans le corps du composant) — échappe à la règle
// react-hooks/purity qui interdit Date.now()/new Date() dans le rendu.
function isChairPlusFromAuth(profile: { is_chair_plus?: boolean; chair_plus_until?: string | null } | null | undefined): boolean {
  if (!profile) return false;
  if (profile.is_chair_plus !== undefined) return profile.is_chair_plus;
  return !!profile.chair_plus_until && new Date(profile.chair_plus_until).getTime() > Date.now();
}

// Genre d'une spécialité — priorité à specialty.category (live, éditable
// sans build depuis Configuration > Spécialités) ; repli sur la répartition
// codée en dur (HOMME/FEMME_SPECIALTY_SLUGS) tant qu'une spécialité n'a pas
// encore de catégorie renseignée. null = non classée, jamais cachée.
function specialtyGender(s: ApiSpecialty): 'homme' | 'femme' | null {
  if (s.category === 'Homme') return 'homme';
  if (s.category === 'Femme') return 'femme';
  if (HOMME_SPECIALTY_SLUGS.includes(s.slug)) return 'homme';
  if (FEMME_SPECIALTY_SLUGS.includes(s.slug)) return 'femme';
  return null;
}

interface PhotoFile { file: File; preview: string; }

function PhotoGrid({ photos, onAdd, onRemove }: {
  photos: PhotoFile[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    onAdd(files.slice(0, MAX_PHOTOS - photos.length));
    e.target.value = '';
  }
  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {photos.map((p, i) => (
          <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-neutral-100">
            <Image src={p.preview} alt={`Photo ${i + 1}`} fill className="object-cover" />
            <button type="button" onClick={() => onRemove(i)}
              className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80">
              <X size={12} />
            </button>
            {i === 0 && (
              <div className="absolute bottom-1.5 left-1.5 bg-black/50 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide">
                Couverture
              </div>
            )}
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <button type="button" onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-1.5 text-neutral-300 hover:border-neutral-400 hover:text-neutral-500 transition-colors">
            <Camera size={22} />
            <span className="text-[10px]">Ajouter</span>
          </button>
        )}
      </div>
      {photos.length > 0 && (
        <p className="text-[11px] text-neutral-400">
          {photos.length}/{MAX_PHOTOS} photo{photos.length > 1 ? 's' : ''}
        </p>
      )}
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleChange} />
    </div>
  );
}

/**
 * Photo « avant » optionnelle : avec elle, la réalisation devient une
 * transformation et les clients ont droit au curseur avant/après sur la
 * page publique — l'argument de vente le plus parlant d'un coiffeur.
 */
function AvantPicker({ avant, onPick, onRemove }: {
  avant: PhotoFile | null;
  onPick: (f: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
      {avant ? (
        <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
          <Image src={avant.preview} alt="Photo avant" fill className="object-cover" />
          <button type="button" onClick={onRemove}
            className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80">
            <X size={10} />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()}
          className="w-14 h-14 rounded-lg border-2 border-dashed border-neutral-200 flex items-center justify-center text-neutral-300 hover:border-neutral-400 hover:text-neutral-500 transition-colors flex-shrink-0">
          <Camera size={18} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-neutral-700">Photo avant <span className="font-normal text-neutral-400">(optionnel)</span></p>
        <p className="text-[11px] text-neutral-400 leading-snug mt-0.5">
          Ajoutez l&apos;avant : les clients glissent pour révéler la transformation.
        </p>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ''; }} />
    </div>
  );
}

/**
 * Pastille photo d'une spécialité — même chaîne de priorité que partout
 * ailleurs dans l'app (vraie photo > illustration locale > rien) : retour de
 * Julien, le portfolio ne montrait que des pastilles de texte nu pendant que
 * le reste de CHAIR PRO utilise déjà de vraies photos pour les spécialités.
 */
function SpecialtyThumb({ specialty, size = 22 }: { specialty: ApiSpecialty; size?: number }) {
  const photo = specialty.image_url;
  const illustration = SPECIALTY_ILLUSTRATIONS[specialty.slug];
  return (
    <span className="relative rounded-full overflow-hidden bg-white flex-shrink-0" style={{ width: size, height: size }}>
      {photo ? (
        <Image src={photo} alt="" fill className="object-cover" sizes={`${size}px`} />
      ) : illustration ? (
        <Image src={illustration} alt="" fill className="object-contain mix-blend-multiply" sizes={`${size}px`} />
      ) : null}
    </span>
  );
}

function TagSelector({ specialties, selectedIds, onChange, label = '', max = 6 }: {
  specialties: ApiSpecialty[]; selectedIds: number[];
  onChange: (ids: number[]) => void; label?: string; max?: number;
}) {
  function toggle(id: number) {
    if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id));
    else if (selectedIds.length < max) onChange([...selectedIds, id]);
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        {label && <label className="text-xs font-semibold text-neutral-600">{label}</label>}
        <span className={`text-[10px] text-neutral-400 ${!label ? 'ml-auto' : ''}`}>{selectedIds.length}/{max}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {specialties.map((s) => {
          const active = selectedIds.includes(s.id);
          return (
            <button key={s.id} type="button" onClick={() => toggle(s.id)}
              className={`flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full border-2 transition-all ${
                active ? 'border-neutral-900 bg-neutral-900' : 'border-neutral-200 bg-white hover:border-neutral-400'
              }`}>
              <SpecialtyThumb specialty={s} size={22} />
              <span className={`text-[11px] font-semibold whitespace-nowrap ${active ? 'text-white' : 'text-neutral-700'}`}>{s.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface VideoFile { file: File; preview: string; durationSeconds: number | null; }

function VideoPicker({ video, onPick, onRemove }: {
  video: VideoFile | null;
  onPick: (v: VideoFile) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const preview = URL.createObjectURL(file);
    onPick({ file, preview, durationSeconds: null });
  }

  if (video) {
    const tooBig = video.file.size > MAX_VIDEO_MB * 1024 * 1024;
    const tooLong = video.durationSeconds != null && video.durationSeconds > MAX_VIDEO_SECONDS;
    return (
      <div>
        <div className="relative w-32 aspect-[9/16] rounded-xl overflow-hidden bg-neutral-900 mb-2">
          <video
            src={video.preview}
            className="w-full h-full object-cover"
            muted
            playsInline
            controls
            onLoadedMetadata={(e) => {
              const d = Math.round(e.currentTarget.duration);
              onPick({ ...video, durationSeconds: d });
            }}
          />
          <button type="button" onClick={onRemove}
            className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80">
            <X size={12} />
          </button>
        </div>
        {(tooBig || tooLong) && (
          <p className="text-[11px] text-amber-600 mb-1">
            {tooBig && `Fichier trop lourd (max ${MAX_VIDEO_MB} Mo) — compressez-le avant d'envoyer. `}
            {tooLong && `Vidéo trop longue (max ${MAX_VIDEO_SECONDS}s) — coupez-la avant d'envoyer.`}
          </p>
        )}
        {video.durationSeconds != null && !tooLong && (
          <p className="text-[11px] text-neutral-400">{video.durationSeconds}s</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <button type="button" onClick={() => inputRef.current?.click()}
        className="w-32 aspect-[9/16] rounded-xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-1.5 text-neutral-300 hover:border-neutral-400 hover:text-neutral-500 transition-colors">
        <Film size={22} />
        <span className="text-[10px] text-center px-2">Choisir une vidéo</span>
      </button>
      <p className="text-[11px] text-neutral-400 mt-2">
        {MAX_VIDEO_SECONDS}s max · {MAX_VIDEO_MB} Mo max · 9:16 recommandé
      </p>
      <input ref={inputRef} type="file" accept="video/mp4,video/quicktime" className="hidden" onChange={handleChange} />
    </div>
  );
}

function AddPostForm({ specialties, isPremium, onSuccess, onCancel }: {
  specialties: ApiSpecialty[];
  isPremium: boolean;
  onSuccess: (post: ApiPost) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<'photos' | 'video'>('photos');
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [avant, setAvant] = useState<PhotoFile | null>(null);
  const [video, setVideo] = useState<VideoFile | null>(null);
  const [description, setDescription] = useState('');
  const [gender, setGender] = useState<'homme' | 'femme' | ''>('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Retour de Julien : le filtre précédent n'excluait qu'1-2 slugs au lieu de
  // vraiment filtrer par genre. Source vivante = specialty.category (Homme/
  // Femme, éditable sans build depuis Configuration > Spécialités) ; les
  // listes HOMME_SPECIALTY_SLUGS/FEMME_SPECIALTY_SLUGS ne servent plus que de
  // repli si une spécialité n'a pas encore de catégorie renseignée. Une
  // spécialité non classée nulle part reste toujours visible dans les deux
  // sens, jamais cachée silencieusement.
  const suggestedSpecialties = gender === 'homme'
    ? specialties.filter(s => specialtyGender(s) !== 'femme')
    : gender === 'femme'
    ? specialties.filter(s => specialtyGender(s) !== 'homme')
    : specialties;

  function handleGenderChange(g: 'homme' | 'femme' | '') {
    setGender(g); setTagIds([]); setSpecialtyId('');
  }

  function addPhotos(files: File[]) {
    const newPhotos: PhotoFile[] = files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }));
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, MAX_PHOTOS));
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === 'video') {
      if (!video) { setError('Choisissez une vidéo.'); return; }
      if (video.file.size > MAX_VIDEO_MB * 1024 * 1024) { setError(`Vidéo trop lourde (max ${MAX_VIDEO_MB} Mo).`); return; }
      if (video.durationSeconds != null && video.durationSeconds > MAX_VIDEO_SECONDS) { setError(`Vidéo trop longue (max ${MAX_VIDEO_SECONDS}s).`); return; }
    } else if (photos.length === 0) { setError('Ajoutez au moins une photo.'); return; }
    if (tagIds.length === 0) { setError('Sélectionnez au moins une spécialité.'); return; }
    setSaving(true); setError('');
    const finalSpecialtyId = specialtyId || String(tagIds[0]);
    const form = new FormData();
    if (mode === 'video' && video) {
      form.append('video', video.file);
      if (video.durationSeconds != null) form.append('video_duration_seconds', String(video.durationSeconds));
    } else {
      photos.forEach((p) => form.append('images[]', p.file));
      if (avant) form.append('before_image', avant.file);
    }
    if (description) form.append('description', description);
    if (gender) form.append('gender', gender);
    if (finalSpecialtyId) form.append('specialty_id', finalSpecialtyId);
    form.append('tag_ids', JSON.stringify(tagIds));
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        body: form,
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || `Erreur ${res.status}`); }
      const newPost: ApiPost = await res.json();
      onSuccess(newPost);
    } catch (err) { setError(err instanceof Error ? err.message : 'Échec de la publication'); }
    finally { setSaving(false); }
  }

  return (
    <div className="bg-white rounded-[24px] shadow-[0_4px_16px_-6px_rgba(10,10,10,0.1)] ring-1 ring-neutral-100 overflow-hidden mb-5">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h3 className="font-bold text-neutral-900 text-sm">Nouvelle réalisation</h3>
          <p className="text-[11px] text-neutral-400 mt-0.5">Taguez précisément pour apparaître dans le bon feed</p>
        </div>
        <button type="button" onClick={onCancel} className="text-neutral-400 hover:text-neutral-700"><X size={18} /></button>
      </div>
      <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
        {error && <div className="text-sm text-red-500 bg-red-50 border border-red-100 px-4 py-2.5 rounded-xl">{error}</div>}

        <div className="flex gap-2">
          <button type="button" onClick={() => setMode('photos')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
              mode === 'photos' ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400'
            }`}>
            Photos
          </button>
          <button type="button" onClick={() => isPremium ? setMode('video') : (window.location.href = '/pro/chair-plus')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              mode === 'video' ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400'
            }`}>
            <Film size={12} className="flex-shrink-0" /> Vidéo
            {!isPremium && <PremiumBadge />}
          </button>
        </div>

        {mode === 'video'
          ? <VideoPicker video={video} onPick={setVideo} onRemove={() => { if (video) URL.revokeObjectURL(video.preview); setVideo(null); }} />
          : <PhotoGrid photos={photos} onAdd={addPhotos} onRemove={removePhoto} />}

        {mode === 'photos' && (
          <AvantPicker
            avant={avant}
            onPick={(f) => setAvant({ file: f, preview: URL.createObjectURL(f) })}
            onRemove={() => { if (avant) URL.revokeObjectURL(avant.preview); setAvant(null); }}
          />
        )}
        <div>
          <label className="block text-xs font-semibold text-neutral-600 mb-2">Genre</label>
          <div className="flex gap-2">
            {(['homme', 'femme', ''] as const).map((g) => (
              <button key={g || 'unisex'} type="button" onClick={() => handleGenderChange(g)}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                  gender === g ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400'
                }`}>
                {g === 'homme' ? 'Homme' : g === 'femme' ? 'Femme' : 'Unisexe'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-2.5">
            <label className="text-xs font-semibold text-neutral-700">Spécialité(s)</label>
            <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded uppercase">Requis</span>
          </div>
          <TagSelector specialties={suggestedSpecialties} selectedIds={tagIds} onChange={setTagIds} max={6} />
        </div>
        {tagIds.length > 1 && (
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-2">Spécialité principale</label>
            <div className="flex flex-wrap gap-2">
              {tagIds.map((id) => {
                const sp = specialties.find((s) => s.id === id);
                if (!sp) return null;
                const active = specialtyId === String(id);
                return (
                  <button key={id} type="button" onClick={() => setSpecialtyId(String(id))}
                    className={`flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full border-2 transition-all ${
                      active ? 'border-neutral-900 bg-neutral-900' : 'border-neutral-200 bg-neutral-50 hover:border-neutral-400'
                    }`}>
                    <SpecialtyThumb specialty={sp} size={22} />
                    <span className={`text-[11px] font-semibold whitespace-nowrap ${active ? 'text-white' : 'text-neutral-600'}`}>{sp.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
            Description <span className="font-normal text-neutral-400">(optionnelle)</span>
          </label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={3}
            placeholder="Technique, produits utilisés, résultat…"
            className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 resize-none placeholder:text-neutral-300" />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 border border-neutral-200 text-neutral-600 text-sm font-semibold rounded-xl hover:border-neutral-400 transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={saving || (mode === 'video' ? !video : photos.length === 0) || tagIds.length === 0}
            className="flex-1 py-2.5 bg-neutral-900 text-white text-sm font-semibold rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader size={15} className="animate-spin" /> : <Check size={15} />}
            {saving ? 'Publication...' : 'Publier'}
          </button>
        </div>
      </form>
    </div>
  );
}

function PostCard({ post, specialties, reorderMode, pinnedCount, onDelete, onUpdate, onTogglePin, dragHandlers }: {
  post: ApiPost; specialties: ApiSpecialty[]; reorderMode: boolean; pinnedCount: number;
  onDelete: () => void; onUpdate: (updated: ApiPost) => void; onTogglePin: () => void;
  dragHandlers?: { onPointerDown: (e: React.PointerEvent) => void };
}) {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(post.description ?? '');
  const [gender, setGender] = useState<'homme' | 'femme' | ''>(post.gender ?? '');
  const [tagIds, setTagIds] = useState<number[]>((post.tags ?? []).map((t) => t.id));
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [pinError, setPinError] = useState('');
  const [actionsOpen, setActionsOpen] = useState(false);

  const allImages = getAllImagesRaw(post).map((url) => resolveMediaUrl(url) ?? '').filter(Boolean);
  const coverImg = allImages[0] ?? null;

  async function handleTogglePin() {
    // Garde côté client — évite l'aller-retour réseau pour le cas courant.
    // Le backend refait la même vérification en 422 (défense en profondeur),
    // gérée dans le catch ci-dessous si jamais désynchronisée.
    if (!post.is_pinned && pinnedCount >= MAX_PINNED_POSTS) {
      setPinError(`Vous ne pouvez épingler que ${MAX_PINNED_POSTS} réalisations maximum. Désépinglez-en une avant d'en ajouter une nouvelle.`);
      setTimeout(() => setPinError(''), 3500);
      return;
    }
    setPinning(true);
    setPinError('');
    try {
      await api.post<{ is_pinned: boolean }>(`/posts/${post.id}/pin`, {});
      onTogglePin();
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Échec de l\'épinglage');
      setTimeout(() => setPinError(''), 3500);
    }
    setPinning(false);
  }

  async function handleUpdate() {
    setSaving(true);
    try {
      const updated = await api.put<ApiPost>(`/posts/${post.id}`, {
        description: description || null,
        gender: gender || null,
        tag_ids: JSON.stringify(tagIds),
      });
      onUpdate(updated); setEditing(false);
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function handleToggleArchive() {
    setArchiving(true);
    try {
      // Archiver = dépublier : disparaît du feed public et des classements
      // (mêmes filtres is_published côté backend), reste visible ici pour
      // pouvoir republier — jamais une suppression déguisée.
      const updated = await api.put<ApiPost>(`/posts/${post.id}`, { is_published: !post.is_published });
      onUpdate(updated);
    } catch { /* ignore */ }
    setArchiving(false);
  }

  async function handleDelete() {
    await api.delete(`/posts/${post.id}`).catch(() => {});
    onDelete();
  }

  if (editing) {
    return (
      <div className="bg-white rounded-[20px] shadow-[0_3px_14px_-6px_rgba(10,10,10,0.1)] ring-1 ring-neutral-100 p-4 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-bold text-neutral-900">Modifier</p>
          <button onClick={() => setEditing(false)} className="text-neutral-400 hover:text-neutral-700"><X size={16} /></button>
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-600 mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 resize-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Genre</label>
          <div className="flex gap-2">
            {(['homme', 'femme', ''] as const).map((g) => (
              <button key={g || 'unisex'} type="button" onClick={() => setGender(g)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                  gender === g ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400'
                }`}>
                {g === 'homme' ? 'Homme' : g === 'femme' ? 'Femme' : 'Unisexe'}
              </button>
            ))}
          </div>
        </div>
        <TagSelector specialties={specialties} selectedIds={tagIds} onChange={setTagIds} label="Spécialités" />
        <div className="flex gap-2">
          <button onClick={() => setEditing(false)}
            className="flex-1 py-2 border border-neutral-200 text-neutral-600 text-xs font-semibold rounded-xl hover:border-neutral-400 transition-colors">
            Annuler
          </button>
          <button onClick={handleUpdate} disabled={saving}
            className="flex-1 py-2 bg-neutral-900 text-white text-xs font-semibold rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
            {saving ? <Loader size={13} className="animate-spin" /> : <Check size={13} />} Enregistrer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-post-id={post.id} className={`relative bg-white rounded-[20px] shadow-[0_3px_14px_-6px_rgba(10,10,10,0.12)] overflow-hidden group ${post.is_pinned ? 'ring-2 ring-neutral-900' : 'ring-1 ring-neutral-100'} ${reorderMode ? 'select-none' : ''}`}>
      {/* Cover image */}
      <div className={`relative aspect-square bg-neutral-100 ${!post.is_published ? 'opacity-50' : ''}`}>
        {coverImg ? (
          <Image src={coverImg} alt="" fill className="object-cover" sizes="200px" draggable={false} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={20} className="text-neutral-300" />
          </div>
        )}
        {post.is_pinned && (
          <div className="absolute top-2 left-2 w-6 h-6 bg-neutral-900 rounded-full flex items-center justify-center">
            <Pin size={11} className="text-white" fill="currentColor" />
          </div>
        )}
        {post.type === 'video' && (
          <>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
                <Play size={16} className="text-white ml-0.5" fill="currentColor" />
              </div>
            </div>
            {post.video_duration_seconds != null && (
              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                {post.video_duration_seconds}s
              </div>
            )}
          </>
        )}
        {allImages.length > 1 && (
          <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            {allImages.length} photos
          </div>
        )}
        {!post.is_published && (
          <div className="absolute top-2 right-2 bg-neutral-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide">
            Archivé
          </div>
        )}

        {reorderMode ? (
          /* ── Mode réorganisation : toute la carte devient une poignée de drag ── */
          <div
            onPointerDown={dragHandlers?.onPointerDown}
            className="absolute inset-0 bg-black/10 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
          >
            <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-lg">
              <GripVertical size={16} className="text-neutral-700" />
            </div>
          </div>
        ) : (
          <>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
            {/* Un seul point d'entrée, à 44 px de zone tactile.

                Avant : quatre boutons de 28 px en `opacity-0`, révélés au
                survol. Or il n'y a pas de survol sur un téléphone — ils
                restaient invisibles ET cliquables. On pouvait archiver ou
                supprimer une réalisation sans avoir vu le bouton touché.
                Voir components/pro/PostActionsSheet.tsx. */}
            <button
              onClick={() => setActionsOpen(true)}
              aria-label="Actions de cette réalisation"
              className="absolute top-2 left-2 w-8 h-8 before:absolute before:-inset-1.5 before:content-[''] bg-white/90 rounded-lg flex items-center justify-center hover:bg-white transition-colors"
            >
              <MoreHorizontal size={15} className="text-neutral-700" />
            </button>
            {actionsOpen && (
              <PostActionsSheet
                onClose={() => setActionsOpen(false)}
                isPinned={!!post.is_pinned}
                isPublished={post.is_published}
                busy={pinning || archiving}
                onTogglePin={handleTogglePin}
                onEdit={() => setEditing(true)}
                onToggleArchive={handleToggleArchive}
                onDelete={handleDelete}
              />
            )}
          </>
        )}
        {pinError && (
          <div className="absolute inset-x-0 bottom-0 bg-neutral-900/90 text-white text-[10px] font-semibold px-2 py-1.5 leading-tight">
            {pinError}
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-1 mb-1.5 min-w-0">
          {(post.specialty ?? post.tags?.[0]) && (
            <span className="flex items-center gap-1 min-w-0 bg-neutral-50 rounded-full pl-0.5 pr-2 py-0.5 flex-shrink">
              <SpecialtyThumb specialty={(post.specialty ?? post.tags![0])} size={16} />
              <span className="text-[9px] font-semibold text-neutral-500 truncate">{(post.specialty ?? post.tags![0]).name}</span>
            </span>
          )}
          {post.gender && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase bg-neutral-100 text-neutral-600 flex-shrink-0">{post.gender}</span>
          )}
        </div>
        <div className="flex items-center gap-2.5 text-[10px] text-neutral-400">
          <span className="flex items-center gap-0.5"><Eye size={10} /> {post.views_count}</span>
          <span className="flex items-center gap-0.5"><Star size={10} /> {post.likes_count}</span>
          {(post.saved_count ?? 0) > 0 && (
            <span className="flex items-center gap-0.5"><Bookmark size={10} /> {post.saved_count}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const { user, isLoading: authLoading } = useRequireAuth(['hairdresser']);
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [specialties, setSpecialties] = useState<ApiSpecialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const draggedIdRef = useRef<number | null>(null);
  const [saved, setSaved] = useState(false);

  // ── Drag pour réorganiser — pointer events bruts (cohérent avec l'agenda),
  //    pas de librairie de DnD : le HTML5 drag-and-drop natif ne fonctionne
  //    pas au toucher sur mobile, or l'app est mobile-first.
  function handleDragPointerDown(postId: number) {
    return (e: React.PointerEvent) => {
      e.preventDefault();
      draggedIdRef.current = postId;
      try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}

      function onMove(ev: PointerEvent) {
        const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-post-id]');
        const overId = el ? Number(el.getAttribute('data-post-id')) : null;
        if (overId == null || overId === draggedIdRef.current) return;
        setPosts((prev) => {
          const from = prev.findIndex((p) => p.id === draggedIdRef.current);
          const to   = prev.findIndex((p) => p.id === overId);
          if (from === -1 || to === -1) return prev;
          const next = [...prev];
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved);
          return next;
        });
      }

      function onUp() {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        draggedIdRef.current = null;
        setPosts((current) => {
          api.put('/posts/reorder', { order: current.map((p) => p.id) }).then(() => {
            setSaved(true);
            setTimeout(() => setSaved(false), 1800);
          }).catch(() => {});
          return current;
        });
      }

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp, { once: true });
    };
  }

  const loadData = useCallback(() => {
    if (!user) return;
    Promise.all([
      api.get<ApiPost[]>('/posts'),
      fetch(`${API_URL}/specialties`).then((r) => r.json()),
    ])
      .then(([postsData, specs]) => { setPosts(postsData); setSpecialties(specs); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  const totalViews = posts.reduce((acc, p) => acc + (p.views_count ?? 0), 0);
  const totalLikes = posts.reduce((acc, p) => acc + (p.likes_count ?? 0), 0);

  // Meilleure réalisation + spécialité dominante — sur les réalisations
  // publiées uniquement (ce que les clients voient réellement), calculé côté
  // client depuis les données déjà chargées, pas de nouvel appel API.
  const publishedPosts = posts.filter((p) => p.is_published);
  const bestPost = publishedPosts.length > 0
    ? [...publishedPosts].sort((a, b) => (b.likes_count ?? 0) - (a.likes_count ?? 0))[0]
    : null;
  // La spécialité primaire (specialty_id) est toujours renseignée à la
  // création — les tags multi-spécialités (post_tags) sont optionnels et
  // souvent absents en pratique, donc pas fiables seuls pour ce calcul.
  const specialtyCounts = new Map<string, number>();
  publishedPosts.forEach((p) => {
    const names = p.specialty ? [p.specialty.name] : (p.tags ?? []).map((t) => t.name);
    names.forEach((name) => specialtyCounts.set(name, (specialtyCounts.get(name) ?? 0) + 1));
  });
  const dominantSpecialty = [...specialtyCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return (
    <div className="min-h-screen bg-neutral-50 pb-28">

      {/* Header mobile — même gabarit que le reste de CHAIR PRO (profil, services,
          notifications...) : évite de dupliquer un second bandeau de marque
          juste sous ProTopBar (retour de Julien, la page faisait "horrible"). */}
      <div className="px-4 pt-4 md:hidden">
        <DashboardPageHeader
          title="Portfolio"
          right={
            saved ? (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-green-600">
                <Check size={12} />Enregistré
              </span>
            ) : reorderMode ? (
              <button onClick={() => setReorderMode(false)} className="text-[13px] font-semibold text-neutral-900">
                Terminé
              </button>
            ) : (
              <div className="flex items-center gap-3">
                {!showForm && posts.length > 1 && (
                  <button onClick={() => setReorderMode(true)}
                    className="relative before:absolute before:-inset-y-[13px] before:inset-x-0 before:content-[''] flex items-center gap-1 text-[12px] font-medium text-neutral-500 hover:text-neutral-900 transition-colors">
                    <Move size={13} />Réorganiser
                  </button>
                )}
                {!showForm && (
                  <button onClick={() => setShowForm(true)} aria-label="Ajouter une réalisation"
                    className="relative before:absolute before:-inset-1.5 before:content-[''] w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center hover:bg-neutral-700 transition-colors flex-shrink-0">
                    <Plus size={16} strokeWidth={2.25} />
                  </button>
                )}
              </div>
            )
          }
        />
      </div>

      {/* Header desktop */}
      <header className="hidden md:flex sticky top-0 z-10 bg-white border-b border-neutral-100 px-4 md:px-8 h-14 items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/pro" className="flex items-center text-neutral-500 hover:text-neutral-900 transition-colors p-1 -ml-1 rounded-lg">
            <ChevronLeft size={18} />
          </Link>
          <span className="text-neutral-200">|</span>
          <span className="text-sm font-semibold text-neutral-900">Portfolio</span>
        </div>
        <div className="flex items-center gap-2.5">
          {saved && <span className="text-[12px] font-semibold text-green-600">Enregistré</span>}
          {!showForm && posts.length > 1 && (
            <button onClick={() => setReorderMode((v) => !v)}
              className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${
                reorderMode ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}>
              {reorderMode ? <Check size={15} /> : <Move size={15} />}
              {reorderMode ? 'Terminé' : 'Réorganiser'}
            </button>
          )}
          {!showForm && !reorderMode && (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-neutral-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-neutral-700 transition-colors">
              <Plus size={15} /> Ajouter une réalisation
            </button>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-3 md:pt-5">

        {/* Stats & temps forts — un seul panneau au lieu de plusieurs bandeaux empilés */}
        {!loading && posts.length > 0 && (
          <div className="bg-white rounded-[24px] shadow-[0_4px_16px_-6px_rgba(10,10,10,0.1)] ring-1 ring-neutral-100 px-4 py-4 mb-5">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { icon: ImageIcon, label: 'Réalisations', value: posts.length },
                { icon: Eye,       label: 'Vues totales', value: totalViews },
                { icon: Star,      label: 'J\'aime',      value: totalLikes },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label}>
                  <Icon size={15} className="text-neutral-400 mx-auto mb-1.5" strokeWidth={1.5} />
                  <p className="text-xl font-bold text-neutral-900 leading-none">{value}</p>
                  <p className="text-[9px] text-neutral-400 font-semibold mt-1 uppercase tracking-wide">{label}</p>
                </div>
              ))}
            </div>
            {(bestPost || dominantSpecialty) && (
              <div className="flex gap-4 mt-4 pt-4 border-t border-neutral-50">
                {bestPost && (
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <Award size={14} className="text-amber-500 flex-shrink-0" strokeWidth={1.5} />
                    <p className="text-[11px] text-neutral-500 truncate">
                      <span className="font-bold text-neutral-900">{bestPost.likes_count} j&apos;aime</span> · meilleure réalisation
                    </p>
                  </div>
                )}
                {dominantSpecialty && (
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <Scissors size={14} className="text-neutral-400 flex-shrink-0" strokeWidth={1.5} />
                    <p className="text-[11px] text-neutral-500 truncate">
                      <span className="font-bold text-neutral-900">{dominantSpecialty}</span> · spécialité dominante
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <AddPostForm
            specialties={specialties}
            isPremium={isChairPlusFromAuth(user?.hairdresser_profile)}
            onSuccess={(post) => { setPosts((prev) => [post, ...prev]); setShowForm(false); }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Posts grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square bg-neutral-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} specialties={specialties} reorderMode={reorderMode}
                pinnedCount={posts.filter((p) => p.is_pinned).length}
                onDelete={() => setPosts((prev) => prev.filter((p) => p.id !== post.id))}
                onUpdate={(updated) => setPosts((prev) => prev.map((p) => p.id === updated.id ? updated : p))}
                onTogglePin={() => setPosts((prev) => {
                  const next = prev.map((p) => p.id === post.id ? { ...p, is_pinned: !p.is_pinned } : p);
                  return [...next].sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned));
                })}
                dragHandlers={{ onPointerDown: handleDragPointerDown(post.id) }}
              />
            ))}
            {/* Add tile */}
            {!showForm && !reorderMode && (
              <button onClick={() => setShowForm(true)}
                className="aspect-square rounded-2xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-2 text-neutral-300 hover:border-neutral-400 hover:text-neutral-500 transition-colors">
                <Plus size={24} />
                <span className="text-[10px] font-semibold">Ajouter</span>
              </button>
            )}
          </div>
        ) : !showForm ? (
          <div className="rounded-3xl bg-gradient-to-b from-neutral-900 to-neutral-800 px-6 py-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-5 mx-auto">
              <Sparkles size={26} className="text-white" strokeWidth={1.5} />
            </div>
            <h3 className="font-bold text-white text-lg mb-2">Votre portfolio commence ici</h3>
            <p className="text-sm text-white/50 mb-6 max-w-sm mx-auto leading-relaxed">
              Chaque réalisation publiée travaille pour vous, même quand vous ne coiffez pas.
            </p>
            <div className="grid grid-cols-1 gap-2.5 max-w-xs mx-auto mb-7 text-left">
              {[
                { icon: Eye, text: 'Référencement — vous apparaissez dans plus de recherches CHAIR' },
                { icon: Award, text: 'Badges — le portfolio alimente directement vos paliers carrière' },
                { icon: TrendingUp, text: 'Classement — chaque réalisation compte dans votre score spécialité' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-2.5 bg-white/5 rounded-xl px-3.5 py-2.5">
                  <Icon size={14} className="text-white/60 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <p className="text-[12px] text-white/70 leading-snug">{text}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setShowForm(true)}
              className="bg-white text-neutral-900 text-sm font-semibold px-6 py-3 rounded-2xl hover:bg-white/90 transition-colors">
              Publier ma première réalisation
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
