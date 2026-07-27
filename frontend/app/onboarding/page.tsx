'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { api, referral } from '@/lib/api';
import { resolveMediaUrl, type ApiChairBadge, type ApiChairLevel, type ApiSpecialty, type ApiReferral } from '@/lib/types';
import { Camera, Check, ImageIcon as ImageIconLucide, Share2, Sparkles } from 'lucide-react';
import ImageCropModal from '@/components/ui/ImageCropModal';
import SpecialtyPicker from '@/components/ui/SpecialtyPicker';
import ShareSheet from '@/components/ui/ShareSheet';
import OnboardingHeader from '@/components/onboarding/OnboardingHeader';
import QuestionScreen from '@/components/onboarding/QuestionScreen';
import LocationAccordion from '@/components/onboarding/LocationAccordion';
import DiscoverCarousel from '@/components/onboarding/DiscoverCarousel';
import BadgeUnlockToast from '@/components/onboarding/BadgeUnlockToast';
import { useStepTransition, tapFeedback } from '@/hooks/useStepTransition';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

type Step =
  | 'photo' | 'banner' | 'tagline' | 'bio' | 'geo_location'
  | 'specialties' | 'services' | 'schedule' | 'post' | 'discover';

interface ProfileResponse {
  chair_points: number;
  chair_level: ApiChairLevel;
  chair_badges_all: ApiChairBadge[];
}

const inputCls = 'w-full px-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-[16px] text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 transition-all';

export default function OnboardingPage() {
  const { user, isLoading, updateUser, logout } = useAuth();
  const router = useRouter();
  const { animClass, transition } = useStepTransition();

  const isIndependent = user?.hairdresser_profile?.is_independent ?? true;
  const [hadCity, setHadCity] = useState<boolean | null>(null);

  const steps = useMemo<Step[]>(() => {
    const s: Step[] = ['photo', 'banner', 'tagline', 'bio'];
    if (hadCity === false) s.push('geo_location');
    s.push('specialties', 'services');
    if (isIndependent) s.push('schedule');
    s.push('post', 'discover');
    return s;
  }, [hadCity, isIndependent]);

  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [showSharePrompt, setShowSharePrompt] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [myReferral, setMyReferral] = useState<ApiReferral | null>(null);
  const [finalProfile, setFinalProfile] = useState<ProfileResponse | null>(null);
  const [badgeToast, setBadgeToast] = useState<{ label: string; points: number } | null>(null);

  // Photo
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null);

  // Bannière
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerCropSrc, setBannerCropSrc] = useState<string | null>(null);

  // Accroche / bio / ville
  const [tagline, setTagline] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [department, setDepartment] = useState('');
  const [street, setStreet] = useState('');

  // Spécialités
  const [allSpecialties, setAllSpecialties] = useState<ApiSpecialty[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<number[]>([]);

  // Services
  const [serviceSpecialtyId, setServiceSpecialtyId] = useState<number | null>(null);
  const [specialtyCategoryIds, setSpecialtyCategoryIds] = useState<Record<number, number>>({});
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceDuration, setServiceDuration] = useState('60');
  const [serviceSaving, setServiceSaving] = useState(false);
  const [serviceSaved, setServiceSaved] = useState(false);

  // Horaires
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleSet, setScheduleSet] = useState(false);
  const [schedule, setSchedule] = useState([
    { day: 1, label: 'Lundi', open: true, start: '09:00', end: '19:00' },
    { day: 2, label: 'Mardi', open: true, start: '09:00', end: '19:00' },
    { day: 3, label: 'Mercredi', open: true, start: '09:00', end: '19:00' },
    { day: 4, label: 'Jeudi', open: true, start: '09:00', end: '19:00' },
    { day: 5, label: 'Vendredi', open: true, start: '09:00', end: '19:00' },
    { day: 6, label: 'Samedi', open: true, start: '09:00', end: '18:00' },
    { day: 0, label: 'Dimanche', open: false, start: '09:00', end: '18:00' },
  ]);

  // Première réalisation
  const [postImage, setPostImage] = useState<string | null>(null);
  const [postDescription, setPostDescription] = useState('');
  const [postSaving, setPostSaving] = useState(false);
  const [postSaved, setPostSaved] = useState(false);

  // ── Garde d'accès + init ──────────────────────────────────────────────────

  useEffect(() => {
    if (!isLoading && user) {
      // has_hairdresser_profile, pas role : un gérant ayant activé son mode
      // coiffeur garde role=salon_owner (identité double) mais doit pouvoir
      // suivre ce même onboarding pour compléter son profil coiffeur.
      if (!user.has_hairdresser_profile && !user.hairdresser_profile) { router.push('/app/compte'); return; }
      // Synchronisation ponctuelle depuis l'utilisateur chargé de façon async
      // par AuthContext — pas un dérivé d'un autre state local.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvatarUrl(resolveMediaUrl(user.avatar));
      const existingCity = user.hairdresser_profile?.city ?? '';
      setCity(existingCity);
      setHadCity(existingCity.trim().length > 0);
    }
    if (!isLoading && !user) router.push('/connexion');
  }, [user, isLoading, router]);

  useEffect(() => {
    api.get<ApiSpecialty[]>('/specialties').then(setAllSpecialties).catch(() => {});
  }, []);

  useEffect(() => {
    if (steps[stepIndex] === 'services' && serviceSpecialtyId === null && selectedSpecialties.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setServiceSpecialtyId(selectedSpecialties[0]);
    }
  }, [stepIndex, steps, serviceSpecialtyId, selectedSpecialties]);

  useEffect(() => {
    if (!showSharePrompt) return;
    referral.mine().then(setMyReferral).catch(() => {});
  }, [showSharePrompt]);

  // ── Upload / sauvegarde (logique reprise telle quelle) ───────────────────

  function selectAvatar(file: File) { setAvatarCropSrc(URL.createObjectURL(file)); }

  async function uploadAvatarBlob(blob: Blob, previewUrl: string) {
    setAvatarCropSrc(null);
    setAvatarUrl(previewUrl);
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', blob, 'avatar.jpg');
      const token = localStorage.getItem('chair_token');
      const res = await fetch(`${API_BASE}/profile/avatar`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: formData });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const url = data.url ?? data.avatar_url ?? data.path ?? previewUrl;
      setAvatarUrl(url);
      updateUser({ avatar: url });
      setBadgeToast({ label: 'Première impression débloqué', points: 20 });
    } catch { /* garde le preview local si upload échoue */ } finally { setAvatarUploading(false); }
  }

  function selectBanner(file: File) { setBannerCropSrc(URL.createObjectURL(file)); }

  async function uploadBannerBlob(blob: Blob, previewUrl: string) {
    setBannerCropSrc(null);
    setBannerUrl(previewUrl);
    setBannerUploading(true);
    try {
      const formData = new FormData();
      formData.append('banner', blob, 'banner.jpg');
      const token = localStorage.getItem('chair_token');
      const res = await fetch(`${API_BASE}/profile/banner`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: formData });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBannerUrl(data.url ?? data.banner_url ?? data.path ?? previewUrl);
      setBadgeToast({ label: 'Vitrine débloqué', points: 15 });
    } catch { /* garde le preview local si upload échoue */ } finally { setBannerUploading(false); }
  }

  async function saveTaglineStep() {
    try { await api.put('/profile', { tagline }); } catch { /* silencieux */ }
  }

  async function saveBioAndCityStep() {
    try {
      await api.put('/profile', {
        bio,
        city: city || undefined,
        region: region || undefined,
        department: department || undefined,
        work_address: street || undefined,
      });
      updateUser({ bio });
    } catch { /* silencieux */ }
  }

  async function saveSpecialtiesStep() {
    try { await api.put('/profile', { specialties: selectedSpecialties }); } catch { /* silencieux */ }
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
        categoryId = match ? match.id : (await api.post<{ id: number }>('/service-categories', { name: specialtyName, display_order: 1 })).id;
        setSpecialtyCategoryIds((prev) => ({ ...prev, [serviceSpecialtyId!]: categoryId }));
      }
      const parsedPrice = parseFloat(servicePrice);
      const parsedDuration = parseInt(serviceDuration);
      await api.post('/services', {
        category_id: categoryId,
        specialty_id: serviceSpecialtyId,
        name: serviceName,
        price: isIndependent && !isNaN(parsedPrice) ? parsedPrice : null,
        duration_minutes: isIndependent && !isNaN(parsedDuration) ? parsedDuration : null,
        is_active: true,
      });
      setServiceSaved(true);
    } catch { /* silencieux */ } finally { setServiceSaving(false); }
  }

  async function saveSchedule() {
    setScheduleSaving(true);
    try {
      const days = schedule.map((s) => ({ day_of_week: s.day, is_open: s.open, start_time: s.start, end_time: s.end, break_start: null, break_end: null }));
      await api.put('/schedule', { schedules: days });
      setScheduleSet(true);
    } catch { /* silencieux */ } finally { setScheduleSaving(false); }
  }

  async function uploadPostImage(file: File) {
    try {
      const formData = new FormData();
      formData.append('images[]', file);
      formData.append('type', 'result');
      formData.append('description', postDescription);
      const token = localStorage.getItem('chair_token');
      const res = await fetch(`${API_BASE}/posts`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: formData });
      if (!res.ok) throw new Error();
      setPostSaved(true);
    } catch { /* silencieux */ }
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  const finish = useCallback(async () => {
    try {
      const profile = await api.get<ProfileResponse>('/profile');
      setFinalProfile(profile);
    } catch { setFinalProfile(null); }
    setDone(true);
    setShowSharePrompt(true);
  }, []);

  function goNext() {
    tapFeedback();
    if (stepIndex >= steps.length - 1) { finish(); return; }
    transition(() => setStepIndex((i) => i + 1));
  }

  async function handleNext() {
    const current = steps[stepIndex];
    if (current === 'tagline') await saveTaglineStep();
    if (current === 'bio' || current === 'geo_location') await saveBioAndCityStep();
    if (current === 'specialties') await saveSpecialtiesStep();
    goNext();
  }

  function goBack() {
    if (stepIndex === 0) return;
    tapFeedback();
    transition(() => setStepIndex((i) => i - 1));
  }

  function triggerFileInput(id: string) { document.getElementById(id)?.click(); }

  if (isLoading || !user || hadCity === null) {
    return <div className="min-h-screen bg-white flex items-center justify-center"><div className="text-sm text-neutral-400">Chargement...</div></div>;
  }

  // ── Écran final : récompense réelle + partage ────────────────────────────
  if (done && showSharePrompt) {
    const fullProfileBadge = finalProfile?.chair_badges_all.find((b) => b.code === 'full_profile');
    const level = finalProfile?.chair_level;

    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="max-w-lg mx-auto px-6 py-10 w-full flex-1 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center mb-5 animate-pop-in">
            <Check size={28} className="text-white" strokeWidth={2.5} />
          </div>

          <h1 className="text-[28px] font-bold text-neutral-900 tracking-tight leading-tight mb-2">
            {fullProfileBadge ? 'Profil complet !' : 'Beau travail.'}
          </h1>
          <p className="text-[14px] text-neutral-500 leading-relaxed mb-6 max-w-xs">
            {fullProfileBadge
              ? 'Ton profil est prêt à convaincre — badge "Profil complet" débloqué.'
              : "Tu peux continuer à compléter ton profil à tout moment depuis ton espace pro."}
          </p>

          {level && (
            <div className="flex items-center gap-4 bg-neutral-50 rounded-2xl px-5 py-4 mb-6 w-full max-w-xs">
              <div className="w-11 h-11 rounded-full bg-neutral-900 flex items-center justify-center flex-shrink-0">
                <Sparkles size={18} className="text-white" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-[13px] font-bold text-neutral-900 truncate">{level.name}</p>
                <p className="text-[11px] text-neutral-400">{finalProfile?.chair_points ?? 0} points CHAIR</p>
              </div>
            </div>
          )}

          <button
            onClick={() => router.push('/pro')}
            className="w-full max-w-xs bg-neutral-900 text-white font-bold py-4 rounded-2xl text-[15px] active:bg-neutral-700 transition-colors mb-3"
          >
            Aller à mon espace pro
          </button>
          <button
            onClick={() => setShareOpen(true)}
            disabled={!myReferral}
            className="w-full max-w-xs flex items-center justify-center gap-2 text-neutral-500 font-semibold py-3 text-[13px] hover:text-neutral-800 transition-colors disabled:opacity-40"
          >
            <Share2 size={13} />Partager mon profil
          </button>
        </div>

        {myReferral && (
          <ShareSheet
            open={shareOpen}
            onClose={() => { setShareOpen(false); router.push('/pro'); }}
            title="Partager mon profil"
            shareUrl={myReferral.link}
            shareText={`Retrouvez-moi sur CHAIR — ${tagline.trim() || `${user?.name}, coiffeur`}`}
            actionType="share_profile"
            onRewarded={(points) => setBadgeToast({ label: 'Partage effectué', points })}
          />
        )}
      </div>
    );
  }

  const step = steps[stepIndex];
  const progress = ((stepIndex + 1) / steps.length) * 100;

  return (
    <div className="h-[100svh] bg-white flex flex-col overflow-hidden">
      <OnboardingHeader
        progress={progress}
        onBack={stepIndex > 0 ? goBack : undefined}
        onSkip={goNext}
      />

      {badgeToast && (
        <BadgeUnlockToast label={badgeToast.label} points={badgeToast.points} onDone={() => setBadgeToast(null)} />
      )}

      <div className={`flex-1 flex flex-col min-h-0 transition-all duration-180 ease-out ${animClass}`}>

        {/* ── Photo ── */}
        {step === 'photo' && (
          <QuestionScreen eyebrow="Étape 1" title="Ajoute ta photo." hint="Les profils avec photo reçoivent 5x plus de visites." ctaLabel="Continuer" onNext={handleNext}>
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div
                className="relative w-32 h-32 rounded-full bg-neutral-100 overflow-hidden cursor-pointer group border-2 border-dashed border-neutral-300 hover:border-neutral-500 transition-colors flex items-center justify-center"
                onClick={() => triggerFileInput('avatar-input')}
              >
                {avatarUrl ? (
                  <>
                    <Image src={avatarUrl} alt="Avatar" fill className="object-cover" sizes="128px" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera size={22} className="text-white" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <Camera size={28} className="text-neutral-400" />
                    <span className="text-[11px] text-neutral-400">Ajouter</span>
                  </div>
                )}
                {avatarUploading && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <input id="avatar-input" type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) selectAvatar(f); e.target.value = ''; }} />
              {avatarUrl && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600">
                  <Check size={13} />Photo ajoutée
                </div>
              )}
            </div>
          </QuestionScreen>
        )}

        {/* ── Bannière ── */}
        {step === 'banner' && (
          <QuestionScreen eyebrow="Étape 2" title="Ajoute une bannière." hint="Ta vitrine visuelle — inspire confiance dès le premier regard." ctaLabel="Continuer" onNext={handleNext}>
            <div className="flex flex-col items-center gap-4">
              <div
                className="relative w-full h-40 rounded-2xl bg-neutral-100 overflow-hidden cursor-pointer group border-2 border-dashed border-neutral-300 hover:border-neutral-500 transition-colors flex items-center justify-center"
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
                  <div className="flex flex-col items-center gap-2">
                    <ImageIconLucide size={26} className="text-neutral-400" />
                    <span className="text-[13px] text-neutral-500">Sélectionner une image</span>
                  </div>
                )}
                {bannerUploading && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <input id="banner-input" type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) selectBanner(f); e.target.value = ''; }} />
              {bannerUrl && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600">
                  <Check size={13} />Bannière ajoutée
                </div>
              )}
            </div>
          </QuestionScreen>
        )}

        {/* ── Accroche ── */}
        {step === 'tagline' && (
          <QuestionScreen eyebrow="Ton profil" title="Ton accroche ?" hint="Quelques mots percutants, visibles en tête de profil." ctaLabel="Continuer" onNext={handleNext}>
            <input
              autoFocus
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Ex : Spécialiste du balayage à Strasbourg"
              maxLength={100}
              className={inputCls}
            />
            <div className="text-right text-[11px] text-neutral-400 mt-1.5">{tagline.length}/100</div>
          </QuestionScreen>
        )}

        {/* ── Bio ── */}
        {step === 'bio' && (
          <QuestionScreen eyebrow="Ton profil" title="Raconte ton histoire." hint="Une bio complète améliore ton référencement sur CHAIR." ctaLabel="Continuer" onNext={handleNext}>
            <textarea
              autoFocus
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Coiffeuse passionnée depuis 10 ans, formée chez..."
              rows={6}
              maxLength={1000}
              className={`${inputCls} resize-none`}
            />
            <div className="flex items-center justify-between mt-1.5">
              <span className={`text-[11px] ${bio.length >= 100 ? 'text-green-600 font-medium' : 'text-neutral-400'}`}>
                {bio.length >= 100 ? 'Bonne longueur' : `${100 - bio.length} caractères minimum recommandés`}
              </span>
              <span className="text-[11px] text-neutral-400">{bio.length}/1000</span>
            </div>
          </QuestionScreen>
        )}

        {/* ── Localisation (un seul écran, uniquement si pas déjà renseignée à l'inscription) ── */}
        {step === 'geo_location' && (
          <QuestionScreen
            eyebrow="Localisation"
            title="Où exerces-tu ?"
            hint="Pour être retrouvé sur la carte et dans les recherches et classements locaux."
            ctaLabel="Continuer"
            ctaDisabled={!region || !department || city.trim().length < 2}
            onNext={handleNext}
          >
            <LocationAccordion
              value={{ region, department, city, street }}
              onChange={(patch) => {
                if (patch.region !== undefined) setRegion(patch.region);
                if (patch.department !== undefined) setDepartment(patch.department);
                if (patch.city !== undefined) setCity(patch.city);
                if (patch.street !== undefined) setStreet(patch.street);
              }}
              theme="light"
            />
          </QuestionScreen>
        )}

        {/* ── Spécialités ── */}
        {step === 'specialties' && (
          <QuestionScreen
            eyebrow="Visibilité"
            title="Tes spécialités ?"
            hint="Les clients recherchent par univers. Coche tout ce qui te représente."
            ctaLabel="Continuer"
            onNext={handleNext}
          >
            <SpecialtyPicker
              specialties={allSpecialties}
              selected={selectedSpecialties}
              onToggle={(id) => setSelectedSpecialties((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
            />
            {selectedSpecialties.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600 mt-4">
                <Check size={13} />
                {selectedSpecialties.length} spécialité{selectedSpecialties.length > 1 ? 's' : ''} sélectionnée{selectedSpecialties.length > 1 ? 's' : ''}
              </div>
            )}
          </QuestionScreen>
        )}

        {/* ── Services ── */}
        {step === 'services' && (
          <QuestionScreen
            eyebrow="Prestations"
            title="Un premier service ?"
            hint="Une spécialité regroupe plusieurs prestations — tu pourras en ajouter d'autres depuis ton profil."
            ctaLabel="Continuer"
            onNext={handleNext}
          >
            {serviceSaved ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-1">
                  <Check size={22} className="text-green-600" />
                </div>
                <p className="text-sm font-semibold text-neutral-900">Service ajouté</p>
                <button type="button" onClick={() => { setServiceSaved(false); setServiceName(''); setServicePrice(''); }}
                  className="mt-2 text-xs font-semibold text-neutral-900 border border-neutral-200 rounded-full px-4 py-2 hover:bg-neutral-50 transition-colors">
                  + Ajouter un autre service
                </button>
              </div>
            ) : selectedSpecialties.length === 0 ? (
              <p className="text-xs text-neutral-400 text-center py-4">
                Aucune spécialité sélectionnée — tu pourras ajouter des services depuis ton profil.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {selectedSpecialties.map((id) => {
                    const sp = allSpecialties.find((s) => s.id === id);
                    if (!sp) return null;
                    const active = serviceSpecialtyId === id;
                    return (
                      <button key={id} type="button" onClick={() => setServiceSpecialtyId(id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          active ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                        }`}>
                        {sp.name}
                      </button>
                    );
                  })}
                </div>
                <input
                  autoFocus
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Nom du service — ex : Taper Bas, Balayage..."
                  className={inputCls}
                />
                {isIndependent && (
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" value={servicePrice} onChange={(e) => setServicePrice(e.target.value)} placeholder="Prix (€)" min="0" className={inputCls} />
                    <select value={serviceDuration} onChange={(e) => setServiceDuration(e.target.value)} className={inputCls}>
                      {[30, 45, 60, 75, 90, 120, 150, 180].map((d) => <option key={d} value={d}>{d} min</option>)}
                    </select>
                  </div>
                )}
                <button
                  type="button"
                  onClick={saveService}
                  disabled={serviceSaving || !serviceName.trim() || !serviceSpecialtyId}
                  className="w-full bg-neutral-100 text-neutral-900 font-semibold py-3 rounded-xl text-sm hover:bg-neutral-200 transition-colors disabled:opacity-50"
                >
                  {serviceSaving ? 'Enregistrement...' : 'Ajouter ce service'}
                </button>
              </div>
            )}
          </QuestionScreen>
        )}

        {/* ── Horaires (indépendants uniquement) ── */}
        {step === 'schedule' && (
          <QuestionScreen eyebrow="Réservation" title="Tes horaires ?" hint="Indispensable pour que les clients puissent réserver." ctaLabel="Continuer" onNext={handleNext}>
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
                    <button type="button" onClick={() => setSchedule((prev) => prev.map((d, i) => i === idx ? { ...d, open: !d.open } : d))}
                      className={`w-20 text-center text-xs font-semibold py-2 rounded-lg border transition-all ${s.open ? 'bg-neutral-900 text-white border-neutral-900' : 'text-neutral-400 border-neutral-200'}`}>
                      {s.label.slice(0, 3)}
                    </button>
                    {s.open ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <input type="time" value={s.start} onChange={(e) => setSchedule((prev) => prev.map((d, i) => i === idx ? { ...d, start: e.target.value } : d))}
                          className="flex-1 px-2 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs focus:outline-none" />
                        <span className="text-neutral-400 text-xs">→</span>
                        <input type="time" value={s.end} onChange={(e) => setSchedule((prev) => prev.map((d, i) => i === idx ? { ...d, end: e.target.value } : d))}
                          className="flex-1 px-2 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs focus:outline-none" />
                      </div>
                    ) : <span className="text-xs text-neutral-400">Fermé</span>}
                  </div>
                ))}
                <button type="button" onClick={saveSchedule} disabled={scheduleSaving}
                  className="w-full bg-neutral-100 text-neutral-900 font-semibold py-3 rounded-xl text-sm hover:bg-neutral-200 transition-colors disabled:opacity-50 mt-3">
                  {scheduleSaving ? 'Enregistrement...' : 'Valider mes horaires'}
                </button>
              </div>
            )}
          </QuestionScreen>
        )}

        {/* ── Première réalisation ── */}
        {step === 'post' && (
          <QuestionScreen eyebrow="Portfolio" title="Ta première réalisation." hint="La plus importante — montre ton meilleur travail." ctaLabel="Continuer" onNext={handleNext}>
            {postSaved ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-1">
                  <Check size={22} className="text-green-600" />
                </div>
                <p className="text-sm font-semibold text-neutral-900">Réalisation publiée</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  className="relative w-full h-44 rounded-2xl bg-neutral-100 overflow-hidden cursor-pointer group border-2 border-dashed border-neutral-300 hover:border-neutral-500 transition-colors flex items-center justify-center"
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
                      <Camera size={26} className="text-neutral-400" />
                      <span className="text-sm text-neutral-500">Sélectionner une photo</span>
                    </div>
                  )}
                </div>
                <input id="post-input" type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setPostImage(URL.createObjectURL(file));
                    setPostSaving(true);
                    uploadPostImage(file).finally(() => setPostSaving(false));
                  }} />
                <textarea
                  value={postDescription}
                  onChange={(e) => setPostDescription(e.target.value)}
                  placeholder="Description (optionnelle) — Balayage naturel, 2h30..."
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
                {postSaving && (
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <div className="w-3 h-3 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
                    Publication en cours...
                  </div>
                )}
              </div>
            )}
          </QuestionScreen>
        )}

        {/* ── Découvre CHAIR ── */}
        {step === 'discover' && (
          <QuestionScreen eyebrow="Et ensuite" title="Découvre CHAIR." hint="Tout ce que ton profil va débloquer, au fil de ton activité." ctaLabel="Terminer" onNext={handleNext}>
            <DiscoverCarousel />
          </QuestionScreen>
        )}
      </div>

      {avatarCropSrc && (
        <ImageCropModal imageSrc={avatarCropSrc} aspect={1} shape="round" onConfirm={uploadAvatarBlob} onCancel={() => setAvatarCropSrc(null)} />
      )}
      {bannerCropSrc && (
        <ImageCropModal imageSrc={bannerCropSrc} aspect={3} shape="rect" onConfirm={uploadBannerBlob} onCancel={() => setBannerCropSrc(null)} />
      )}

      <div className="flex-shrink-0 text-center pb-3">
        <button onClick={() => { logout(); router.push('/'); }} className="text-[12px] text-neutral-300 hover:text-neutral-500 transition-colors">
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
