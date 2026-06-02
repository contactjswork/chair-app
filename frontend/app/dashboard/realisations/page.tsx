'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import type { ApiPost, ApiSpecialty } from '@/lib/types';
import { getAllImagesRaw, resolveMediaUrl } from '@/lib/types';
import { getStoredToken } from '@/lib/auth';
import { ChevronLeft, Plus, Trash2, Edit2, X, Check, Camera, Loader, ImageIcon } from 'lucide-react';
import DashboardNav from '@/components/layout/DashboardNav';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

const PHOTO_LIMITS = [1, 2, 3, 5, 10] as const;
const MAX_PHOTOS = 10;

// ── Sélecteur multi-photos ─────────────────────────────────────────

interface PhotoFile {
  file: File;
  preview: string;
}

function PhotoGrid({
  photos,
  onAdd,
  onRemove,
}: {
  photos: PhotoFile[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = MAX_PHOTOS - photos.length;
    onAdd(files.slice(0, remaining));
    e.target.value = '';
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {photos.map((p, i) => (
          <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-neutral-100">
            <Image src={p.preview} alt={`Photo ${i + 1}`} fill className="object-cover" />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
            >
              <X size={12} />
            </button>
            {i === 0 && (
              <div className="absolute bottom-1.5 left-1.5 bg-black/50 backdrop-blur-sm text-white text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide">
                Couverture
              </div>
            )}
          </div>
        ))}

        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-1.5 text-neutral-300 hover:border-neutral-400 hover:text-neutral-500 transition-colors"
          >
            <Camera size={22} />
            <span className="text-[10px]">Ajouter</span>
          </button>
        )}
      </div>

      {photos.length > 0 && (
        <p className="text-[11px] text-neutral-400">
          {photos.length}/{MAX_PHOTOS} photo{photos.length > 1 ? 's' : ''}
          {photos.length < MAX_PHOTOS && ` — vous pouvez en ajouter ${MAX_PHOTOS - photos.length} de plus`}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

// ── Formulaire d'ajout ─────────────────────────────────────────────

function AddPostForm({
  specialties,
  onSuccess,
  onCancel,
}: {
  specialties: ApiSpecialty[];
  onSuccess: (post: ApiPost) => void;
  onCancel: () => void;
}) {
  const [photos,      setPhotos]      = useState<PhotoFile[]>([]);
  const [description, setDescription] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  function addPhotos(files: File[]) {
    const newPhotos: PhotoFile[] = files.map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
    }));
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
    if (photos.length === 0) { setError('Ajoutez au moins une photo.'); return; }
    setSaving(true);
    setError('');

    const form = new FormData();
    photos.forEach((p) => form.append('images[]', p.file));
    if (description)  form.append('description',  description);
    if (specialtyId)  form.append('specialty_id', specialtyId);

    try {
      const token = getStoredToken();
      const res = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Erreur ${res.status}`);
      }
      const newPost: ApiPost = await res.json();
      onSuccess(newPost);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la publication");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden mb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h3 className="font-semibold text-neutral-900 text-sm">Nouvelle réalisation</h3>
        <button type="button" onClick={onCancel} className="text-neutral-400 hover:text-neutral-700 transition-colors">
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
        {error && (
          <div className="text-sm text-red-500 bg-red-50 border border-red-100 px-4 py-2.5 rounded-xl">{error}</div>
        )}

        {/* Sélecteur photos */}
        {photos.length === 0 ? (
          <PhotoGrid photos={photos} onAdd={addPhotos} onRemove={removePhoto} />
        ) : (
          <PhotoGrid photos={photos} onAdd={addPhotos} onRemove={removePhoto} />
        )}

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Balayage beige froid réalisé avec contouring lumineux et gloss de finition. Technique : mèches au balai + shampoing violet neutralisant."
            className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 resize-none placeholder:text-neutral-300"
          />
        </div>

        {/* Spécialité */}
        <div>
          <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Spécialité</label>
          <select
            value={specialtyId}
            onChange={(e) => setSpecialtyId(e.target.value)}
            className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400"
          >
            <option value="">— Sélectionner</option>
            {specialties.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 border border-neutral-200 text-neutral-600 text-sm font-semibold rounded-xl hover:border-neutral-400 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving || photos.length === 0}
            className="flex-1 py-2.5 bg-neutral-900 text-white text-sm font-semibold rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader size={15} className="animate-spin" /> : <Check size={15} />}
            {saving ? 'Publication...' : 'Publier'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Carte réalisation ──────────────────────────────────────────────

function PostItem({
  post,
  specialties,
  onDelete,
  onUpdate,
}: {
  post: ApiPost;
  specialties: ApiSpecialty[];
  onDelete: () => void;
  onUpdate: (updated: ApiPost) => void;
}) {
  const [editing,       setEditing]       = useState(false);
  const [description,   setDescription]   = useState(post.description ?? '');
  const [specialtyId,   setSpecialtyId]   = useState(String(post.specialty?.id ?? ''));
  const [saving,        setSaving]        = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const allImages = getAllImagesRaw(post)
    .map((url) => resolveMediaUrl(url) ?? '')
    .filter(Boolean);

  async function handleUpdate() {
    setSaving(true);
    try {
      const updated = await api.put<ApiPost>(`/posts/${post.id}`, {
        description:  description || null,
        specialty_id: specialtyId ? parseInt(specialtyId) : null,
      });
      onUpdate(updated);
      setEditing(false);
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function handleDelete() {
    await api.delete(`/posts/${post.id}`).catch(() => {});
    onDelete();
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
      {/* Miniatures des photos */}
      {allImages.length > 0 && (
        <div className="flex gap-px bg-neutral-100 overflow-hidden rounded-t-2xl">
          {allImages.slice(0, 3).map((src, i) => (
            <div key={i} className={`relative ${allImages.length === 1 ? 'w-full' : 'flex-1'} aspect-square`}>
              <Image src={src} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="200px" />
            </div>
          ))}
          {allImages.length > 3 && (
            <div className="relative flex-1 aspect-square bg-neutral-900 flex items-center justify-center">
              <span className="text-white text-sm font-semibold">+{allImages.length - 3}</span>
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        {!editing ? (
          <>
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {post.specialty && (
                    <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-neutral-400">
                      {post.specialty.name}
                    </span>
                  )}
                  {allImages.length > 1 && (
                    <span className="text-[10px] text-neutral-300 flex items-center gap-0.5">
                      <ImageIcon size={10} />
                      {allImages.length}
                    </span>
                  )}
                </div>
                {post.description && (
                  <p className="text-sm text-neutral-600 line-clamp-2">{post.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-neutral-400">
                  <span>{post.likes_count} j'aime</span>
                  <span>{post.views_count} vues</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 text-xs text-neutral-500 border border-neutral-200 px-3 py-1.5 rounded-lg hover:border-neutral-400 hover:text-neutral-900 transition-colors"
              >
                <Edit2 size={12} /> Modifier
              </button>
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 text-xs text-neutral-400 border border-neutral-200 px-3 py-1.5 rounded-lg hover:border-red-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={12} /> Supprimer
                </button>
              ) : (
                <div className="flex gap-1.5">
                  <button onClick={handleDelete}
                    className="text-xs text-white bg-red-500 border border-red-500 px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors">
                    Confirmer
                  </button>
                  <button onClick={() => setConfirmDelete(false)}
                    className="text-xs text-neutral-500 border border-neutral-200 px-3 py-1.5 rounded-lg hover:border-neutral-400 transition-colors">
                    Annuler
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Spécialité</label>
              <select value={specialtyId} onChange={(e) => setSpecialtyId(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400">
                <option value="">—</option>
                {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)}
                className="flex-1 py-2 border border-neutral-200 text-neutral-600 text-xs font-semibold rounded-xl hover:border-neutral-400 transition-colors">
                Annuler
              </button>
              <button onClick={handleUpdate} disabled={saving}
                className="flex-1 py-2 bg-neutral-900 text-white text-xs font-semibold rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                {saving ? <Loader size={13} className="animate-spin" /> : <Check size={13} />}
                Enregistrer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────

export default function DashboardRealisationsPage() {
  const { user, isLoading: authLoading } = useRequireAuth(['hairdresser']);
  const [posts,       setPosts]       = useState<ApiPost[]>([]);
  const [specialties, setSpecialties] = useState<ApiSpecialty[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);

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
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-sm text-neutral-400">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      <DashboardNav />

      {/* Header mobile */}
      <div className="px-4 pt-4 flex items-center justify-between md:hidden">
        <DashboardPageHeader title="Réalisations" />
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-neutral-900 text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-neutral-700 transition-colors"
          >
            <Plus size={13} />
            Ajouter
          </button>
        )}
      </div>

      {/* Header desktop */}
      <header className="hidden md:flex sticky top-0 z-10 bg-white border-b border-neutral-100 px-4 md:px-8 h-14 items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900">
            <ChevronLeft size={16} />
            Dashboard
          </Link>
          <span className="text-neutral-200">|</span>
          <span className="text-sm font-semibold text-neutral-900">Mes réalisations</span>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-neutral-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-neutral-700 transition-colors"
          >
            <Plus size={15} />
            Ajouter
          </button>
        )}
      </header>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
        {showForm && (
          <AddPostForm
            specialties={specialties}
            onSuccess={(post) => { setPosts((prev) => [post, ...prev]); setShowForm(false); }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="aspect-square bg-neutral-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : posts.length > 0 ? (
          <>
            <p className="text-xs text-neutral-400 mb-4">
              {posts.length} réalisation{posts.length > 1 ? 's' : ''} publiée{posts.length > 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {posts.map((post) => (
                <PostItem
                  key={post.id}
                  post={post}
                  specialties={specialties}
                  onDelete={() => setPosts((prev) => prev.filter((p) => p.id !== post.id))}
                  onUpdate={(updated) => setPosts((prev) => prev.map((p) => p.id === updated.id ? updated : p))}
                />
              ))}
            </div>
          </>
        ) : !showForm ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
              <Camera size={26} className="text-neutral-300" />
            </div>
            <h3 className="font-semibold text-neutral-900 mb-2">Aucune réalisation</h3>
            <p className="text-sm text-neutral-400 mb-5 max-w-xs">
              Publiez vos premières photos pour commencer votre portfolio beauté.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-neutral-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-neutral-700 transition-colors"
            >
              Ajouter une réalisation
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
