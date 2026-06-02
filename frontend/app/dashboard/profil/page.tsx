'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { ApiSpecialty } from '@/lib/types';
import ImageUpload from '@/components/ui/ImageUpload';
import { ChevronLeft, Save, Check, AlertCircle, Plus, Eye, Scissors } from 'lucide-react';
import DashboardNav from '@/components/layout/DashboardNav';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

interface ProfileData {
  user: { name: string; bio: string | null; city: string | null; avatar: string | null };
  profile: {
    slug: string;
    tagline: string | null;
    city: string | null;
    instagram_url: string | null;
    booking_url: string | null;
    years_experience: number | null;
    banner_image: string | null;
    is_independent: boolean;
    keywords: string | null;
    specialties: ApiSpecialty[];
  };
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ── Score de complétion ──────────────────────────────────────────────

interface CompletionItem { label: string; done: boolean; pts: number }

function computeCompletion(
  avatarUrl: string | null,
  bio: string,
  tagline: string,
  city: string,
  selectedSpecialties: number[],
  bookingUrl: string,
  yearsExp: string,
  isIndependent: boolean,
): { score: number; total: number; items: CompletionItem[] } {
  const items: CompletionItem[] = [
    { label: 'Photo de profil',         done: !!avatarUrl,                         pts: 20 },
    { label: 'Bio (100 caractères min)', done: bio.trim().length >= 100,            pts: 20 },
    { label: 'Accroche (tagline)',       done: tagline.trim().length >= 10,          pts: 15 },
    { label: 'Ville',                   done: city.trim().length > 0,              pts: 10 },
    { label: 'Spécialités (min 2)',      done: selectedSpecialties.length >= 2,     pts: 15 },
    ...(!isIndependent ? [{ label: 'Lien de réservation', done: bookingUrl.trim().length > 0, pts: 15 }] : []),
    { label: "Années d'expérience",      done: yearsExp.trim().length > 0 && yearsExp !== '0', pts: 5 },
  ];
  const total = items.reduce((s, i) => s + i.pts, 0);
  const score = items.filter((i) => i.done).reduce((s, i) => s + i.pts, 0);
  return { score, total, items };
}

// ── Composant principal ──────────────────────────────────────────────

export default function DashboardProfilPage() {
  const { user, isLoading: authLoading } = useRequireAuth(['hairdresser']);
  const { updateUser } = useAuth();

  const [profile, setProfile]           = useState<ProfileData | null>(null);
  const [loading, setLoading]           = useState(true);
  const [allSpecialties, setAllSpecialties] = useState<ApiSpecialty[]>([]);

  // Champs
  const [bio, setBio]                         = useState('');
  const [tagline, setTagline]                 = useState('');
  const [city, setCity]                       = useState('');
  const [instagram, setInstagram]             = useState('');
  const [bookingUrl, setBookingUrl]           = useState('');
  const [yearsExp, setYearsExp]               = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<number[]>([]);

  const [avatarUrl, setAvatarUrl]   = useState<string | null>(null);
  const [bannerUrl, setBannerUrl]   = useState<string | null>(null);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [showToast, setShowToast]   = useState(false);
  const [isDirty, setIsDirty]       = useState(false);
  const [errorMsg, setErrorMsg]     = useState('');
  const toastTimerRef               = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Marquer le formulaire comme modifié
  const markDirty = useCallback(() => setIsDirty(true), []);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get<ProfileData>('/profile'),
      fetch(`${API_BASE}/specialties`).then((r) => r.json()),
    ])
      .then(([profileData, specs]) => {
        setProfile(profileData);
        setBio(profileData.user.bio ?? '');
        setTagline(profileData.profile.tagline ?? '');
        setCity(profileData.profile.city ?? profileData.user.city ?? '');
        setInstagram(profileData.profile.instagram_url ?? '');
        setBookingUrl(profileData.profile.booking_url ?? '');
        setYearsExp(String(profileData.profile.years_experience ?? ''));
        setSelectedSpecialties(profileData.profile.specialties.map((s) => s.id));
        setAllSpecialties(specs);
        setAvatarUrl(profileData.user.avatar);
        setBannerUrl(profileData.profile.banner_image);
      })
      .catch((e) => setErrorMsg(e instanceof Error ? e.message : 'Impossible de charger le profil.'))
      .finally(() => setLoading(false));
  }, [user]);

  function toggleSpecialty(id: number) {
    setSelectedSpecialties((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
    markDirty();
  }

  async function handleSave() {
    setSaveStatus('saving');
    setErrorMsg('');
    try {
      await api.put('/profile', {
        bio: bio || null,
        tagline: tagline || null,
        city: city || null,
        instagram_url: instagram || null,
        booking_url: bookingUrl || null,
        years_experience: yearsExp ? parseInt(yearsExp) : null,
        specialties: selectedSpecialties,
      });
      setSaveStatus('saved');
      setIsDirty(false);
      setShowToast(true);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setShowToast(false);
        setSaveStatus('idle');
      }, 2500);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde.');
      setSaveStatus('error');
    }
  }

  // Score de complétion
  const isIndependent = profile?.profile.is_independent ?? true;
  const completion = computeCompletion(avatarUrl, bio, tagline, city, selectedSpecialties, bookingUrl, yearsExp, isIndependent);
  const completionPct = Math.round((completion.score / completion.total) * 100);
  const missing = completion.items.filter((i) => !i.done);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-sm text-neutral-400">Chargement...</div>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-neutral-50">
      <DashboardNav />

      {/* Header mobile */}
      <div className="px-4 pt-4">
        <DashboardPageHeader title="Mon profil" />
      </div>

      {/* Header desktop sticky */}
      <header className="hidden md:flex sticky top-0 z-10 bg-white border-b border-neutral-100 px-4 md:px-8 h-14 items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
            <ChevronLeft size={16} />
            Dashboard
          </Link>
          <span className="text-neutral-200">|</span>
          <span className="text-sm font-semibold text-neutral-900">Modifier mon profil</span>
        </div>
        <div className="flex items-center gap-3">
          {user.hairdresser_profile && (
            <Link href={`/coiffeur/${user.hairdresser_profile.slug}`} target="_blank"
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-700 transition-colors">
              <Eye size={13} /> Voir mon profil
            </Link>
          )}
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-50 ${
              saveStatus === 'saved' ? 'bg-green-600 text-white' : 'bg-neutral-900 text-white hover:bg-neutral-700'
            }`}
          >
            {saveStatus === 'saving' ? 'Sauvegarde...' : saveStatus === 'saved'
              ? <><Check size={15} /> Sauvegardé</> : <><Save size={15} /> Enregistrer</>}
          </button>
        </div>
      </header>

      {/* ── Contenu ─────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 pb-36 md:pb-16">

        {errorMsg && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
            <AlertCircle size={16} />{errorMsg}
          </div>
        )}

        {/* ── Score de complétion ──────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-neutral-100 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-neutral-900">Profil complété à {completionPct}%</p>
              <p className="text-xs text-neutral-400 mt-0.5">
                {completionPct === 100
                  ? 'Profil optimisé — vous avez la meilleure visibilité possible.'
                  : `${missing.length} action${missing.length > 1 ? 's' : ''} pour améliorer votre visibilité`}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: `conic-gradient(#0a0a0a ${completionPct * 3.6}deg, #f5f5f5 0deg)`
              }}>
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                <span className="text-[10px] font-bold text-neutral-900">{completionPct}%</span>
              </div>
            </div>
          </div>
          {/* Barre de progression */}
          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-neutral-900 rounded-full transition-all duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          {/* Items manquants */}
          {missing.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {missing.map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1 text-[11px] text-neutral-500 bg-neutral-50 border border-neutral-100 px-2.5 py-1 rounded-full">
                  <Plus size={9} className="text-neutral-400" />
                  {item.label}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* ── Identité ─────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-neutral-100 p-5 mb-4">
          <h2 className="text-sm font-semibold text-neutral-900 mb-1">Identité</h2>
          <p className="text-xs text-neutral-400 mb-4">Ce que les clients voient en premier</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-5">
            <ImageUpload
              currentUrl={avatarUrl}
              endpoint="/api/profile/avatar"
              onSuccess={(url) => { setAvatarUrl(url); updateUser({ avatar: url }); markDirty(); }}
              label="Photo de profil"
              aspectClass="aspect-square"
              shape="circle"
            />
            <ImageUpload
              currentUrl={bannerUrl}
              endpoint="/api/profile/banner"
              onSuccess={(url) => { setBannerUrl(url); markDirty(); }}
              label="Bannière"
              aspectClass="aspect-[3/1]"
              shape="rect"
            />
          </div>
          <div className="space-y-3">
            {/* Nom — lecture seule */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Nom affiché</label>
              <input
                type="text"
                value={user.name}
                readOnly
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-sm text-neutral-400 cursor-default"
              />
              <p className="text-[11px] text-neutral-400 mt-1">Pour modifier votre nom, contactez le support.</p>
            </div>
            {/* Ville */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Ville</label>
              <input
                type="text"
                value={city}
                onChange={(e) => { setCity(e.target.value); markDirty(); }}
                placeholder="Ex : Strasbourg, Haguenau, Paris..."
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
              />
            </div>
          </div>
        </section>

        {/* ── Présentation ─────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-neutral-100 p-5 mb-4">
          <h2 className="text-sm font-semibold text-neutral-900 mb-1">Présentation</h2>
          <p className="text-xs text-neutral-400 mb-4">Votre histoire, votre style, ce qui vous rend unique</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                Accroche <span className="text-neutral-400 font-normal">— 1 phrase percutante</span>
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => { setTagline(e.target.value); markDirty(); }}
                maxLength={255}
                placeholder="Ex : Spécialiste du blond polaire & colorations naturelles"
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
              />
              <p className="text-[11px] text-neutral-400 mt-1 text-right">{tagline.length}/255</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => { setBio(e.target.value); markDirty(); }}
                maxLength={1000}
                rows={5}
                placeholder="Parlez de votre parcours, vos techniques de prédilection, votre approche du métier..."
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all resize-none"
              />
              <p className="text-[11px] text-neutral-400 mt-1 text-right">{bio.length}/1000</p>
            </div>
          </div>
        </section>

        {/* ── Spécialités ──────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-neutral-100 p-5 mb-4">
          <h2 className="text-sm font-semibold text-neutral-900 mb-1">Spécialités</h2>
          <p className="text-xs text-neutral-400 mb-4">Vos domaines d'expertise — apparaissent sur votre profil et dans la recherche</p>
          <div className="flex flex-wrap gap-2">
            {allSpecialties.map((s) => {
              const selected = selectedSpecialties.includes(s.id);
              return (
                <button key={s.id} type="button" onClick={() => toggleSpecialty(s.id)}
                  className={`text-xs font-semibold tracking-wide uppercase px-3 py-1.5 rounded-full border transition-all ${
                    selected
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'text-neutral-500 border-neutral-200 hover:border-neutral-400 hover:text-neutral-900'
                  }`}>
                  {s.name}
                </button>
              );
            })}
          </div>
          {selectedSpecialties.length > 0 && (
            <p className="text-[11px] text-neutral-400 mt-3">{selectedSpecialties.length} sélectionnée{selectedSpecialties.length > 1 ? 's' : ''}</p>
          )}
        </section>

        {/* ── Informations professionnelles ────────────────────────── */}
        <section className="bg-white rounded-2xl border border-neutral-100 p-5 mb-4">
          <h2 className="text-sm font-semibold text-neutral-900 mb-4">Informations professionnelles</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Années d'expérience</label>
              <input
                type="number"
                value={yearsExp}
                onChange={(e) => { setYearsExp(e.target.value); markDirty(); }}
                min={0} max={50}
                placeholder="Ex : 8"
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                Instagram <span className="text-neutral-400 font-normal">— URL complète</span>
              </label>
              <input
                type="url"
                value={instagram}
                onChange={(e) => { setInstagram(e.target.value); markDirty(); }}
                placeholder="https://instagram.com/votre-compte"
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
              />
            </div>
            {profile?.profile && !profile.profile.is_independent && (
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                  Lien de réservation <span className="text-neutral-400 font-normal">— Planity, Treatwell, Shortcuts...</span>
                </label>
                <input
                  type="url"
                  value={bookingUrl}
                  onChange={(e) => { setBookingUrl(e.target.value); markDirty(); }}
                  placeholder="https://planity.com/votre-salon"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
                />
                {!bookingUrl && (
                  <p className="text-[11px] text-amber-600 mt-1.5 leading-relaxed flex items-start gap-1">
                    <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                    Ajoutez votre lien de réservation pour permettre aux clients de prendre rendez-vous directement.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── CTA Services — référencement ─────────────────────────── */}
        <section className="bg-neutral-50 border border-neutral-100 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Scissors size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-neutral-900">Ajoutez vos services</h2>
              <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                Les services améliorent votre visibilité dans la recherche CHAIR. Quand un client tape
                {' '}"balayage blond" ou "coupe homme", ce sont vos services qui le font apparaître.
              </p>
              <Link
                href="/dashboard/services"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold bg-neutral-900 text-white px-4 py-2 rounded-xl hover:bg-neutral-700 transition-colors"
              >
                <Plus size={12} />
                Gérer mes services
              </Link>
            </div>
          </div>
        </section>

        {/* Lien profil public */}
        {user.hairdresser_profile && (
          <div className="text-center pb-2">
            <Link
              href={`/coiffeur/${user.hairdresser_profile.slug}`}
              className="text-xs text-neutral-400 hover:text-neutral-700 underline transition-colors"
              target="_blank"
            >
              Voir mon profil public →
            </Link>
          </div>
        )}
      </div>

      {/* ── Sticky save bar (mobile) ─────────────────────────────────── */}
      <div className={`fixed bottom-[64px] md:hidden left-0 right-0 z-30 px-4 py-3 transition-all duration-300 ${
        isDirty || saveStatus === 'saving' ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
      }`}>
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className={`w-full flex items-center justify-center gap-2 text-sm font-semibold py-3.5 rounded-2xl shadow-lg transition-all disabled:opacity-60 ${
            saveStatus === 'saving' ? 'bg-neutral-700 text-white' : 'bg-neutral-900 text-white active:bg-neutral-700'
          }`}
        >
          {saveStatus === 'saving' ? (
            <span className="animate-pulse">Sauvegarde en cours...</span>
          ) : (
            <><Save size={16} /> Enregistrer le profil</>
          )}
        </button>
      </div>

      {/* ── Toast de confirmation ────────────────────────────────────── */}
      {showToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-neutral-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <Check size={15} className="text-green-400 flex-shrink-0" />
          Profil enregistré
        </div>
      )}
    </div>
  );
}
