'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import type { ApiPost, ApiSpecialty } from '@/lib/types';
import { getBeforeImage, getAfterImage } from '@/lib/types';
import { getStoredToken } from '@/lib/auth';
import { ChevronLeft, Plus, Trash2, Edit2, X, Check, Upload, Loader } from 'lucide-react';
import DashboardNav from '@/components/layout/DashboardNav';

const API = 'http://localhost:8000';

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
  const afterRef  = useRef<HTMLInputElement>(null);
  const beforeRef = useRef<HTMLInputElement>(null);

  const [afterFile,   setAfterFile]   = useState<File | null>(null);
  const [beforeFile,  setBeforeFile]  = useState<File | null>(null);
  const [afterPreview,  setAfterPreview]  = useState('');
  const [beforePreview, setBeforePreview] = useState('');

  const [description,     setDescription]     = useState('');
  const [specialtyId,     setSpecialtyId]     = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [priceIndication, setPriceIndication] = useState('');

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  function pickFile(file: File, type: 'after' | 'before') {
    const preview = URL.createObjectURL(file);
    if (type === 'after')  { setAfterFile(file);  setAfterPreview(preview);  }
    if (type === 'before') { setBeforeFile(file); setBeforePreview(preview); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!afterFile) { setError('La photo résultat est obligatoire.'); return; }
    setSaving(true);
    setError('');

    const form = new FormData();
    form.append('after_image', afterFile);
    if (beforeFile) form.append('before_image', beforeFile);
    if (description)     form.append('description',      description);
    if (specialtyId)     form.append('specialty_id',     specialtyId);
    if (durationMinutes) form.append('duration_minutes', durationMinutes);
    if (priceIndication) form.append('price_indication', priceIndication);

    try {
      const token = getStoredToken();
      const res = await fetch(`${API}/api/posts`, {
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'ajout");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-neutral-100 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-neutral-900 text-sm">Nouvelle réalisation</h3>
        <button type="button" onClick={onCancel} className="text-neutral-400 hover:text-neutral-700">
          <X size={18} />
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-500 bg-red-50 border border-red-100 px-4 py-2 rounded-xl">{error}</div>
      )}

      {/* Photos — ordre narratif : Avant à gauche, Résultat à droite */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* Photo avant (optionnelle) */}
        <div>
          <p className="text-xs font-semibold text-neutral-600 mb-2">
            Photo avant <span className="text-neutral-400 font-normal">— optionnelle</span>
          </p>
          <div
            className="aspect-square rounded-xl overflow-hidden bg-neutral-100 border-2 border-dashed border-neutral-200 cursor-pointer hover:border-neutral-400 transition-colors flex items-center justify-center relative"
            onClick={() => beforeRef.current?.click()}
          >
            {beforePreview ? (
              <>
                <Image src={beforePreview} alt="Avant" fill className="object-cover" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setBeforeFile(null); setBeforePreview(''); }}
                  className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white"
                >
                  <X size={12} />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-neutral-300">
                <Upload size={24} />
                <span className="text-[11px]">Optionnelle</span>
              </div>
            )}
          </div>
          <input ref={beforeRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f, 'before'); }} />
        </div>

        {/* Photo résultat (obligatoire) */}
        <div>
          <p className="text-xs font-semibold text-neutral-600 mb-2">
            Photo résultat <span className="text-red-400">*</span>
          </p>
          <div
            className="aspect-square rounded-xl overflow-hidden bg-neutral-100 border-2 border-dashed border-neutral-200 cursor-pointer hover:border-neutral-400 transition-colors flex items-center justify-center relative"
            onClick={() => afterRef.current?.click()}
          >
            {afterPreview ? (
              <Image src={afterPreview} alt="Résultat" fill className="object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-neutral-300">
                <Upload size={24} />
                <span className="text-[11px]">Obligatoire</span>
              </div>
            )}
          </div>
          <input ref={afterRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f, 'after'); }} />
        </div>
      </div>

      {/* Champs texte */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Décrivez la technique, les produits utilisés..."
            className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 resize-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Spécialité</label>
            <select
              value={specialtyId}
              onChange={(e) => setSpecialtyId(e.target.value)}
              className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400"
            >
              <option value="">—</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Durée (min)</label>
            <input
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              min={0} max={480}
              placeholder="90"
              className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Prix (€)</label>
            <input
              type="number"
              value={priceIndication}
              onChange={(e) => setPriceIndication(e.target.value)}
              min={0} max={9999}
              placeholder="120"
              className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-5">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 border border-neutral-200 text-neutral-600 text-sm font-semibold rounded-xl hover:border-neutral-400 transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={saving || !afterFile}
          className="flex-1 py-2.5 bg-neutral-900 text-white text-sm font-semibold rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader size={15} className="animate-spin" /> : <Check size={15} />}
          {saving ? 'Publication...' : 'Publier'}
        </button>
      </div>
    </form>
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
  const [editing,         setEditing]         = useState(false);
  const [description,     setDescription]     = useState(post.description ?? '');
  const [specialtyId,     setSpecialtyId]     = useState(String(post.specialty?.id ?? ''));
  const [durationMinutes, setDurationMinutes] = useState(String(post.duration_minutes ?? ''));
  const [priceIndication, setPriceIndication] = useState(String(post.price_indication ?? ''));
  const [saving,          setSaving]          = useState(false);
  const [confirmDelete,   setConfirmDelete]   = useState(false);

  const beforeImage = getBeforeImage(post);
  const afterImage  = getAfterImage(post);

  async function handleUpdate() {
    setSaving(true);
    try {
      const updated = await api.put<ApiPost>(`/posts/${post.id}`, {
        description:      description || null,
        specialty_id:     specialtyId ? parseInt(specialtyId) : null,
        duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
        price_indication: priceIndication ? parseFloat(priceIndication) : null,
      });
      onUpdate(updated);
      setEditing(false);
    } catch { /* silently ignore */ }
    setSaving(false);
  }

  async function handleDelete() {
    await api.delete(`/posts/${post.id}`).catch(() => {});
    onDelete();
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
      {/* Images */}
      <div className={`grid ${beforeImage ? 'grid-cols-2 gap-px bg-neutral-900' : 'grid-cols-1'}`}>
        {beforeImage && (
          <div className="relative aspect-square">
            <Image src={beforeImage.startsWith('/storage/') ? `${API}${beforeImage}` : beforeImage}
              alt="Avant" fill className="object-cover" />
            <span className="absolute top-2 left-2 text-[9px] font-semibold tracking-widest uppercase text-white/70">Avant</span>
          </div>
        )}
        {afterImage && (
          <div className="relative aspect-square">
            <Image src={afterImage.startsWith('/storage/') ? `${API}${afterImage}` : afterImage}
              alt="Après" fill className="object-cover" />
            {beforeImage && (
              <span className="absolute top-2 right-2 text-[9px] font-semibold tracking-widest uppercase text-white/70">Après</span>
            )}
          </div>
        )}
      </div>

      {/* Infos / édition */}
      <div className="p-4">
        {!editing ? (
          <>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                {post.specialty && (
                  <span className="text-[10px] font-semibold tracking-wide uppercase text-neutral-400">
                    {post.specialty.name}
                  </span>
                )}
                {post.description && (
                  <p className="text-sm text-neutral-600 mt-1 line-clamp-2">{post.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-[11px] text-neutral-400">
                  {post.duration_minutes && <span>{post.duration_minutes} min</span>}
                  {post.price_indication && <span>à partir de {post.price_indication} €</span>}
                  <span>{post.likes_count} j'aime · {post.views_count} vues</span>
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
                  <button
                    onClick={handleDelete}
                    className="text-xs text-white bg-red-500 border border-red-500 px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Confirmer
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs text-neutral-500 border border-neutral-200 px-3 py-1.5 rounded-lg hover:border-neutral-400 transition-colors"
                  >
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
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Spécialité</label>
                <select value={specialtyId} onChange={(e) => setSpecialtyId(e.target.value)}
                  className="w-full px-2 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-400">
                  <option value="">—</option>
                  {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Durée (min)</label>
                <input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)}
                  className="w-full px-2 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Prix (€)</label>
                <input type="number" value={priceIndication} onChange={(e) => setPriceIndication(e.target.value)}
                  className="w-full px-2 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-400" />
              </div>
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

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get<ApiPost[]>('/posts'),
      fetch('http://localhost:8000/api/specialties').then((r) => r.json()),
    ])
      .then(([postsData, specs]) => { setPosts(postsData); setSpecialties(specs); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-sm text-neutral-400">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <DashboardNav />
      <header className="sticky top-0 z-10 bg-white border-b border-neutral-100 px-4 md:px-8 h-14 flex items-center justify-between">
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
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-neutral-50 flex items-center justify-center mb-4">
              <Plus size={24} className="text-neutral-300" />
            </div>
            <h3 className="font-semibold text-neutral-900 mb-2">Aucune réalisation</h3>
            <p className="text-sm text-neutral-400 mb-5">Publiez votre première photo pour commencer votre portfolio.</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-neutral-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-neutral-700 transition-colors"
            >
              Ajouter une réalisation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
