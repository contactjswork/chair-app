'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { salons } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/types';
import { Camera, Check, ImageIcon as ImageIconLucide, Briefcase, Users, Armchair, Star } from 'lucide-react';
import ImageCropModal from '@/components/ui/ImageCropModal';
import OnboardingHeader from '@/components/onboarding/OnboardingHeader';
import QuestionScreen from '@/components/onboarding/QuestionScreen';
import LocationAccordion from '@/components/onboarding/LocationAccordion';
import DiscoverCarousel, { type DiscoverFeature } from '@/components/onboarding/DiscoverCarousel';
import { useStepTransition, tapFeedback } from '@/hooks/useStepTransition';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

type Step = 'logo' | 'cover' | 'description' | 'geo_location' | 'discover';

const inputCls = 'w-full px-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-[16px] text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 transition-all';

const OWNER_FEATURES: DiscoverFeature[] = [
  { icon: Users,     title: 'Équipe',       desc: 'Invitez vos coiffeurs — par recherche ou par email — et gérez qui rejoint votre salon.' },
  { icon: Briefcase, title: 'Recrutement',  desc: 'Publiez des offres et suivez vos candidatures, du premier contact à l\'embauche.' },
  { icon: Armchair,  title: 'Fauteuils',    desc: 'Louez vos fauteuils libres à des coiffeurs indépendants, à vos conditions.' },
  { icon: Star,      title: 'Avis clients', desc: 'Générez des demandes d\'avis vérifiés pour votre équipe, visite après visite.' },
];

export default function OwnerOnboardingPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const { animClass, transition } = useStepTransition();

  const [hadAddress, setHadAddress] = useState<boolean | null>(null);

  const steps = useMemo<Step[]>(() => {
    const s: Step[] = ['logo', 'cover', 'description'];
    if (hadAddress === false) s.push('geo_location');
    s.push('discover');
    return s;
  }, [hadAddress]);

  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);

  // Logo
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoCropSrc, setLogoCropSrc] = useState<string | null>(null);

  // Cover
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverCropSrc, setCoverCropSrc] = useState<string | null>(null);

  // Description / localisation
  const [description, setDescription] = useState('');
  const [country, setCountry] = useState('France');
  const [region, setRegion] = useState('');
  const [department, setDepartment] = useState('');
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [salonName, setSalonName] = useState('');

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push('/pro/connexion'); return; }
    if (!user.can_manage_salon) { router.push('/pro'); return; }

    salons.mySalon().then(({ salon }) => {
      setSalonName(salon.name);
      setLogoUrl(resolveMediaUrl(salon.logo));
      setCoverUrl(resolveMediaUrl(salon.cover_image));
      setDescription(salon.description ?? '');
      setRegion(salon.region ?? '');
      setDepartment(salon.department ?? '');
      setCity(salon.city ?? '');
      setStreet(salon.address ?? '');
      setHadAddress(!!(salon.region && salon.department && salon.city));
    }).catch(() => setHadAddress(true));
  }, [user, isLoading, router]);

  function selectLogo(file: File) { setLogoCropSrc(URL.createObjectURL(file)); }

  async function uploadLogoBlob(blob: Blob, previewUrl: string) {
    setLogoCropSrc(null);
    setLogoUrl(previewUrl);
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', blob, 'logo.jpg');
      const token = localStorage.getItem('chair_token');
      const res = await fetch(`${API_BASE}/my-salon/logo`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: formData });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLogoUrl(data.url ?? previewUrl);
    } catch { /* garde le preview local si upload échoue */ } finally { setLogoUploading(false); }
  }

  function selectCover(file: File) { setCoverCropSrc(URL.createObjectURL(file)); }

  async function uploadCoverBlob(blob: Blob, previewUrl: string) {
    setCoverCropSrc(null);
    setCoverUrl(previewUrl);
    setCoverUploading(true);
    try {
      const formData = new FormData();
      formData.append('cover', blob, 'cover.jpg');
      const token = localStorage.getItem('chair_token');
      const res = await fetch(`${API_BASE}/my-salon/cover`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: formData });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCoverUrl(data.url ?? previewUrl);
    } catch { /* garde le preview local si upload échoue */ } finally { setCoverUploading(false); }
  }

  async function saveDescriptionStep() {
    try { await salons.updateMySalon({ description }); } catch { /* silencieux */ }
  }

  async function saveGeoStep() {
    try { await salons.updateMySalon({ region, department, city, address: street }); } catch { /* silencieux */ }
  }

  const finish = useCallback(() => { setDone(true); }, []);

  function goNext() {
    tapFeedback();
    if (stepIndex >= steps.length - 1) { finish(); return; }
    transition(() => setStepIndex((i) => i + 1));
  }

  async function handleNext() {
    const current = steps[stepIndex];
    if (current === 'description') await saveDescriptionStep();
    if (current === 'geo_location') await saveGeoStep();
    goNext();
  }

  function goBack() {
    if (stepIndex === 0) return;
    tapFeedback();
    transition(() => setStepIndex((i) => i - 1));
  }

  function triggerFileInput(id: string) { document.getElementById(id)?.click(); }

  if (isLoading || !user || hadAddress === null) {
    return <div className="min-h-screen bg-white flex items-center justify-center"><div className="text-sm text-neutral-400">Chargement...</div></div>;
  }

  if (done) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="max-w-lg mx-auto px-6 py-10 w-full flex-1 flex flex-col items-center text-center justify-center">
          <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center mb-5">
            <Check size={28} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-[28px] font-bold text-neutral-900 tracking-tight leading-tight mb-2">
            {salonName} est prêt.
          </h1>
          <p className="text-[14px] text-neutral-500 leading-relaxed mb-8 max-w-xs">
            Vous pouvez continuer à compléter votre fiche salon à tout moment depuis votre espace gérant.
          </p>
          <button
            onClick={() => router.push('/pro/salon-owner')}
            className="w-full max-w-xs bg-neutral-900 text-white font-bold py-4 rounded-2xl text-[15px] active:bg-neutral-700 transition-colors"
          >
            Aller à mon espace gérant
          </button>
        </div>
      </div>
    );
  }

  const step = steps[stepIndex];
  const progress = ((stepIndex + 1) / steps.length) * 100;

  return (
    // min-h (pas h fixe) + pas d'overflow-hidden : évite que le CTA passe
    // sous le clavier mobile ouvert (voir pro/inscription/page.tsx).
    <div className="min-h-[100dvh] bg-white flex flex-col">
      <OnboardingHeader progress={progress} onBack={stepIndex > 0 ? goBack : undefined} onSkip={goNext} />

      <div className={`flex-1 flex flex-col min-h-0 transition-all duration-180 ease-out ${animClass}`}>

        {/* ── Logo ── */}
        {step === 'logo' && (
          <QuestionScreen eyebrow="Étape 1" title="Le logo de votre salon." hint="Affiché sur votre fiche publique et dans les résultats de recherche." ctaLabel="Continuer" onNext={handleNext}>
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div
                className="relative w-32 h-32 rounded-2xl bg-neutral-100 overflow-hidden cursor-pointer group border-2 border-dashed border-neutral-300 hover:border-neutral-500 transition-colors flex items-center justify-center"
                onClick={() => triggerFileInput('logo-input')}
              >
                {logoUrl ? (
                  <>
                    <Image src={logoUrl} alt="Logo" fill className="object-cover" sizes="128px" />
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
                {logoUploading && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <input id="logo-input" type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) selectLogo(f); e.target.value = ''; }} />
              {logoUrl && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600">
                  <Check size={13} />Logo ajouté
                </div>
              )}
            </div>
          </QuestionScreen>
        )}

        {/* ── Cover ── */}
        {step === 'cover' && (
          <QuestionScreen eyebrow="Étape 2" title="Une photo du salon." hint="Votre vitrine — l'intérieur, la devanture, l'ambiance." ctaLabel="Continuer" onNext={handleNext}>
            <div className="flex flex-col items-center gap-4">
              <div
                className="relative w-full h-40 rounded-2xl bg-neutral-100 overflow-hidden cursor-pointer group border-2 border-dashed border-neutral-300 hover:border-neutral-500 transition-colors flex items-center justify-center"
                onClick={() => triggerFileInput('cover-input')}
              >
                {coverUrl ? (
                  <>
                    <Image src={coverUrl} alt="Cover" fill className="object-cover" sizes="400px" />
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
                {coverUploading && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <input id="cover-input" type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) selectCover(f); e.target.value = ''; }} />
              {coverUrl && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600">
                  <Check size={13} />Photo ajoutée
                </div>
              )}
            </div>
          </QuestionScreen>
        )}

        {/* ── Description ── */}
        {step === 'description' && (
          <QuestionScreen eyebrow="Votre salon" title="Présentez votre salon." hint="Ambiance, spécialités, ce qui vous distingue — visible sur votre fiche publique." ctaLabel="Continuer" onNext={handleNext}>
            <textarea
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Salon familial au cœur de..."
              rows={6}
              maxLength={2000}
              className={`${inputCls} resize-none`}
            />
            <div className="text-right text-[11px] text-neutral-400 mt-1.5">{description.length}/2000</div>
          </QuestionScreen>
        )}

        {/* ── Localisation (uniquement si pas déjà renseignée) ── */}
        {step === 'geo_location' && (
          <QuestionScreen
            eyebrow="Localisation"
            title="Où se trouve votre salon ?"
            hint="Pour être retrouvé sur la carte et dans les recherches locales."
            ctaLabel="Continuer"
            ctaDisabled={country === 'France' ? (!region || !department || city.trim().length < 2) : city.trim().length < 2}
            onNext={handleNext}
          >
            <LocationAccordion
              value={{ country, region, department, city, street }}
              onChange={(patch) => {
                if (patch.country !== undefined) setCountry(patch.country);
                if (patch.region !== undefined) setRegion(patch.region);
                if (patch.department !== undefined) setDepartment(patch.department);
                if (patch.city !== undefined) setCity(patch.city);
                if (patch.street !== undefined) setStreet(patch.street);
              }}
              theme="light"
            />
          </QuestionScreen>
        )}

        {/* ── Découvre CHAIR PRO Gérant ── */}
        {step === 'discover' && (
          <QuestionScreen eyebrow="Et ensuite" title="Découvrez CHAIR PRO." hint="Tout ce que votre espace gérant vous permet de faire." ctaLabel="Terminer" onNext={handleNext}>
            <DiscoverCarousel features={OWNER_FEATURES} />
          </QuestionScreen>
        )}
      </div>

      {logoCropSrc && (
        <ImageCropModal imageSrc={logoCropSrc} aspect={1} shape="rect" onConfirm={uploadLogoBlob} onCancel={() => setLogoCropSrc(null)} />
      )}
      {coverCropSrc && (
        <ImageCropModal imageSrc={coverCropSrc} aspect={3} shape="rect" onConfirm={uploadCoverBlob} onCancel={() => setCoverCropSrc(null)} />
      )}

      <div className="flex-shrink-0 text-center pb-3">
        <button onClick={() => { logout(); router.push('/'); }} className="text-[12px] text-neutral-300 hover:text-neutral-500 transition-colors">
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
