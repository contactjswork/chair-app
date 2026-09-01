'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuth } from '@/contexts/AuthContext';
import { api, geo } from '@/lib/api';
import { getStoredToken } from '@/lib/auth';
import type { ApiSpecialty, ApiService } from '@/lib/types';
import ImageUpload from '@/components/ui/ImageUpload';
import SpecialtyPicker from '@/components/ui/SpecialtyPicker';
import {
  ChevronLeft, Save, Check, AlertCircle, Plus, Eye, Scissors,
  Clock, ShieldCheck, Upload, Loader, X, ChevronDown, Sparkles, LogOut, Trash2,
} from 'lucide-react';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { computeCompletion } from '@/lib/profileCompletion';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

interface ProfileData {
  user: { name: string; bio: string | null; city: string | null; avatar: string | null };
  profile: {
    slug: string;
    tagline: string | null;
    city: string | null;
    postal_code: string | null;
    region: string | null;
    department: string | null;
    work_address: string | null;
    booking_url: string | null;
    google_review_url?: string | null;
    years_experience: number | null;
    diploma: string | null;
    diploma_document_url: string | null;
    diploma_status: 'none' | 'pending' | 'verified' | 'rejected';
    banner_image: string | null;
    is_independent: boolean;
    work_availability: 'employed' | 'looking_salon' | 'looking_gig' | 'not_available' | null;
    specialties: ApiSpecialty[];
  };
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ── Score de complétion ──────────────────────────────────────────────



// ── Composant principal ──────────────────────────────────────────────

export default function DashboardProfilPage() {
  const { user, isLoading: authLoading } = useRequireAuth(['hairdresser']);
  const { updateUser, logout } = useAuth();

  const [profile, setProfile]           = useState<ProfileData | null>(null);
  const [loading, setLoading]           = useState(true);
  const [allSpecialties, setAllSpecialties] = useState<ApiSpecialty[]>([]);
  const [services, setServices]         = useState<ApiService[]>([]);

  // Champs
  const [bio, setBio]                         = useState('');
  const [tagline, setTagline]                 = useState('');
  const [city, setCity]                       = useState('');
  const [postalCode, setPostalCode]           = useState('');
  const [region, setRegion]                   = useState('');
  const [department, setDepartment]           = useState('');
  const [address, setAddress]                 = useState('');
  const [regionsList, setRegionsList]         = useState<string[]>([]);
  const [departmentsList, setDepartmentsList] = useState<Array<{ code: string; name: string }>>([]);
  const [bookingUrl, setBookingUrl]           = useState('');
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [yearsExp, setYearsExp]               = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<number[]>([]);
  const [workAvailability, setWorkAvailability] = useState<string>('employed');
  const [expandedSpecialty, setExpandedSpecialty] = useState<number | null>(null);

  // Diplôme
  const [diplomaType, setDiplomaType]         = useState('');
  const [diplomaStatus, setDiplomaStatus]     = useState<'none' | 'pending' | 'verified' | 'rejected'>('none');
  const [diplomaDocUrl, setDiplomaDocUrl]     = useState<string | null>(null);
  const [diplomaUploading, setDiplomaUploading] = useState(false);
  const [diplomaError, setDiplomaError]       = useState('');
  const diplomaFileRef = useRef<HTMLInputElement>(null);

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
      api.get<ApiService[]>('/services').catch(() => []),
    ])
      .then(([profileData, specs, svcs]) => {
        setProfile(profileData);
        setBio(profileData.user.bio ?? '');
        setTagline(profileData.profile.tagline ?? '');
        setCity(profileData.profile.city ?? profileData.user.city ?? '');
        setPostalCode(profileData.profile.postal_code ?? '');
        setRegion(profileData.profile.region ?? '');
        setDepartment(profileData.profile.department ?? '');
        setAddress(profileData.profile.work_address ?? '');
        setBookingUrl(profileData.profile.booking_url ?? '');
        setGoogleReviewUrl(profileData.profile.google_review_url ?? '');
        setYearsExp(String(profileData.profile.years_experience ?? ''));
        setDiplomaType(profileData.profile.diploma ?? '');
        setDiplomaStatus(profileData.profile.diploma_status ?? 'none');
        setDiplomaDocUrl(profileData.profile.diploma_document_url ?? null);
        setSelectedSpecialties(profileData.profile.specialties.map((s) => s.id));
        setAllSpecialties(specs);
        setServices(svcs as ApiService[]);
        setAvatarUrl(profileData.user.avatar);
        setBannerUrl(profileData.profile.banner_image);
        setWorkAvailability(profileData.profile.work_availability ?? 'employed');
      })
      .catch((e) => setErrorMsg(e instanceof Error ? e.message : 'Impossible de charger le profil.'))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    geo.regions().then((r) => setRegionsList(r.regions)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!region) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDepartmentsList([]);
      return;
    }
    geo.departments(region).then((r) => setDepartmentsList(r.departments)).catch(() => setDepartmentsList([]));
  }, [region]);

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
        postal_code: postalCode || null,
        region: region || null,
        department: department || null,
        work_address: address || null,
        booking_url: bookingUrl || null,
        google_review_url: googleReviewUrl || null,
        years_experience: yearsExp ? parseInt(yearsExp) : null,
        work_availability: workAvailability,
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

  async function handleDiplomaFileSelect(file: File) {
    if (!diplomaType) {
      setDiplomaError('Choisissez le diplôme obtenu avant d\'envoyer le document.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setDiplomaError('Photo du diplôme requise (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setDiplomaError('Fichier trop lourd (max 8 Mo).');
      return;
    }
    setDiplomaError('');
    setDiplomaUploading(true);
    try {
      const formData = new FormData();
      formData.append('diploma', diplomaType);
      formData.append('document', file);
      const token = getStoredToken();
      const res = await fetch(`${API_BASE}/profile/diploma-document`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Échec de l\'envoi.');
      }
      const data = await res.json();
      setDiplomaStatus(data.diploma_status);
      setDiplomaDocUrl(data.diploma_document_url);
    } catch (e) {
      setDiplomaError(e instanceof Error ? e.message : 'Échec de l\'envoi.');
    } finally {
      setDiplomaUploading(false);
    }
  }

  // Score de complétion
  const isIndependent = profile?.profile.is_independent ?? true;
  // Même calcul que la home (lib/profileCompletion) : les deux écrans
  // annonçaient 78 % et 80 % pour le même profil, chacun avec sa copie.
  const completion = computeCompletion({
    avatarUrl, bio, tagline, city, postalCode,
    specialtyCount: selectedSpecialties.length,
    bookingUrl, yearsExp, isIndependent,
  });
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

  // La barre d'enregistrement mobile n'apparaît que s'il y a réellement
  // quelque chose à enregistrer (ou une sauvegarde en cours).
  const showSaveBar = isDirty || saveStatus === 'saving';

  return (
    <div className="min-h-screen bg-neutral-50">

      {/* Header mobile */}
      <div className="px-4 pt-4">
        <DashboardPageHeader title="Mon profil" />
      </div>

      {/* Header desktop sticky */}
      <header className="hidden md:flex sticky top-0 z-10 bg-white border-b border-neutral-100 px-4 md:px-8 h-14 items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/pro" className="flex items-center text-neutral-500 hover:text-neutral-900 transition-colors p-1 -ml-1 rounded-lg">
            <ChevronLeft size={18} />
          </Link>
          <span className="text-neutral-200">|</span>
          <span className="text-sm font-semibold text-neutral-900">Modifier mon profil</span>
        </div>
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
      </header>

      {/* ── Contenu ─────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 pb-36 md:pb-16">

        {errorMsg && (
          <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl mb-4">
            <AlertCircle size={16} />{errorMsg}
          </div>
        )}

        {/* ── Héro profil : bannière + avatar chevauché ────────────── */}
        <section className="relative bg-white rounded-[28px] shadow-[0_4px_18px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-50 overflow-hidden mb-5">
          <div className="relative w-full aspect-[3/1] bg-neutral-100">
            <ImageUpload
              currentUrl={bannerUrl}
              endpoint="/api/profile/banner"
              onSuccess={(url) => { setBannerUrl(url); markDirty(); }}
              label="Bannière"
              shape="rect"
              variant="hero"
            />
          </div>
          <div className="px-5 pb-5">
            <div className="flex items-end justify-between gap-3 -mt-10">
              <div className="w-20 h-20 rounded-full ring-4 ring-white overflow-hidden flex-shrink-0 shadow-sm">
                <ImageUpload
                  currentUrl={avatarUrl}
                  endpoint="/api/profile/avatar"
                  onSuccess={(url) => { setAvatarUrl(url); updateUser({ avatar: url }); markDirty(); }}
                  label="Photo de profil"
                  shape="circle"
                  variant="hero"
                />
              </div>
              {user.hairdresser_profile && (
                <Link
                  href={`/app/coiffeur/${user.hairdresser_profile.slug}`}
                  target="_blank"
                  className="relative before:absolute before:-inset-y-[6px] before:inset-x-0 before:content-[''] mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 bg-neutral-50 px-3 py-2 rounded-xl hover:bg-neutral-100 hover:text-neutral-900 transition-colors flex-shrink-0"
                >
                  <Eye size={13} />
                  Profil public
                </Link>
              )}
            </div>
            <p className="font-bold text-[18px] text-neutral-900 mt-3 leading-tight">{user.name}</p>
            <input
              type="text"
              value={tagline}
              onChange={(e) => { setTagline(e.target.value); markDirty(); }}
              maxLength={255}
              placeholder="Ajoutez une accroche — ex : Spécialiste blond polaire & colorations naturelles"
              className="w-full mt-1 text-sm text-neutral-500 placeholder:text-neutral-400 bg-transparent focus:outline-none border-b border-transparent focus:border-neutral-200 pb-1 transition-colors"
            />
          </div>
        </section>

        {/* ── Complétion du profil ─────────────────────────────────── */}
        {completionPct < 100 && (
          <section className="bg-white rounded-[24px] shadow-[0_4px_18px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-50 p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: `conic-gradient(#0a0a0a ${completionPct * 3.6}deg, #f5f5f5 0deg)` }}>
                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
                  <span className="text-[9px] font-bold text-neutral-900">{completionPct}%</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-neutral-900">Profil complété à {completionPct}%</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {missing.map((item) => (
                    <span key={item.label} className="inline-flex items-center gap-1 text-[10px] text-neutral-500 bg-neutral-50 px-2 py-0.5 rounded-full">
                      <Plus size={8} className="text-neutral-400" />
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Localisation ──────────────────────────────────────────── */}
        <section className="bg-white rounded-[24px] shadow-[0_4px_18px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-50 p-5 mb-4">
          <h2 className="text-[15px] font-bold text-neutral-900 mb-1">Localisation</h2>
          <p className="text-xs text-neutral-400 mb-4">Pour apparaître dans les recherches locales.</p>
          <div className="space-y-3">
            {/* Ville */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Ville</label>
              <input
                type="text"
                value={city}
                onChange={(e) => { setCity(e.target.value); markDirty(); }}
                placeholder="Ex : Strasbourg, Haguenau, Paris..."
                className="w-full px-4 py-3 bg-neutral-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 transition-all"
              />
            </div>
            {/* Code postal */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Code postal</label>
              <input
                type="text"
                inputMode="numeric"
                value={postalCode}
                onChange={(e) => { setPostalCode(e.target.value); markDirty(); }}
                placeholder="Ex : 67500"
                maxLength={10}
                className="w-full px-4 py-3 bg-neutral-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 transition-all"
              />
            </div>
            {/* Région / Département */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Région</label>
                <select
                  value={region}
                  onChange={(e) => { setRegion(e.target.value); setDepartment(''); markDirty(); }}
                  className="w-full px-4 py-3 bg-neutral-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 transition-all"
                >
                  <option value="">—</option>
                  {regionsList.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Département</label>
                <select
                  value={department}
                  onChange={(e) => { setDepartment(e.target.value); markDirty(); }}
                  disabled={!region}
                  className="w-full px-4 py-3 bg-neutral-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 transition-all disabled:opacity-50"
                >
                  <option value="">—</option>
                  {departmentsList.map((d) => <option key={d.code} value={d.name}>{d.name}</option>)}
                </select>
              </div>
            </div>
            {/* Adresse */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Adresse</label>
              <input
                type="text"
                value={address}
                onChange={(e) => { setAddress(e.target.value); markDirty(); }}
                placeholder="Ex : 12 rue des Tanneurs"
                className="w-full px-4 py-3 bg-neutral-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 transition-all"
              />
            </div>
          </div>
        </section>

        {/* ── Bio ───────────────────────────────────────────────────── */}
        <section className="bg-white rounded-[24px] shadow-[0_4px_18px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-50 p-5 mb-4">
          <h2 className="text-[15px] font-bold text-neutral-900 mb-1">Bio</h2>
          <p className="text-xs text-neutral-400 mb-4">Ce qui donne envie de réserver.</p>
          <textarea
            value={bio}
            onChange={(e) => { setBio(e.target.value); markDirty(); }}
            maxLength={1000}
            rows={5}
            placeholder="Parlez de votre parcours, vos techniques de prédilection, votre approche du métier..."
            className="w-full px-4 py-3 bg-neutral-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 transition-all resize-none"
          />
          <p className="text-[11px] text-neutral-400 mt-1 text-right">{bio.length}/1000</p>
        </section>

        {/* ── Spécialités + services ───────────────────────────────── */}
        <section className="bg-white rounded-[24px] shadow-[0_4px_18px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-50 p-5 mb-4">
          <h2 className="text-[15px] font-bold text-neutral-900 mb-1">Spécialités</h2>
          <p className="text-xs text-neutral-400 mb-4">Visibles sur votre profil et dans la recherche CHAIR.</p>

          <SpecialtyPicker specialties={allSpecialties} selected={selectedSpecialties} onToggle={toggleSpecialty} />

          {selectedSpecialties.length > 0 && (
            <div className="mt-5 pt-4 border-t border-neutral-100">
              <p className="text-xs font-bold text-neutral-700 mb-2.5">Vos services par spécialité</p>
              <div className="space-y-2">
                {selectedSpecialties.map((id) => {
                  const sp = allSpecialties.find((s) => s.id === id);
                  if (!sp) return null;
                  const spServices = services.filter((s) => s.specialty_id === id);
                  const isOpen = expandedSpecialty === id;
                  return (
                    <div key={id} className="rounded-2xl overflow-hidden ring-1 ring-neutral-100">
                      <button
                        type="button"
                        onClick={() => setExpandedSpecialty(isOpen ? null : id)}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-neutral-50 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0 flex items-center justify-center">
                          {sp.icon
                            ? <span className="text-[15px] leading-none">{sp.icon}</span>
                            : <Scissors size={14} className="text-neutral-400" strokeWidth={1.5} />
                          }
                        </div>
                        <span className="text-sm font-semibold text-neutral-900 flex-1 min-w-0 truncate text-left">{sp.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${
                          spServices.length === 0 ? 'bg-amber-50 text-amber-600' : 'bg-neutral-100 text-neutral-600'
                        }`}>
                          {spServices.length === 0 ? 'Vide' : spServices.length}
                        </span>
                        <ChevronDown size={15} className={`text-neutral-300 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isOpen && (
                        <div className="border-t border-neutral-100">
                          {spServices.length === 0 ? (
                            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                              <p className="text-[11px] text-amber-600 leading-relaxed">Invisible sans service.</p>
                              <Link
                                href={`/pro/services?specialty=${id}`}
                                className="text-[11px] font-semibold text-neutral-900 underline flex-shrink-0"
                              >
                                Ajouter
                              </Link>
                            </div>
                          ) : (
                            <>
                              <ul className="divide-y divide-neutral-50">
                                {spServices.map((s) => (
                                  <li key={s.id} className="flex items-center justify-between px-3.5 py-2 text-xs">
                                    <span className="text-neutral-700 font-medium">{s.name}</span>
                                    {isIndependent && s.price != null && (
                                      <span className="text-neutral-400 font-semibold">{parseFloat(String(s.price)).toFixed(0)} €</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                              <Link
                                href={`/pro/services?specialty=${id}`}
                                className="block text-center text-[11px] font-semibold text-neutral-500 hover:text-neutral-900 px-3.5 py-2 border-t border-neutral-50 transition-colors"
                              >
                                + Ajouter un service
                              </Link>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <Link
                href="/pro/services"
                className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-neutral-400 hover:text-neutral-700 bg-neutral-50 hover:bg-neutral-100 rounded-xl px-3.5 py-2.5 transition-colors"
              >
                <Sparkles size={12} />
                Créer un service personnalisé
              </Link>
            </div>
          )}
        </section>

        {/* ── Informations professionnelles ────────────────────────── */}
        <section className="bg-white rounded-[24px] shadow-[0_4px_18px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-50 p-5 mb-4">
          <h2 className="text-[15px] font-bold text-neutral-900 mb-4">Informations professionnelles</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Années d&apos;expérience</label>
              <input
                type="number"
                value={yearsExp}
                onChange={(e) => { setYearsExp(e.target.value); markDirty(); }}
                min={0} max={50}
                placeholder="Ex : 8"
                className="w-full px-4 py-3 bg-neutral-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 transition-all"
              />
            </div>

            {isIndependent && (
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-neutral-400" />
                  Diplôme officiel <span className="text-neutral-400 font-normal">— vérifié par CHAIR</span>
                </label>

                {diplomaStatus === 'verified' ? (
                  <div className="flex items-center gap-2.5 bg-green-50 text-green-700 text-xs font-semibold px-4 py-3 rounded-2xl">
                    <Check size={14} className="flex-shrink-0" />
                    {diplomaType} — vérifié par CHAIR
                  </div>
                ) : diplomaStatus === 'pending' ? (
                  <div className="flex items-center gap-2.5 bg-amber-50 text-amber-700 text-xs font-semibold px-4 py-3 rounded-2xl">
                    <Clock size={14} className="flex-shrink-0" />
                    {diplomaType} — en cours de vérification
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {diplomaStatus === 'rejected' && (
                      <div className="flex items-center gap-2.5 bg-red-50 text-red-600 text-xs font-semibold px-4 py-3 rounded-2xl">
                        <X size={14} className="flex-shrink-0" />
                        Document refusé — reprenez une photo lisible.
                      </div>
                    )}
                    <select
                      value={diplomaType}
                      onChange={(e) => setDiplomaType(e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 transition-all"
                    >
                      <option value="">Choisir le diplôme obtenu</option>
                      <option value="CAP Coiffure">CAP Coiffure</option>
                      <option value="BP Coiffure">BP Coiffure</option>
                      <option value="BM Coiffure">BM Coiffure (Brevet de Maîtrise)</option>
                    </select>
                    <button
                      type="button"
                      disabled={!diplomaType || diplomaUploading}
                      onClick={() => diplomaFileRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 text-xs font-semibold bg-neutral-50 text-neutral-700 px-4 py-3 rounded-xl hover:bg-neutral-100 transition-colors disabled:opacity-40"
                    >
                      {diplomaUploading ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />}
                      {diplomaUploading ? 'Envoi en cours...' : 'Envoyer une photo de mon diplôme'}
                    </button>
                    <input
                      ref={diplomaFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDiplomaFileSelect(f); e.target.value = ''; }}
                    />
                    {diplomaError && <p className="text-[11px] text-red-500">{diplomaError}</p>}
                    {diplomaDocUrl && diplomaStatus === 'rejected' && (
                      <p className="text-[11px] text-neutral-400">Dernier document envoyé : <a href={diplomaDocUrl} target="_blank" rel="noreferrer" className="underline">voir</a></p>
                    )}
                  </div>
                )}
              </div>
            )}

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
                  className="w-full px-4 py-3 bg-neutral-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 transition-all"
                />
                {!bookingUrl && (
                  <p className="text-[11px] text-amber-600 mt-1.5 leading-relaxed flex items-start gap-1">
                    <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                    Ajoutez-le pour que les clients réservent directement.
                  </p>
                )}
              </div>
            )}

            {/* Le pont vers l'avis Google : après un 5 étoiles vérifié sur
                CHAIR, le client se voit proposer de le publier aussi sur
                votre fiche Google — seulement si ce lien est renseigné. */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                Lien « Laisser un avis Google » <span className="text-neutral-400 font-normal">— optionnel</span>
              </label>
              <input
                type="url"
                value={googleReviewUrl}
                onChange={(e) => { setGoogleReviewUrl(e.target.value); markDirty(); }}
                placeholder="https://g.page/r/…/review"
                className="w-full px-4 py-3 bg-neutral-50 rounded-xl text-[16px] focus:outline-none focus:ring-2 focus:ring-neutral-300 transition-all"
              />
              <p className="text-[11px] text-neutral-400 mt-1.5 leading-relaxed">
                Vos clients 5 étoiles se verront proposer de republier leur avis
                sur Google. Trouvez ce lien dans votre fiche Google Business →
                « Demander des avis ».
              </p>
            </div>
          </div>
        </section>

        {/* ── Disponibilité ────────────────────────────────────────── */}
        <section className="bg-white rounded-[24px] shadow-[0_4px_18px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-50 p-5 mb-4">
          <h2 className="text-[15px] font-bold text-neutral-900 mb-1">Disponibilité</h2>
          <p className="text-xs text-neutral-400 mb-4">Visible sur votre profil public.</p>
          <div className="flex flex-col gap-2">
            {([
              ['employed',       'En poste',                   'En salon ou en activité'],
              ['looking_salon',  'Recherche un salon',         'Badge visible — les salons peuvent vous contacter'],
              ['looking_gig',    'Recherche des missions',     'Badge visible — pour des prestations ponctuelles'],
              ['not_available',  'Pas disponible',             'Profil visible, sans badge opportunité'],
            ] as const).map(([value, label, desc]) => (
              <button
                key={value}
                type="button"
                onClick={() => { setWorkAvailability(value); markDirty(); }}
                className={`flex items-start gap-3 px-4 py-3 rounded-2xl text-left transition-all ${
                  workAvailability === value
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-50 hover:bg-neutral-100'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                  workAvailability === value ? 'border-white bg-white' : 'border-neutral-300'
                }`}>
                  {workAvailability === value && <div className="w-2 h-2 rounded-full bg-neutral-900" />}
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">{label}</p>
                  <p className={`text-[11px] mt-0.5 leading-relaxed ${workAvailability === value ? 'text-neutral-300' : 'text-neutral-400'}`}>{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Compte — tout en bas, hors de l'accueil (retour Julien) ──── */}
        <div className="pt-2 pb-8">
          <button onClick={logout}
            className="w-full flex items-center justify-center gap-2 text-sm text-neutral-400 hover:text-red-500 transition-colors py-2">
            <LogOut size={14} />Se déconnecter
          </button>
          <Link href="/app/compte/supprimer" target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 text-xs text-neutral-300 hover:text-red-500 transition-colors mt-1 py-2">
            <Trash2 size={12} />Supprimer mon compte
          </Link>
        </div>
      </div>

      {/* ── Barre d'enregistrement (mobile) ───────────────────────────────
          Deux défauts corrigés ici :
          1. Position — ProNav est `fixed bottom-0 z-50` et mesure 66px
             (h-[66px]) + pb-safe-nav, soit calc(env(safe-area-inset-bottom)
             * 0.4) de plus sur iOS. La barre était à `bottom-[64px] z-30` :
             son bas passait TOUJOURS sous la nav (2px sans encoche, ~16px sur
             un iPhone), et la nav, opaque et au-dessus (z-50 > z-30), la
             recouvrait. On reprend ici la hauteur exacte de la nav, et z-40
             (au-dessus du contenu, sous la nav qu'on ne chevauche plus).
             Pas de pb-safe en plus : la barre est posée au-dessus de la nav,
             qui porte déjà le padding de safe area — l'ajouter décollerait la
             barre d'autant.
          2. Affichage — l'apparition reposait sur `translate-y-full` /
             `translate-y-0`, qui en Tailwind v4 compilent vers la propriété
             CSS `translate: var(--tw-translate-x) var(--tw-translate-y)`
             alimentée par des `@property … syntax:"*"`. La barre restait
             décalée de 100%, donc hors écran. On passe par un `transform`
             explicite en style inline, qui ne dépend d'aucune variable. */}
      <div
        className="fixed md:hidden left-0 right-0 z-40 px-4 py-3"
        style={{
          bottom: 'calc(66px + env(safe-area-inset-bottom, 0px) * 0.4)',
          transform: showSaveBar ? 'translateY(0)' : 'translateY(140%)',
          opacity: showSaveBar ? 1 : 0,
          pointerEvents: showSaveBar ? 'auto' : 'none',
          transition: 'transform 300ms ease, opacity 300ms ease',
        }}
      >
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
