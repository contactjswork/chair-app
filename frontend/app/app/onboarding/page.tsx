'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { referral } from '@/lib/api';
import type { ApiReferral } from '@/lib/types';
import Image from 'next/image';
import { Check, ArrowRight, Share2 } from 'lucide-react';
import ShareSheet from '@/components/ui/ShareSheet';
import { getSharePayload } from '@/lib/share';
import OnboardingHeader from '@/components/onboarding/OnboardingHeader';
import PermissionsStep from '@/components/onboarding/PermissionsStep';
import { useStepTransition } from '@/hooks/useStepTransition';
import { getLiveSpecialties, SPECIALTY_ILLUSTRATIONS, HOMME_SPECIALTY_SLUGS, FEMME_SPECIALTY_SLUGS, type LiveSpecialty } from '@/lib/specialties';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

type Gender = 'femme' | 'homme' | 'non-binaire' | null;
type Step   = 'genre' | 'styles' | 'permissions' | 'done';

// Les 14 spécialités actives (source : /api/specialties) réparties par genre
// selon HOMME_SPECIALTY_SLUGS/FEMME_SPECIALTY_SLUGS (lib/specialties.ts,
// seule source de vérité) — plus de liste codée en dur ici qui pouvait
// diverger de la vraie taxonomie en base (des spécialités actives
// n'apparaissaient jamais dans cet onboarding).
function getOptions(g: Gender, all: LiveSpecialty[]): LiveSpecialty[] {
  const bySlug = new Map(all.map((s) => [s.slug, s]));
  const pick = (slugs: string[]) => slugs.map((slug) => bySlug.get(slug)).filter((s): s is LiveSpecialty => Boolean(s));
  if (g === 'femme') return pick(FEMME_SPECIALTY_SLUGS);
  if (g === 'homme') return pick(HOMME_SPECIALTY_SLUGS);
  // non-binaire / "je préfère ne pas dire" : les 14 spécialités.
  return pick([...FEMME_SPECIALTY_SLUGS, ...HOMME_SPECIALTY_SLUGS]);
}

// Progression de l'onboarding client, mappée sur la même échelle 0-100 que
// OnboardingHeader (partagé avec CHAIR PRO) pour ne pas garder deux calculs.
function progressForStep(step: Step): number {
  return step === 'genre' ? 33 : step === 'styles' ? 66 : 100;
}

export default function ClientOnboardingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [step,     setStep]     = useState<Step>('genre');
  const [gender,   setGender]   = useState<Gender>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { animClass, transition } = useStepTransition();
  const [saving,   setSaving]   = useState(false);
  const [myReferral, setMyReferral] = useState<ApiReferral | null>(null);
  const [shareOpen,  setShareOpen]  = useState(false);
  // Taxonomie live (id/slug/name/image_url), administrable sans build depuis
  // Configuration > Spécialités — [] tant que le fetch n'a pas résolu.
  const [liveSpecialties, setLiveSpecialties] = useState<LiveSpecialty[]>([]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/connexion?returnTo=%2Fapp%2Fonboarding'); return; }
    if (user.role === 'hairdresser' || user.role === 'salon_owner') router.replace('/pro');
  }, [user, isLoading, router]);

  useEffect(() => {
    let cancelled = false;
    getLiveSpecialties().then((list) => { if (!cancelled) setLiveSpecialties(list); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (step !== 'done') return;
    referral.mine().then(setMyReferral).catch(() => {});
  }, [step]);

  function pickGender(g: Gender) {
    setGender(g);
    setSelected(new Set());
    transition(() => setStep('styles'));
  }

  function toggleSlug(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  }

  async function finish() {
    setSaving(true);
    const slugs = [...selected];
    localStorage.setItem('chair_preferences', JSON.stringify({ gender, interests: slugs }));
    try {
      const token = localStorage.getItem('chair_token');
      await fetch(`${API}/preferences`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ profile_type: gender, interests: slugs, goal: null }),
      });
    } catch { /* ignore */ }
    setSaving(false);
    // Étape d'autorisations (notifs + localisation) avant l'écran final, donc
    // avant d'entrer dans l'app. Sur le web elle s'auto-passe (voir le composant).
    transition(() => setStep('permissions'));
  }

  function skip() {
    if (!localStorage.getItem('chair_preferences')) {
      localStorage.setItem('chair_preferences', JSON.stringify({ gender: null, interests: [] }));
    }
    router.push('/app');
  }

  if (isLoading || !user) return null;

  // Écran d'autorisations plein cadre (notifs + localisation), juste avant
  // l'écran final. Rendu à part car il ne partage pas l'ossature à en-tête.
  if (step === 'permissions') {
    return <PermissionsStep theme="light" onContinue={() => transition(() => setStep('done'))} />;
  }

  const firstName = user.name.split(' ')[0];
  const options   = getOptions(gender, liveSpecialties);

  return (
    // min-h (pas h fixe) + pas d'overflow-hidden : évite que le CTA passe
    // sous le clavier mobile ouvert (voir pro/inscription/page.tsx).
    <div className="min-h-[100dvh] bg-white flex flex-col">

      <OnboardingHeader
        progress={progressForStep(step)}
        onBack={step === 'styles' ? () => transition(() => setStep('genre')) : undefined}
        onSkip={step !== 'done' ? skip : undefined}
      />

      {/* ── Contenu animé ── */}
      <div className={`flex-1 flex flex-col min-h-0 transition-all duration-180 ease-out ${animClass}`}>

        {/* ÉTAPE 1 — Genre */}
        {step === 'genre' && (
          <div className="flex-1 flex flex-col px-5 pb-6 min-h-0">
            {/* Titre */}
            <div className="mb-5">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-1.5">
                Bienvenue, {firstName}
              </p>
              <h1 className="text-[30px] font-bold text-neutral-900 leading-[1.1] tracking-tight">
                Quel est<br />ton univers ?
              </h1>
            </div>

            {/* Cartes principales — flex-1 pour remplir */}
            <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
              {([
                { g: 'femme' as Gender, label: 'Femme',  sub: 'Couleurs, coupes, textures', icon: '/onboarding/coiffure-femme.png' },
                { g: 'homme' as Gender, label: 'Homme',  sub: 'Barber, dégradés, styles',   icon: '/onboarding/coiffure-homme.png' },
              ]).map(({ g, label, sub, icon }) => (
                <button
                  key={g as string}
                  onClick={() => pickGender(g)}
                  className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-neutral-100 bg-neutral-50 hover:border-neutral-300 hover:bg-neutral-100 active:scale-[0.96] transition-all duration-150"
                >
                  <Image src={icon} alt={label} width={90} height={90} className="object-contain mix-blend-multiply" />
                  <div className="text-center px-2">
                    <p className="text-[16px] font-bold text-neutral-900">{label}</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">{sub}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Options secondaires */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              {([
                { g: 'non-binaire' as Gender, label: 'Non-binaire' },
                { g: null,                    label: 'Je préfère ne pas dire' },
              ]).map(({ g, label }) => (
                <button
                  key={label}
                  onClick={() => pickGender(g)}
                  className="flex items-center justify-center border border-neutral-200 rounded-xl py-3 px-3 text-[12px] font-medium text-neutral-500 hover:border-neutral-400 hover:text-neutral-800 active:scale-[0.97] transition-all duration-150"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ÉTAPE 2 — Styles */}
        {step === 'styles' && (
          <div className="flex-1 flex flex-col min-h-0 relative">
            <div className="px-5 pb-3">
              <h1 className="text-[30px] font-bold text-neutral-900 leading-[1.1] tracking-tight">
                Ce qui t&apos;inspire.
              </h1>
              <p className="text-[13px] text-neutral-400 mt-1.5">
                {selected.size === 0
                  ? 'Choisis au moins un style'
                  : `${selected.size} sélectionné${selected.size > 1 ? 's' : ''}`}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pt-1 pb-28 min-h-0">
              <div className={`gap-2 ${options.length <= 6 ? 'grid grid-cols-3 grid-rows-2 h-full' : 'grid grid-cols-3'}`}>
                {options.map((opt) => {
                  const active = selected.has(opt.slug);
                  const photo = opt.image_url;
                  const illustration = SPECIALTY_ILLUSTRATIONS[opt.slug];
                  return (
                    <button
                      key={opt.slug}
                      onClick={() => toggleSlug(opt.slug)}
                      className={`relative flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all duration-150 ${
                        active ? 'border-neutral-900 bg-neutral-50' : 'border-transparent bg-neutral-50 hover:bg-neutral-100 active:scale-[0.93]'
                      }`}
                    >
                      <div className="relative">
                        {photo ? (
                          // Vraie photo (Cloudinary) : cadre plein, pas de
                          // blend — réservé aux illustrations fond blanc ci-dessous.
                          <div className="relative w-[68px] h-[68px] rounded-2xl overflow-hidden">
                            <Image src={photo} alt={opt.name} fill sizes="68px" className="object-cover" />
                          </div>
                        ) : illustration ? (
                          <Image src={illustration} alt={opt.name} width={68} height={68} className="object-contain mix-blend-multiply" />
                        ) : opt.icon ? (
                          <div className="w-[68px] h-[68px] rounded-2xl bg-neutral-100 flex items-center justify-center">
                            <span style={{ fontSize: 38 }} className="leading-none">{opt.icon}</span>
                          </div>
                        ) : (
                          <div className="w-[68px] h-[68px] rounded-2xl bg-neutral-100" />
                        )}
                        {active && (
                          <span
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-neutral-900 flex items-center justify-center"
                            style={{ animation: 'popIn 0.15s cubic-bezier(0.34,1.56,0.64,1) both' }}
                          >
                            <Check size={10} className="text-white" strokeWidth={3.5} />
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] font-semibold text-center leading-tight px-1 ${active ? 'text-neutral-900' : 'text-neutral-500'}`}>
                        {opt.name}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
            <style>{`@keyframes popIn { from { transform: scale(0); opacity: 0 } to { transform: scale(1); opacity: 1 } }`}</style>

            {/* CTA sticky */}
            <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-8 bg-gradient-to-t from-white via-white/95 to-transparent">
              <button
                onClick={selected.size > 0 ? finish : skip}
                disabled={saving}
                className={`w-full flex items-center justify-center gap-2 font-semibold py-4 rounded-2xl text-[15px] transition-all duration-150 disabled:opacity-60 ${
                  selected.size > 0
                    ? 'bg-neutral-900 text-white active:bg-neutral-700'
                    : 'bg-neutral-100 text-neutral-500 active:bg-neutral-200'
                }`}
              >
                {saving ? 'Un instant…' : selected.size > 0 ? 'Voir CHAIR' : 'Passer cette étape'}
                {!saving && <ArrowRight size={15} />}
              </button>
            </div>
          </div>
        )}

        {/* DONE */}
        {step === 'done' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 pb-10">
            <div
              className="w-[72px] h-[72px] rounded-full bg-neutral-900 flex items-center justify-center mb-6"
              style={{ animation: 'popIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both' }}
            >
              <Check size={30} className="text-white" strokeWidth={2.5} />
            </div>

            <h1 className="text-[30px] font-bold text-neutral-900 leading-tight tracking-tight mb-2">
              Bienvenue sur CHAIR.
            </h1>
            <p className="text-[14px] text-neutral-400 leading-relaxed mb-6 max-w-[260px]">
              Retrouve les meilleurs coiffeurs près de toi, sélectionnés selon tes goûts.
            </p>

            {selected.size > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5 mb-6 max-w-[300px]">
                {[...selected].slice(0, 6).map((slug) => {
                  const opt = liveSpecialties.find((o) => o.slug === slug);
                  return opt ? (
                    <span key={slug} className="text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-full">
                      {opt.name}
                    </span>
                  ) : null;
                })}
              </div>
            )}

            <button
              onClick={() => router.push('/app')}
              className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white font-bold py-4 rounded-2xl text-[15px] active:bg-neutral-700 transition-colors"
            >
              Découvrir CHAIR
              <ArrowRight size={15} />
            </button>

            {myReferral && (
              <button
                onClick={() => setShareOpen(true)}
                className="w-full flex items-center justify-center gap-2 text-neutral-500 font-semibold py-3 text-[13px] hover:text-neutral-800 active:text-neutral-800 transition-colors"
              >
                <Share2 size={13} />Inviter un ami sur CHAIR
              </button>
            )}

            <style>{`@keyframes popIn { from { transform: scale(0); opacity: 0 } to { transform: scale(1); opacity: 1 } }`}</style>
          </div>
        )}

        {myReferral && (
          <ShareSheet
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            title="Inviter un ami"
            shareUrl={myReferral.link}
            shareText={getSharePayload('referral', { url: myReferral.link }, { audience: 'client' }).text}
            actionType="share_profile"
          />
        )}

      </div>
    </div>
  );
}
