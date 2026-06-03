'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { resolveMediaUrl } from '@/lib/types';
import { api } from '@/lib/api';
import { ChevronLeft, User, Camera, Check, Sparkles } from 'lucide-react';
import ImageCropModal from '@/components/ui/ImageCropModal';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

// ── Données styles (même que onboarding) ──────────────────────────────

type Gender = 'femme' | 'homme' | 'non-binaire' | null;

interface StyleOpt { slug: string; label: string; photo: string; group: string }

const ALL_STYLES: StyleOpt[] = [
  // Femme – Couleur
  { group: 'Couleur',         slug: 'balayage',        label: 'Balayage',       photo: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=300&q=70' },
  { group: 'Couleur',         slug: 'blond',           label: 'Blond',          photo: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=300&q=70' },
  { group: 'Couleur',         slug: 'coloration',      label: 'Coloration',     photo: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&q=70' },
  { group: 'Couleur',         slug: 'ombre-hair',      label: 'Ombré Hair',     photo: 'https://images.unsplash.com/photo-1487412912498-0447578fcca8?w=300&q=70' },
  { group: 'Couleur',         slug: 'tie-dye',         label: 'Tie & Dye',      photo: 'https://images.unsplash.com/photo-1583864697784-a0efc8379f70?w=300&q=70' },
  { group: 'Couleur',         slug: 'roux',            label: 'Roux',           photo: 'https://images.unsplash.com/photo-1595475038665-403f0c0c0d0b?w=300&q=70' },
  { group: 'Couleur',         slug: 'hair-contouring', label: 'Hair Contouring',photo: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&q=70' },
  { group: 'Couleur',         slug: 'couleur-homme',   label: 'Couleur Homme',  photo: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=300&q=70' },
  // Coupe
  { group: 'Coupe',           slug: 'coupe-femme',     label: 'Coupe Femme',    photo: 'https://images.unsplash.com/photo-1595476589022-7c86ade2c24d?w=300&q=70' },
  { group: 'Coupe',           slug: 'coupe-courte',    label: 'Coupe Courte',   photo: 'https://images.unsplash.com/photo-1559620192-032c4bc4674e?w=300&q=70' },
  { group: 'Coupe',           slug: 'coupe-longue',    label: 'Coupe Longue',   photo: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=300&q=70' },
  { group: 'Coupe',           slug: 'frange',          label: 'Frange',         photo: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=300&q=70' },
  { group: 'Coupe',           slug: 'barber',          label: 'Barber',         photo: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=300&q=70' },
  { group: 'Coupe',           slug: 'coupe-homme',     label: 'Coupe Homme',    photo: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=300&q=70' },
  { group: 'Coupe',           slug: 'buzz-cut',        label: 'Buzz Cut',       photo: 'https://images.unsplash.com/photo-1520341280432-4749d4d7bcf9?w=300&q=70' },
  // Dégradés
  { group: 'Dégradé & Fade',  slug: 'degrade',         label: 'Dégradé',        photo: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=300&q=70' },
  { group: 'Dégradé & Fade',  slug: 'taper',           label: 'Taper',          photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=70' },
  { group: 'Dégradé & Fade',  slug: 'fade',            label: 'Skin Fade',      photo: 'https://images.unsplash.com/photo-1517832606415-31ad6e57ef1e?w=300&q=70' },
  // Texture
  { group: 'Texture & Style', slug: 'boucles',         label: 'Boucles',        photo: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=300&q=70' },
  { group: 'Texture & Style', slug: 'lissage',         label: 'Lissage',        photo: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=300&q=70' },
  { group: 'Texture & Style', slug: 'ondulations',     label: 'Ondulations',    photo: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=300&q=70' },
  { group: 'Texture & Style', slug: 'keratine',        label: 'Kératine',       photo: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&q=70' },
  { group: 'Texture & Style', slug: 'extensions',      label: 'Extensions',     photo: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=300&q=70' },
  { group: 'Texture & Style', slug: 'dreads',          label: 'Dreads & Locks', photo: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=300&q=70' },
  { group: 'Texture & Style', slug: 'barbe',           label: 'Barbe',          photo: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&q=70' },
  // Occasion
  { group: 'Occasion',        slug: 'mariage',         label: 'Mariée / Marié', photo: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=300&q=70' },
  { group: 'Occasion',        slug: 'chignon',         label: 'Chignon',        photo: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=300&q=70' },
  { group: 'Occasion',        slug: 'coiffure-soiree', label: 'Soirée',         photo: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=300&q=70' },
  { group: 'Occasion',        slug: 'braid',           label: 'Tresses',        photo: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=300&q=70' },
];

const GROUPS = [...new Set(ALL_STYLES.map((s) => s.group))];

const GENDER_OPTIONS: { value: Gender; label: string; emoji: string }[] = [
  { value: 'femme',        label: 'Femme',                   emoji: '♀' },
  { value: 'homme',        label: 'Homme',                   emoji: '♂' },
  { value: 'non-binaire',  label: 'Non-binaire',             emoji: '⊛' },
  { value: null,           label: 'Je préfère ne pas dire',  emoji: '·' },
];

// ─────────────────────────────────────────────────────────

export default function ModifierProfilPage() {
  const { user, updateUser, isLoading } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  // Profil
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [bio,  setBio]  = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarBlob,    setAvatarBlob]    = useState<Blob | null>(null);
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null);

  // Préférences
  const [gender,   setGender]   = useState<Gender>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.replace('/connexion');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      setName(user.name ?? '');
      setCity(user.city ?? '');
      setBio(user.bio ?? '');
    }
    // Charger les préférences depuis localStorage
    try {
      const raw = localStorage.getItem('chair_preferences');
      if (raw) {
        const prefs = JSON.parse(raw);
        setGender(prefs.gender ?? null);
        setSelected(new Set(prefs.interests ?? []));
      }
    } catch { /* ignore */ }
  }, [user]);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarCropSrc(URL.createObjectURL(file));
    e.target.value = '';
  }

  function handleCropConfirm(blob: Blob, previewUrl: string) {
    setAvatarCropSrc(null);
    setAvatarBlob(blob);
    setAvatarPreview(previewUrl);
  }

  function toggleSlug(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      // 1. Avatar si modifié
      if (avatarBlob) {
        const form = new FormData();
        form.append('avatar', avatarBlob, 'avatar.jpg');
        const token = localStorage.getItem('chair_token');
        const res = await fetch(`${API_BASE}/user/avatar`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          body: form,
        });
        if (res.ok) {
          const data = await res.json();
          updateUser({ avatar: data.avatar ?? data.url ?? user.avatar });
        }
      }

      // 2. Profil
      await api.put('/user/profile', { name, city, bio });
      updateUser({ name, city, bio });

      // 3. Préférences — localStorage + API (sync immédiate)
      const slugs = [...selected];
      const prefs = { gender, interests: slugs };
      localStorage.setItem('chair_preferences', JSON.stringify(prefs));

      const token = localStorage.getItem('chair_token');
      await fetch(`${API_BASE}/preferences`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ profile_type: gender, interests: slugs, goal: null }),
      });

      setSuccess(true);
      setTimeout(() => router.push('/compte'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !user) return null;

  const displayAvatar = avatarPreview ?? resolveMediaUrl(user.avatar);

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 pt-4 pb-32">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-100 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-neutral-900">Modifier mon profil</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* ── Avatar ── */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-24 h-24">
              <div className="w-full h-full rounded-full overflow-hidden bg-neutral-200 flex items-center justify-center">
                {displayAvatar ? (
                  <Image src={displayAvatar} alt={user.name} fill className="object-cover" sizes="96px" />
                ) : (
                  <User size={32} className="text-neutral-400" />
                )}
              </div>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center border-2 border-white hover:bg-neutral-700 transition-colors">
                <Camera size={13} className="text-white" />
              </button>
            </div>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors">
              Changer la photo
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* ── Infos profil ── */}
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-neutral-400 mb-1.5">Nom complet</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400 transition-colors" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-neutral-400 mb-1.5">Ville</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                placeholder="Paris, Lyon, Strasbourg…"
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400 transition-colors" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-neutral-400 mb-1.5">Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)}
                placeholder="Quelques mots sur vous…" rows={3}
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400 transition-colors resize-none" />
            </div>
          </div>

          {/* ── Mes goûts ── */}
          <div>
            <div className="flex items-center gap-1.5 mb-4">
              <Sparkles size={12} className="text-neutral-400" />
              <h2 className="text-[13px] font-bold tracking-[0.12em] uppercase text-neutral-700">
                Mes goûts &amp; inspirations
              </h2>
            </div>

            {/* Genre */}
            <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-neutral-400 mb-2">Genre</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {GENDER_OPTIONS.map(({ value, label, emoji }) => (
                <button key={label} type="button" onClick={() => setGender(value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[12px] font-medium transition-all duration-150 ${
                    gender === value
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
                  }`}>
                  <span>{emoji}</span>{label}
                </button>
              ))}
            </div>

            {/* Styles par groupe */}
            {GROUPS.map((group) => {
              const groupStyles = ALL_STYLES.filter((s) => s.group === group);
              return (
                <div key={group} className="mb-5">
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-neutral-400 mb-2">{group}</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {groupStyles.map((opt) => {
                      const active = selected.has(opt.slug);
                      return (
                        <button key={opt.slug} type="button" onClick={() => toggleSlug(opt.slug)}
                          className={`relative aspect-square overflow-hidden rounded-xl active:scale-[0.96] transition-transform duration-150 ${
                            active ? 'ring-2 ring-neutral-900 ring-offset-1' : ''
                          }`}>
                          <Image src={opt.photo} alt={opt.label} fill sizes="33vw"
                            className={`object-cover transition-all duration-300 ${active ? 'brightness-[0.55]' : ''}`} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
                          {active && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                              <Check size={10} className="text-neutral-900" strokeWidth={3} />
                            </div>
                          )}
                          <p className="absolute bottom-1.5 left-2 right-2 text-[10px] font-semibold text-white leading-tight">{opt.label}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {selected.size > 0 && (
              <p className="text-[11px] text-neutral-400 text-center mt-1">
                {selected.size} style{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''} · Ton feed sera mis à jour
              </p>
            )}
          </div>

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <button type="submit" disabled={saving || success}
            className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white font-semibold py-4 rounded-2xl text-sm hover:bg-neutral-700 transition-colors disabled:opacity-60">
            {success ? <><Check size={16} /> Sauvegardé ✓</> : saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>

        </form>
      </div>

      {avatarCropSrc && (
        <ImageCropModal
          imageSrc={avatarCropSrc}
          aspect={1}
          shape="round"
          onConfirm={handleCropConfirm}
          onCancel={() => setAvatarCropSrc(null)}
        />
      )}
    </AppShell>
  );
}
