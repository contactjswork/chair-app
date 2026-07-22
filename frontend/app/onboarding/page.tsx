'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { api, referral } from '@/lib/api';
import { resolveMediaUrl, type ApiSpecialty, type ApiReferral } from '@/lib/types';
import {
  User, Image as ImageIcon, FileText, Tag, Scissors,
  Calendar, Camera, ChevronRight, Check, ArrowRight, Share2
} from 'lucide-react';
import ImageCropModal from '@/components/ui/ImageCropModal';
import SpecialtyPicker from '@/components/ui/SpecialtyPicker';
import ShareSheet from '@/components/ui/ShareSheet';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OnboardingStep {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  why: string;
}

const STEPS: OnboardingStep[] = [
  { id: 1, title: 'Photo de profil',    subtitle: 'La première impression compte.',          icon: User,      why: 'Les profils avec photo reçoivent 5x plus de visites.' },
  { id: 2, title: 'Bannière',           subtitle: 'Votre vitrine visuelle.',                  icon: ImageIcon, why: 'Une belle bannière inspire confiance dès le premier regard.' },
  { id: 3, title: 'Bio & Accroche',     subtitle: 'Racontez votre histoire.',                 icon: FileText,  why: 'Une bio complète améliore votre référencement sur CHAIR.' },
  { id: 4, title: 'Spécialités',        subtitle: 'Ce que vous faites le mieux.',             icon: Tag,       why: 'Les clients recherchent par spécialité. Soyez visible.' },
  { id: 5, title: 'Vos services',       subtitle: 'Le détail derrière chaque spécialité.',    icon: Scissors,  why: 'Une spécialité seule ne suffit pas — les clients cherchent des prestations précises ("Dégradé américain", "Balayage blond"). Chaque service ajouté vous rend plus visible et plus crédible.' },
  { id: 6, title: 'Vos horaires',       subtitle: 'Quand êtes-vous disponible ?',             icon: Calendar,  why: 'Indispensable pour que les clients puissent réserver.' },
  { id: 7, title: 'Première réalisation', subtitle: 'Montrez votre talent.',                 icon: Camera,    why: 'La première réalisation est la plus importante. Faites-la belle.' },
];

// ── Composant Progress Bar ────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold text-neutral-500 tracking-wide uppercase">
          Étape {current} / {total}
        </span>
        <span className="text-[11px] font-semibold text-neutral-900">{pct}%</span>
      </div>
      <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-neutral-900 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Composant Step Card ───────────────────────────────────────────────────────

function StepCard({ step, children }: { step: OnboardingStep; children: React.ReactNode }) {
  const Icon = step.icon;
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
      <div className="bg-neutral-50 border-b border-neutral-100 px-5 py-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon size={17} strokeWidth={2} className="text-white" />
        </div>
        <div>
          <h2 className="font-bold text-neutral-900 text-base">{step.title}</h2>
          <p className="text-sm text-neutral-500 mt-0.5">{step.subtitle}</p>
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
      <div className="mx-5 mb-4 bg-neutral-50 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <div className="w-4 h-4 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-[8px] font-bold text-neutral-600">i</span>
        </div>
        <p className="text-[11px] text-neutral-500 leading-relaxed">{step.why}</p>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { user, isLoading, updateUser, logout } = useAuth();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [showSharePrompt, setShowSharePrompt] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [myReferral, setMyReferral] = useState<ApiReferral | null>(null);

  // Step 1 — Avatar
  const [avatarUrl,      setAvatarUrl]      = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarCropSrc,  setAvatarCropSrc]  = useState<string | null>(null);

  // Step 2 — Banner
  const [bannerUrl,      setBannerUrl]      = useState<string | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerCropSrc,  setBannerCropSrc]  = useState<string | null>(null);

  // Step 3 — Bio & Tagline
  const [bio, setBio] = useState('');
  const [tagline, setTagline] = useState('');
  const [city, setCity] = useState('');
  const [bioSaving, setBioSaving] = useState(false);

  // Step 4 — Specialties
  const [allSpecialties, setAllSpecialties] = useState<ApiSpecialty[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<number[]>([]);
  const [specialtiesSaving, setSpecialtiesSaving] = useState(false);

  // Step 5 — Services
  const [serviceSpecialtyId, setServiceSpecialtyId] = useState<number | null>(null);
  const [specialtyCategoryIds, setSpecialtyCategoryIds] = useState<Record<number, number>>({});
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceDuration, setServiceDuration] = useState('60');
  const isIndependent = user?.hairdresser_profile?.is_independent ?? true;
  const [serviceSaving, setServiceSaving] = useState(false);
  const [serviceSaved, setServiceSaved] = useState(false);

  // Step 6 — Schedule
  const [scheduleSet, setScheduleSet] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const defaultSchedule = [
    { day: 1, label: 'Lundi',    open: true,  start: '09:00', end: '19:00' },
    { day: 2, label: 'Mardi',    open: true,  start: '09:00', end: '19:00' },
    { day: 3, label: 'Mercredi', open: true,  start: '09:00', end: '19:00' },
    { day: 4, label: 'Jeudi',    open: true,  start: '09:00', end: '19:00' },
    { day: 5, label: 'Vendredi', open: true,  start: '09:00', end: '19:00' },
    { day: 6, label: 'Samedi',   open: true,  start: '09:00', end: '18:00' },
    { day: 0, label: 'Dimanche', open: false, start: '09:00', end: '18:00' },
  ];
  const [schedule, setSchedule] = useState(defaultSchedule);

  // Step 7 — First post
  const [postImage, setPostImage] = useState<string | null>(null);
  const [postDescription, setPostDescription] = useState('');
  const [postSaving, setPostSaving] = useState(false);
  const [postSaved, setPostSaved] = useState(false);

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role !== 'hairdresser') {
        router.push('/app/compte');
        return;
      }
      setAvatarUrl(resolveMediaUrl(user.avatar));
      setCity(user.hairdresser_profile?.city ?? '');
    }
    if (!isLoading && !user) {
      router.push('/connexion');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    api.get<ApiSpecialty[]>('/specialties').then(setAllSpecialties).catch(() => {});
  }, []);

  useEffect(() => {
    if (currentStep === 5 && serviceSpecialtyId === null && selectedSpecialties.length > 0) {
      setServiceSpecialtyId(selectedSpecialties[0]);
    }
  }, [currentStep, serviceSpecialtyId, selectedSpecialties]);

  // ── Step handlers ─────────────────────────────────────────────────────────

  function selectAvatar(file: File) {
    setAvatarCropSrc(URL.createObjectURL(file));
  }

  async function uploadAvatarBlob(blob: Blob, previewUrl: string) {
    setAvatarCropSrc(null);
    setAvatarUrl(previewUrl);
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', blob, 'avatar.jpg');
      const token = localStorage.getItem('chair_token');
      const res = await fetch(`${API_BASE}/profile/avatar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const url = data.url ?? data.avatar_url ?? data.path ?? previewUrl;
      setAvatarUrl(url);
      updateUser({ avatar: url });
    } catch {
      // garde le preview local si upload échoue
    } finally {
      setAvatarUploading(false);
    }
  }

  function selectBanner(file: File) {
    setBannerCropSrc(URL.createObjectURL(file));
  }

  async function uploadBannerBlob(blob: Blob, previewUrl: string) {
    setBannerCropSrc(null);
    setBannerUrl(previewUrl);
    setBannerUploading(true);
    try {
      const formData = new FormData();
      formData.append('banner', blob, 'banner.jpg');
      const token = localStorage.getItem('chair_token');
      const res = await fetch(`${API_BASE}/profile/banner`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBannerUrl(data.url ?? data.banner_url ?? data.path ?? previewUrl);
    } catch {
      // garde le preview local si upload échoue
    } finally {
      setBannerUploading(false);
    }
  }

  async function saveBioStep() {
    setBioSaving(true);
    try {
      await api.put('/profile', { bio, tagline, city, specialties: selectedSpecialties });
      updateUser({ bio });
    } catch {
      // silently fail
    } finally {
      setBioSaving(false);
    }
  }

  async function saveSpecialtiesStep() {
    setSpecialtiesSaving(true);
    try {
      await api.put('/profile', { specialties: selectedSpecialties });
    } catch {
      // silently fail
    } finally {
      setSpecialtiesSaving(false);
    }
  }

  async function saveService() {
    if (!serviceName.trim() || !serviceSpecialtyId) return;
    setServiceSaving(true);
    try {
      let categoryId = specialtyCategoryIds[serviceSpecialtyId];
      if (!categoryId) {
        const specialty = allSpecialties.find((s) => s.id === serviceSpecialtyId);
        const specialtyName = specialty?.name ?? 'Prestations';
        const existing = await api.get<{ id: number; name: string }[]>('/service-categories');
        const match = existing.find((c) => c.name === specialtyName);
        categoryId = match
          ? match.id
          : (await api.post<{ id: number }>('/service-categories', { name: specialtyName, display_order: 1 })).id;
        setSpecialtyCategoryIds((prev) => ({ ...prev, [serviceSpecialtyId!]: categoryId }));
      }
      const parsedPrice = parseFloat(servicePrice);
      const parsedDuration = parseInt(serviceDuration);
      await api.post('/services', {
        category_id:       categoryId,
        specialty_id:      serviceSpecialtyId,
        name:              serviceName,
        price:             isIndependent && !isNaN(parsedPrice) ? parsedPrice : null,
        duration_minutes:  isIndependent && !isNaN(parsedDuration) ? parsedDuration : null,
        is_active:         true,
      });
      setServiceSaved(true);
    } catch {
      // silently fail
    } finally {
      setServiceSaving(false);
    }
  }

  async function saveSchedule() {
    setScheduleSaving(true);
    try {
      const days = schedule.map((s) => ({
        day_of_week: s.day,
        is_open:     s.open,
        start_time:  s.start,
        end_time:    s.end,
        break_start: null,
        break_end:   null,
      }));
      await api.put('/schedule', { schedules: days });
      setScheduleSet(true);
    } catch {
      // silently fail
    } finally {
      setScheduleSaving(false);
    }
  }

  async function uploadPostImage(file: File) {
    try {
      const formData = new FormData();
      formData.append('images[]', file);
      formData.append('type', 'result');
      formData.append('description', postDescription);
      const token = localStorage.getItem('chair_token');
      const res = await fetch(`${API_BASE}/posts`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error();
      setPostSaved(true);
    } catch {
      // silently fail
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  const totalSteps = isIndependent ? STEPS.length : STEPS.length - 1;

  function nextStep(current: number): number {
    // Les salons sautent l'étape 6 (horaires)
    if (!isIndependent && current === 5) return 7;
    return current + 1;
  }

  async function handleNext() {
    if (currentStep === 3) await saveBioStep();
    if (currentStep === 4) await saveSpecialtiesStep();
    if (currentStep < STEPS.length) {
      setCurrentStep(nextStep(currentStep));
    } else {
      setShowSharePrompt(true);
    }
  }

  function handleSkip() {
    if (currentStep < STEPS.length) {
      setCurrentStep(nextStep(currentStep));
    } else {
      setShowSharePrompt(true);
    }
  }

  useEffect(() => {
    if (!showSharePrompt) return;
    referral.mine().then(setMyReferral).catch(() => {});
  }, [showSharePrompt]);

  // ── File input helpers ────────────────────────────────────────────────────

  function triggerFileInput(id: string) {
    document.getElementById(id)?.click();
  }

  // ── Render guards ─────────────────────────────────────────────────────────

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-sm text-neutral-400">Chargement...</div>
      </div>
    );
  }

  const step = STEPS[currentStep - 1];

  // ── Écran final : partage du profil ──────────────────────────────────────
  // Réflexe encouragé dès l'onboarding (programme ambassadeur, voir
  // docs/GROWTH.md) — jamais bloquant, "Passer" toujours disponible.
  if (showSharePrompt) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <div className="bg-white border-b border-neutral-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <Link href="/" className="text-lg font-bold tracking-[0.12em] uppercase text-neutral-900">CHAIR</Link>
        </div>
        <div className="max-w-lg mx-auto px-4 py-10 w-full flex-1 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-neutral-900 flex items-center justify-center mb-5">
            <Share2 size={24} className="text-white" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Partagez votre profil</h1>
          <p className="text-sm text-neutral-500 leading-relaxed mb-8 max-w-xs">
            Faites savoir à vos clients que vous êtes sur CHAIR. Chaque partage et chaque invitation rapportent des récompenses.
          </p>
          <button
            onClick={() => setShareOpen(true)}
            disabled={!myReferral}
            className="w-full max-w-xs flex items-center justify-center gap-2 bg-neutral-900 text-white font-bold py-3.5 rounded-2xl text-sm hover:bg-neutral-700 transition-colors disabled:opacity-50 mb-3"
          >
            <Share2 size={15} />Partager mon profil
          </button>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            Passer pour l&apos;instant
          </button>
        </div>
        {myReferral && (
          <ShareSheet
            open={shareOpen}
            onClose={() => { setShareOpen(false); router.push('/'); }}
            title="Partager mon profil"
            shareUrl={myReferral.link}
            shareText="Je viens de rejoindre CHAIR, l'app qui met en avant les coiffeurs !"
            actionType="share_profile"
          />
        )}
      </div>
    );
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <Link href="/" className="text-lg font-bold tracking-[0.12em] uppercase text-neutral-900">CHAIR</Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { logout(); router.push('/'); }}
            className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        {/* Welcome */}
        {currentStep === 1 && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-neutral-900">
              Bienvenue sur CHAIR, {user.name.split(' ')[0]}
            </h1>
            <p className="text-sm text-neutral-500 mt-1.5">
              Configurez votre profil en quelques étapes pour commencer à recevoir des clients.
            </p>
          </div>
        )}

        {/* Progress */}
        <div className="mb-5">
          <ProgressBar current={isIndependent || currentStep < 6 ? currentStep : currentStep - 1} total={totalSteps} />
        </div>

        {/* ── STEP 1 — Avatar ── */}
        {currentStep === 1 && (
          <StepCard step={step}>
            <div className="flex flex-col items-center gap-4 py-2">
              <div
                className="relative w-24 h-24 rounded-full bg-neutral-100 overflow-hidden cursor-pointer group border-2 border-dashed border-neutral-300 hover:border-neutral-500 transition-colors flex items-center justify-center"
                onClick={() => triggerFileInput('avatar-input')}
              >
                {avatarUrl ? (
                  <>
                    <Image src={avatarUrl} alt="Avatar" fill className="object-cover" sizes="96px" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera size={20} className="text-white" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <Camera size={24} className="text-neutral-400" />
                    <span className="text-[10px] text-neutral-400">Ajouter</span>
                  </div>
                )}
                {avatarUploading && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <input
                id="avatar-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) selectAvatar(f); e.target.value = ''; }}
              />
              <p className="text-sm text-neutral-500 text-center">
                Cliquez pour choisir votre photo de profil.<br />
                <span className="text-xs text-neutral-400">JPG ou PNG, 5 Mo max</span>
              </p>
              {avatarUrl && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600">
                  <Check size={13} />
                  Photo ajoutée
                </div>
              )}
            </div>
          </StepCard>
        )}

        {/* ── STEP 2 — Banner ── */}
        {currentStep === 2 && (
          <StepCard step={step}>
            <div className="flex flex-col items-center gap-4 py-2">
              <div
                className="relative w-full h-32 rounded-xl bg-neutral-100 overflow-hidden cursor-pointer group border-2 border-dashed border-neutral-300 hover:border-neutral-500 transition-colors flex items-center justify-center"
                onClick={() => triggerFileInput('banner-input')}
              >
                {bannerUrl ? (
                  <>
                    <Image src={bannerUrl} alt="Banner" fill className="object-cover" sizes="400px" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera size={20} className="text-white" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <ImageIcon size={24} className="text-neutral-400" />
                    <span className="text-xs text-neutral-500">Cliquez pour ajouter une bannière</span>
                  </div>
                )}
                {bannerUploading && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <input
                id="banner-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) selectBanner(f); e.target.value = ''; }}
              />
              <p className="text-xs text-neutral-400 text-center">
                Recommandé : 1200 × 400 px. JPG ou PNG, 10 Mo max.
              </p>
              {bannerUrl && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600">
                  <Check size={13} />
                  Bannière ajoutée
                </div>
              )}
            </div>
          </StepCard>
        )}

        {/* ── STEP 3 — Bio & Tagline ── */}
        {currentStep === 3 && (
          <StepCard step={step}>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Accroche <span className="font-normal text-neutral-400">(quelques mots percutants)</span>
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Ex : Spécialiste du balayage à Strasbourg"
                  maxLength={100}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 transition-all"
                />
                <div className="text-right text-[10px] text-neutral-400 mt-1">{tagline.length}/100</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Bio <span className="font-normal text-neutral-400">(parlez de vous, de votre parcours)</span>
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Coiffeuse passionnée depuis 10 ans, formée chez..."
                  rows={4}
                  maxLength={1000}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 transition-all resize-none"
                />
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-[10px] ${bio.length >= 100 ? 'text-green-600 font-medium' : 'text-neutral-400'}`}>
                    {bio.length >= 100 ? '✓ Bonne longueur' : `${100 - bio.length} caractères minimum recommandés`}
                  </span>
                  <span className="text-[10px] text-neutral-400">{bio.length}/1000</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Ville <span className="font-normal text-neutral-400">(pour être trouvé localement)</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex : Strasbourg"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 transition-all"
                />
              </div>
            </div>
          </StepCard>
        )}

        {/* ── STEP 4 — Spécialités ── */}
        {currentStep === 4 && (
          <StepCard step={step}>
            {/* Intro SEO */}
            <div className="bg-neutral-50 rounded-xl px-4 py-3 mb-4 border border-neutral-100">
              <p className="text-[11px] font-semibold text-neutral-700 mb-0.5">Votre visibilité dépend de vos spécialités</p>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Les clients recherchent par univers : <em>&quot;Coupe Homme Paris&quot;</em>, <em>&quot;Couleur &amp; Balayage Lyon&quot;</em>…
                Chaque spécialité cochée vous fait apparaître dans ces recherches sur CHAIR et sur Google. Aucune limite — cochez tout ce qui vous représente.
              </p>
            </div>

            <SpecialtyPicker specialties={allSpecialties} selected={selectedSpecialties} onToggle={(id) =>
              setSelectedSpecialties((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
            } />

            {selectedSpecialties.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600 mt-4 pt-3 border-t border-neutral-100">
                <Check size={13} />
                {selectedSpecialties.length} spécialité{selectedSpecialties.length > 1 ? 's' : ''} sélectionnée{selectedSpecialties.length > 1 ? 's' : ''}
              </div>
            )}
          </StepCard>
        )}

        {/* ── STEP 5 — Services ── */}
        {currentStep === 5 && (
          <StepCard step={step}>
            {serviceSaved ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-1">
                  <Check size={22} className="text-green-600" />
                </div>
                <p className="text-sm font-semibold text-neutral-900">Service ajouté</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Ajoutez-en d&apos;autres maintenant, ou complétez plus tard depuis votre profil — <span className="font-semibold text-neutral-600">Profil → Prestations</span>.
                </p>
                <button
                  type="button"
                  onClick={() => { setServiceSaved(false); setServiceName(''); setServicePrice(''); }}
                  className="mt-2 text-xs font-semibold text-neutral-900 border border-neutral-200 rounded-full px-4 py-2 hover:bg-neutral-50 transition-colors"
                >
                  + Ajouter un autre service
                </button>
              </div>
            ) : selectedSpecialties.length === 0 ? (
              <p className="text-xs text-neutral-400 text-center py-4">
                Aucune spécialité sélectionnée à l&apos;étape précédente — vous pourrez ajouter des services depuis votre profil (Profil → Prestations).
              </p>
            ) : (
              <div className="space-y-3">
                {/* Pourquoi ajouter des services maintenant */}
                <div className="bg-neutral-50 rounded-xl px-4 py-3 border border-neutral-100">
                  <p className="text-[11px] font-semibold text-neutral-700 mb-0.5">Pourquoi lister vos services ?</p>
                  <p className="text-[11px] text-neutral-500 leading-relaxed">
                    Une spécialité comme &quot;{allSpecialties.find((s) => s.id === serviceSpecialtyId)?.name ?? 'Coupe Homme'}&quot; regroupe plusieurs prestations. Plus vous en détaillez, plus vous apparaissez dans de recherches précises et plus votre profil inspire confiance. Pas d&apos;obligation à tout faire maintenant : vous pourrez toujours en ajouter, modifier ou supprimer depuis <span className="font-semibold text-neutral-700">votre profil</span> ensuite.
                  </p>
                </div>

                {/* Bandeau info salon */}
                {!isIndependent && (
                  <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[9px] font-bold text-neutral-600">i</span>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-neutral-800 mb-0.5">Prix et durée gérés par votre salon</p>
                      <p className="text-[11px] text-neutral-500 leading-relaxed">
                        Les réservations passent par votre système externe — inutile de renseigner tarifs et durées ici. Nommez simplement vos prestations pour qu&apos;elles apparaissent sur votre profil.
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Spécialité</label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSpecialties.map((id) => {
                      const sp = allSpecialties.find((s) => s.id === id);
                      if (!sp) return null;
                      const active = serviceSpecialtyId === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setServiceSpecialtyId(id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                            active
                              ? 'bg-neutral-900 text-white border-neutral-900'
                              : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400 hover:text-neutral-900'
                          }`}
                        >
                          {sp.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Nom du service</label>
                  <input
                    type="text"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    placeholder="Ex : Taper Bas, Balayage, Chignon..."
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 transition-all"
                  />
                </div>

                {/* Prix + Durée : uniquement pour les indépendants, jamais rendus pour les salariés */}
                {isIndependent && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Prix (€)</label>
                      <input
                        type="number"
                        value={servicePrice}
                        onChange={(e) => setServicePrice(e.target.value)}
                        placeholder="50"
                        min="0"
                        className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Durée (min)</label>
                      <select
                        value={serviceDuration}
                        onChange={(e) => setServiceDuration(e.target.value)}
                        className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 transition-all"
                      >
                        {[30, 45, 60, 75, 90, 120, 150, 180].map((d) => (
                          <option key={d} value={d}>{d} min</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={saveService}
                  disabled={serviceSaving || !serviceName.trim() || !serviceSpecialtyId}
                  className="w-full bg-neutral-900 text-white font-semibold py-3 rounded-xl text-sm hover:bg-neutral-700 transition-colors disabled:opacity-50"
                >
                  {serviceSaving ? 'Enregistrement...' : 'Ajouter ce service'}
                </button>
              </div>
            )}
          </StepCard>
        )}

        {/* ── STEP 6 — Horaires ── */}
        {currentStep === 6 && (
          <StepCard step={step}>
            {scheduleSet ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-1">
                  <Check size={22} className="text-green-600" />
                </div>
                <p className="text-sm font-semibold text-neutral-900">Horaires enregistrés</p>
              </div>
            ) : (
              <div className="space-y-2">
                {schedule.map((s, idx) => (
                  <div key={s.day} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSchedule((prev) => prev.map((d, i) => i === idx ? { ...d, open: !d.open } : d))}
                      className={`w-20 text-center text-xs font-semibold py-1.5 rounded-lg border transition-all ${
                        s.open ? 'bg-neutral-900 text-white border-neutral-900' : 'text-neutral-400 border-neutral-200'
                      }`}
                    >
                      {s.label.slice(0, 3)}
                    </button>
                    {s.open ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="time"
                          value={s.start}
                          onChange={(e) => setSchedule((prev) => prev.map((d, i) => i === idx ? { ...d, start: e.target.value } : d))}
                          className="flex-1 px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs focus:outline-none"
                        />
                        <span className="text-neutral-400 text-xs">→</span>
                        <input
                          type="time"
                          value={s.end}
                          onChange={(e) => setSchedule((prev) => prev.map((d, i) => i === idx ? { ...d, end: e.target.value } : d))}
                          className="flex-1 px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs focus:outline-none"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-400">Fermé</span>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={saveSchedule}
                  disabled={scheduleSaving}
                  className="w-full bg-neutral-900 text-white font-semibold py-3 rounded-xl text-sm hover:bg-neutral-700 transition-colors disabled:opacity-50 mt-3"
                >
                  {scheduleSaving ? 'Enregistrement...' : 'Valider mes horaires'}
                </button>
              </div>
            )}
          </StepCard>
        )}

        {/* ── STEP 7 — Première réalisation ── */}
        {currentStep === 7 && (
          <StepCard step={step}>
            {postSaved ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-1">
                  <Check size={22} className="text-green-600" />
                </div>
                <p className="text-sm font-semibold text-neutral-900">Réalisation publiée</p>
                <p className="text-xs text-neutral-400">Votre portfolio est lancé. Continuez depuis le dashboard.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  className="relative w-full h-40 rounded-xl bg-neutral-100 overflow-hidden cursor-pointer group border-2 border-dashed border-neutral-300 hover:border-neutral-500 transition-colors flex items-center justify-center"
                  onClick={() => triggerFileInput('post-input')}
                >
                  {postImage ? (
                    <>
                      <Image src={postImage} alt="Post" fill className="object-cover" sizes="400px" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera size={20} className="text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Camera size={28} className="text-neutral-400" />
                      <span className="text-sm text-neutral-500">Sélectionner une photo</span>
                    </div>
                  )}
                </div>
                <input
                  id="post-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setPostImage(URL.createObjectURL(file));
                    setPostSaving(true);
                    uploadPostImage(file).finally(() => setPostSaving(false));
                  }}
                />
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Description <span className="font-normal text-neutral-400">(optionnelle)</span>
                  </label>
                  <textarea
                    value={postDescription}
                    onChange={(e) => setPostDescription(e.target.value)}
                    placeholder="Balayage naturel sur cheveux châtain, 2h30..."
                    rows={2}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 transition-all resize-none"
                  />
                </div>
                {postSaving && (
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <div className="w-3 h-3 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
                    Publication en cours...
                  </div>
                )}
              </div>
            )}
          </StepCard>
        )}

        {/* ── Navigation buttons ── */}
        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            Passer cette étape
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-2 bg-neutral-900 text-white font-semibold px-6 py-3 rounded-xl text-sm hover:bg-neutral-700 transition-colors"
          >
            {currentStep === STEPS.length ? 'Terminer' : 'Continuer'}
            <ArrowRight size={15} />
          </button>
        </div>

        {/* Dernier step : accès rapide dashboard */}
        {currentStep === STEPS.length && (
          <div className="mt-4 text-center">
            <Link
              href="/pro"
              className="text-xs text-neutral-500 hover:text-neutral-900 underline transition-colors"
            >
              Aller directement à mon dashboard
            </Link>
          </div>
        )}
      </div>

      {/* Modals de recadrage */}
      {avatarCropSrc && (
        <ImageCropModal
          imageSrc={avatarCropSrc}
          aspect={1}
          shape="round"
          onConfirm={uploadAvatarBlob}
          onCancel={() => setAvatarCropSrc(null)}
        />
      )}
      {bannerCropSrc && (
        <ImageCropModal
          imageSrc={bannerCropSrc}
          aspect={3}
          shape="rect"
          onConfirm={uploadBannerBlob}
          onCancel={() => setBannerCropSrc(null)}
        />
      )}
    </div>
  );
}
