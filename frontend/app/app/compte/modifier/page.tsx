'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { resolveMediaUrl } from '@/lib/types';
import { api } from '@/lib/api';
import { ChevronLeft, User, Camera, Check, Sparkles } from 'lucide-react';
import ImageCropModal from '@/components/ui/ImageCropModal';
import CityAutocomplete from '@/components/ui/CityAutocomplete';
import { getLiveSpecialties, SPECIALTY_ILLUSTRATIONS, HOMME_SPECIALTY_SLUGS, FEMME_SPECIALTY_SLUGS, type LiveSpecialty } from '@/lib/specialties';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

// ── Données styles — synchronisées avec l'onboarding ─────────────────

type Gender = 'femme' | 'homme' | 'non-binaire' | null;

// Les 14 spécialités actives (source : /api/specialties) réparties par genre
// selon HOMME_SPECIALTY_SLUGS/FEMME_SPECIALTY_SLUGS (lib/specialties.ts,
// seule source de vérité) — plus de liste codée en dur ici qui pouvait
// diverger de la vraie taxonomie en base.
function getStyles(g: Gender, all: LiveSpecialty[]): LiveSpecialty[] {
  const bySlug = new Map(all.map((s) => [s.slug, s]));
  const pick = (slugs: string[]) => slugs.map((slug) => bySlug.get(slug)).filter((s): s is LiveSpecialty => Boolean(s));
  if (g === 'femme') return pick(FEMME_SPECIALTY_SLUGS);
  if (g === 'homme') return pick(HOMME_SPECIALTY_SLUGS);
  // non-binaire / "je préfère ne pas dire" : les 14 spécialités, jamais un
  // sous-ensemble caché faute de genre précisé.
  return pick([...FEMME_SPECIALTY_SLUGS, ...HOMME_SPECIALTY_SLUGS]);
}

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
  const [cityGeo, setCityGeo] = useState<{ lat: number; lng: number } | null>(null);
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

  // Taxonomie live (id/slug/name/image_url), administrable sans build depuis
  // Configuration > Spécialités — [] tant que le fetch n'a pas résolu (bref
  // état transitoire au montage, pas de repli statique ici : la liste des 14
  // spécialités elle-même vit uniquement en base, contrairement au libellé
  // d'une spécialité connue qui a un repli SPECIALTY_LABELS).
  const [liveSpecialties, setLiveSpecialties] = useState<LiveSpecialty[]>([]);

  useEffect(() => {
    if (!isLoading && !user) router.replace('/connexion?returnTo=%2Fapp%2Fcompte%2Fmodifier');
  }, [user, isLoading, router]);

  useEffect(() => {
    let cancelled = false;
    getLiveSpecialties().then((list) => { if (!cancelled) setLiveSpecialties(list); });
    return () => { cancelled = true; };
  }, []);

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
      await api.put('/user/profile', { name, city, bio, latitude: cityGeo?.lat, longitude: cityGeo?.lng });
      updateUser({ name, city, bio, ...(cityGeo ? { latitude: cityGeo.lat, longitude: cityGeo.lng } : {}) });

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
      setTimeout(() => router.push('/app/compte'), 1200);
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
          <button onClick={() => router.back()} className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-neutral-100 active:bg-neutral-200 transition-colors">
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
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center border-2 border-white hover:bg-neutral-700 active:scale-90 transition-all">
                <Camera size={13} className="text-white" />
              </button>
            </div>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="text-xs font-medium text-neutral-500 hover:text-neutral-900 active:text-neutral-900 transition-colors">
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
              <CityAutocomplete
                value={city}
                onChange={(text) => { setCity(text); setCityGeo(null); }}
                onSelect={(s) => { setCity(s.city); setCityGeo({ lat: s.lat, lng: s.lng }); }}
                placeholder="Paris, Lyon, Strasbourg…"
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-neutral-400 transition-colors"
              />
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
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[12px] font-medium transition-all duration-150 active:scale-[0.96] ${
                    gender === value
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-400 active:bg-neutral-50'
                  }`}>
                  <span>{emoji}</span>{label}
                </button>
              ))}
            </div>

            {/* Styles — grille 3 colonnes, cartes icône compactes */}
            <div className="grid grid-cols-3 gap-1">
              {getStyles(gender, liveSpecialties).map((opt) => {
                const active = selected.has(opt.slug);
                const photo = opt.image_url;
                const illustration = SPECIALTY_ILLUSTRATIONS[opt.slug];
                return (
                  <button key={opt.slug} type="button" onClick={() => toggleSlug(opt.slug)}
                    className={`relative flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl transition-all duration-200 active:scale-[0.88] ${
                      active ? 'ring-2 ring-neutral-900 bg-white shadow-sm' : 'hover:bg-neutral-50'
                    }`}>
                    <div className="relative">
                      {photo ? (
                        // Vraie photo (Cloudinary) : cadre rond plein, pas de
                        // blend — réservé aux illustrations fond blanc ci-dessous.
                        <div className="relative w-[72px] h-[72px] rounded-2xl overflow-hidden">
                          <Image src={photo} alt={opt.name} fill sizes="72px" className="object-cover" />
                        </div>
                      ) : illustration ? (
                        <Image src={illustration} alt={opt.name} width={72} height={72} className="object-contain mix-blend-multiply" />
                      ) : opt.icon ? (
                        <div className="w-[72px] h-[72px] rounded-2xl bg-neutral-100 flex items-center justify-center">
                          <span style={{ fontSize: 40 }} className="leading-none">{opt.icon}</span>
                        </div>
                      ) : (
                        <div className="w-[72px] h-[72px] rounded-2xl bg-neutral-100 flex items-center justify-center">
                          <Sparkles size={28} className="text-neutral-400" />
                        </div>
                      )}
                      {active && (
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-neutral-900 flex items-center justify-center"
                          style={{ animation: 'popIn 0.18s cubic-bezier(0.34,1.56,0.64,1) both' }}>
                          <Check size={10} className="text-white" strokeWidth={3.5} />
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] font-semibold text-center leading-tight ${active ? 'text-neutral-900' : 'text-neutral-500'}`}>
                      {opt.name}
                    </p>
                  </button>
                );
              })}
            </div>
            <style>{`@keyframes popIn { from { transform: scale(0); opacity: 0 } to { transform: scale(1); opacity: 1 } }`}</style>

            {selected.size > 0 && (
              <p className="text-[11px] text-neutral-400 text-center mt-1">
                {selected.size} style{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''} · Ton feed sera mis à jour
              </p>
            )}
          </div>

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <button type="submit" disabled={saving || success}
            className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white font-semibold py-4 rounded-2xl text-sm hover:bg-neutral-700 active:scale-[0.98] transition-all disabled:opacity-60">
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
