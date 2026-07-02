'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import type { ApiPost, ApiSpecialty } from '@/lib/types';
import { getAllImagesRaw, resolveMediaUrl } from '@/lib/types';
import { getStoredToken } from '@/lib/auth';
import {
  Plus, Trash2, Edit2, X, Check, Camera, Loader, ImageIcon,
  Eye, Star, TrendingUp,
} from 'lucide-react';
import DashboardNav from '@/components/layout/DashboardNav';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
const MAX_PHOTOS = 10;

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
      <div className="flex items-center justify-between mb-2">
        {label && <label className="text-xs font-semibold text-neutral-600">{label}</label>}
        <span className={`text-[10px] text-neutral-400 ${!label ? 'ml-auto' : ''}`}>{selectedIds.length}/{max}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {specialties.map((s) => {
          const active = selectedIds.includes(s.id);
          return (
            <button key={s.id} type="button" onClick={() => toggle(s.id)}
              className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${
                active ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400 hover:text-neutral-900'
              }`}>
              {s.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AddPostForm({ specialties, onSuccess, onCancel }: {
  specialties: ApiSpecialty[];
  onSuccess: (post: ApiPost) => void;
  onCancel: () => void;
}) {
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [description, setDescription] = useState('');
  const [gender, setGender] = useState<'homme' | 'femme' | ''>('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const suggestedSpecialties = gender === 'homme'
    ? specialties.filter(s => ['barber', 'coupe-homme', 'taper', 'fade', 'degrade', 'buzz-cut'].includes(s.slug))
    : gender === 'femme'
    ? specialties.filter(s => ['balayage', 'blond', 'coloration', 'ombre-hair', 'boucles', 'extensions', 'lissage', 'coupe-femme', 'mariage', 'hair-contouring', 'chignon', 'tie-dye'].includes(s.slug))
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
    if (photos.length === 0) { setError('Ajoutez au moins une photo.'); return; }
    if (tagIds.length === 0) { setError('Sélectionnez au moins une spécialité.'); return; }
    setSaving(true); setError('');
    const finalSpecialtyId = specialtyId || String(tagIds[0]);
    const form = new FormData();
    photos.forEach((p) => form.append('images[]', p.file));
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
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden mb-5">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h3 className="font-semibold text-neutral-900 text-sm">Nouvelle réalisation</h3>
          <p className="text-[11px] text-neutral-400 mt-0.5">Taguez précisément pour apparaître dans le bon feed</p>
        </div>
        <button type="button" onClick={onCancel} className="text-neutral-400 hover:text-neutral-700"><X size={18} /></button>
      </div>
      <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
        {error && <div className="text-sm text-red-500 bg-red-50 border border-red-100 px-4 py-2.5 rounded-xl">{error}</div>}
        <PhotoGrid photos={photos} onAdd={addPhotos} onRemove={removePhoto} />
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
        <div className={`rounded-xl p-3 -mx-1 ${tagIds.length === 0 ? 'bg-amber-50 border border-amber-100' : ''}`}>
          <div className="flex items-center gap-1.5 mb-2">
            <label className="text-xs font-semibold text-neutral-700">Spécialité(s)</label>
            <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded uppercase">Requis</span>
          </div>
          <TagSelector specialties={suggestedSpecialties} selectedIds={tagIds} onChange={setTagIds} max={6} />
        </div>
        {tagIds.length > 1 && (
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Tag principal</label>
            <div className="flex flex-wrap gap-1.5">
              {tagIds.map((id) => {
                const sp = specialties.find((s) => s.id === id);
                if (!sp) return null;
                return (
                  <button key={id} type="button" onClick={() => setSpecialtyId(String(id))}
                    className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${
                      specialtyId === String(id) ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:border-neutral-400'
                    }`}>
                    {sp.name}
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
          <button type="submit" disabled={saving || photos.length === 0 || tagIds.length === 0}
            className="flex-1 py-2.5 bg-neutral-900 text-white text-sm font-semibold rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader size={15} className="animate-spin" /> : <Check size={15} />}
            {saving ? 'Publication...' : 'Publier'}
          </button>
        </div>
      </form>
    </div>
  );
}

function PostCard({ post, specialties, onDelete, onUpdate }: {
  post: ApiPost; specialties: ApiSpecialty[];
  onDelete: () => void; onUpdate: (updated: ApiPost) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(post.description ?? '');
  const [gender, setGender] = useState<'homme' | 'femme' | ''>(post.gender ?? '');
  const [tagIds, setTagIds] = useState<number[]>((post.tags ?? []).map((t) => t.id));
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const allImages = getAllImagesRaw(post).map((url) => resolveMediaUrl(url) ?? '').filter(Boolean);
  const coverImg = allImages[0] ?? null;

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

  async function handleDelete() {
    await api.delete(`/posts/${post.id}`).catch(() => {});
    onDelete();
  }

  if (editing) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-100 p-4 space-y-3">
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
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden group">
      {/* Cover image */}
      <div className="relative aspect-square bg-neutral-100">
        {coverImg ? (
          <Image src={coverImg} alt="" fill className="object-cover" sizes="200px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={20} className="text-neutral-300" />
          </div>
        )}
        {allImages.length > 1 && (
          <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            {allImages.length} photos
          </div>
        )}
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
        {/* Actions overlay */}
        <div className="absolute top-2 left-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditing(true)}
            className="w-7 h-7 bg-white/90 rounded-lg flex items-center justify-center hover:bg-white transition-colors">
            <Edit2 size={12} className="text-neutral-700" />
          </button>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="w-7 h-7 bg-white/90 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors">
              <Trash2 size={12} className="text-neutral-500 hover:text-red-500" />
            </button>
          ) : (
            <div className="flex gap-1">
              <button onClick={handleDelete}
                className="text-[10px] font-bold bg-red-500 text-white px-2 py-1 rounded-lg">
                Suppr.
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="text-[10px] font-bold bg-white/90 text-neutral-600 px-2 py-1 rounded-lg">
                Non
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="px-3 py-2.5">
        <div className="flex flex-wrap gap-1 mb-1.5">
          {post.gender && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
              post.gender === 'homme' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'
            }`}>{post.gender}</span>
          )}
          {(post.tags ?? []).slice(0, 2).map((t) => (
            <span key={t.id} className="text-[9px] font-semibold text-neutral-400 bg-neutral-50 border border-neutral-100 px-1.5 py-0.5 rounded-full">
              {t.name}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2.5 text-[10px] text-neutral-400">
          <span className="flex items-center gap-0.5"><Eye size={10} /> {post.views_count}</span>
          <span className="flex items-center gap-0.5"><Star size={10} /> {post.likes_count}</span>
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

  return (
    <div className="min-h-screen bg-neutral-50 pb-28">
      <DashboardNav />

      {/* Mobile header */}
      <div className="md:hidden sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-neutral-100 px-4 h-14 pt-safe flex items-center justify-between">
        <span className="text-base font-bold text-neutral-900">Portfolio</span>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-neutral-900 text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-neutral-700 transition-colors">
            <Plus size={13} /> Ajouter
          </button>
        )}
      </div>

      {/* Desktop header */}
      <header className="hidden md:flex sticky top-0 z-10 bg-white border-b border-neutral-100 px-8 h-14 items-center justify-between">
        <span className="text-sm font-bold text-neutral-900">Portfolio</span>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-neutral-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-neutral-700 transition-colors">
            <Plus size={15} /> Ajouter une réalisation
          </button>
        )}
      </header>

      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-5">

        {/* Stats strip */}
        {!loading && posts.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { icon: ImageIcon, label: 'Réalisations', value: posts.length },
              { icon: Eye,       label: 'Vues totales', value: totalViews },
              { icon: Star,      label: 'J\'aime',      value: totalLikes },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white rounded-2xl border border-neutral-100 p-3.5 text-center">
                <Icon size={15} className="text-neutral-400 mx-auto mb-1.5" strokeWidth={1.5} />
                <p className="text-lg font-bold text-neutral-900 leading-none">{value}</p>
                <p className="text-[9px] text-neutral-400 font-medium mt-1 uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Trend hint */}
        {!loading && posts.length >= 3 && totalViews > 0 && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 mb-5">
            <TrendingUp size={14} className="text-green-600 flex-shrink-0" />
            <p className="text-xs text-green-700 font-medium">
              Votre portfolio attire l&apos;attention — continuez à publier régulièrement.
            </p>
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <AddPostForm
            specialties={specialties}
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
              <PostCard key={post.id} post={post} specialties={specialties}
                onDelete={() => setPosts((prev) => prev.filter((p) => p.id !== post.id))}
                onUpdate={(updated) => setPosts((prev) => prev.map((p) => p.id === updated.id ? updated : p))}
              />
            ))}
            {/* Add tile */}
            {!showForm && (
              <button onClick={() => setShowForm(true)}
                className="aspect-square rounded-2xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-2 text-neutral-300 hover:border-neutral-400 hover:text-neutral-500 transition-colors">
                <Plus size={24} />
                <span className="text-[10px] font-semibold">Ajouter</span>
              </button>
            )}
          </div>
        ) : !showForm ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
              <Camera size={26} className="text-neutral-300" />
            </div>
            <h3 className="font-semibold text-neutral-900 mb-2">Portfolio vide</h3>
            <p className="text-sm text-neutral-400 mb-5 max-w-xs">
              Publiez vos premières réalisations pour commencer votre portfolio beauté.
            </p>
            <button onClick={() => setShowForm(true)}
              className="bg-neutral-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-neutral-700 transition-colors">
              Ajouter une réalisation
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
