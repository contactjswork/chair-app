'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { referral } from '@/lib/api';
import type { ApiReferral } from '@/lib/types';
import Image from 'next/image';
import { Check, ArrowRight, ArrowLeft, Share2 } from 'lucide-react';
import ShareSheet from '@/components/ui/ShareSheet';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

type Gender = 'femme' | 'homme' | 'non-binaire' | null;
type Step   = 'genre' | 'styles' | 'done';

interface StyleOption { slug: string; label: string; icon: string; }

const FEMME: StyleOption[] = [
  { slug: 'balayage',    label: 'Balayage',         icon: '/onboarding/balayage.png' },
  { slug: 'coupe-femme', label: 'Coupe & Frange',   icon: '/onboarding/coupe.png' },
  { slug: 'boucles',     label: 'Boucles',          icon: '/onboarding/boucles.png' },
  { slug: 'lissage',     label: 'Lissage',          icon: '/onboarding/lissage.png' },
  { slug: 'coloration',  label: 'Couleur Créative', icon: '/onboarding/couleur-femme.png' },
  { slug: 'chignon',     label: 'Chignon & Soirée', icon: '/onboarding/chignon.png' },
];

const HOMME: StyleOption[] = [
  { slug: 'barber',        label: 'Barber & Dégradé', icon: '/onboarding/barber.png' },
  { slug: 'coupe-homme',   label: 'Coupe Classique',  icon: '/onboarding/classique.png' },
  { slug: 'coupe-longue',  label: 'Cheveux Longs',    icon: '/onboarding/cheveux-longs.png' },
  { slug: 'barbe',         label: 'Barbe',            icon: '/onboarding/barbe.png' },
  { slug: 'couleur-homme', label: 'Couleur & Créatif',icon: '/onboarding/couleur.png' },
  { slug: 'dreads',        label: 'Dreads & Locks',   icon: '/onboarding/dreads.png' },
];

const ALL: StyleOption[] = [
  { slug: 'balayage',      label: 'Balayage',          icon: '/onboarding/balayage.png' },
  { slug: 'barber',        label: 'Barber & Dégradé',  icon: '/onboarding/barber.png' },
  { slug: 'coupe-femme',   label: 'Coupe & Frange',    icon: '/onboarding/coupe.png' },
  { slug: 'coupe-homme',   label: 'Coupe Classique',   icon: '/onboarding/classique.png' },
  { slug: 'boucles',       label: 'Boucles & Locks',   icon: '/onboarding/boucles.png' },
  { slug: 'coloration',    label: 'Couleur Créative',  icon: '/onboarding/couleur-femme.png' },
  { slug: 'barbe',         label: 'Barbe',             icon: '/onboarding/barbe.png' },
  { slug: 'chignon',       label: 'Chignon & Soirée',  icon: '/onboarding/chignon.png' },
  { slug: 'coupe-longue',  label: 'Cheveux Longs',     icon: '/onboarding/cheveux-longs.png' },
  { slug: 'lissage',       label: 'Lissage',           icon: '/onboarding/lissage.png' },
  { slug: 'couleur-homme', label: 'Couleur & Créatif', icon: '/onboarding/couleur.png' },
  { slug: 'dreads',        label: 'Dreads & Locks',    icon: '/onboarding/dreads.png' },
];

function getOptions(g: Gender): StyleOption[] {
  if (g === 'femme') return FEMME;
  if (g === 'homme') return HOMME;
  return ALL;
}

// Barre de progression fine
function ProgressBar({ step }: { step: Step }) {
  const pct = step === 'genre' ? 33 : step === 'styles' ? 66 : 100;
  return (
    <div className="flex-1 h-[3px] bg-neutral-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-neutral-900 rounded-full transition-all duration-400 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function ClientOnboardingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [step,     setStep]     = useState<Step>('genre');
  const [gender,   setGender]   = useState<Gender>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anim,     setAnim]     = useState<'in' | 'out'>('in');
  const [saving,   setSaving]   = useState(false);
  const [myReferral, setMyReferral] = useState<ApiReferral | null>(null);
  const [shareOpen,  setShareOpen]  = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/connexion'); return; }
    if (user.role === 'hairdresser' || user.role === 'salon_owner') router.replace('/pro');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (step !== 'done') return;
    referral.mine().then(setMyReferral).catch(() => {});
  }, [step]);

  function transition(fn: () => void) {
    setAnim('out');
    setTimeout(() => { fn(); setAnim('in'); }, 180);
  }

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
    transition(() => setStep('done'));
  }

  function skip() {
    if (!localStorage.getItem('chair_preferences')) {
      localStorage.setItem('chair_preferences', JSON.stringify({ gender: null, interests: [] }));
    }
    router.push('/app');
  }

  if (isLoading || !user) return null;

  const firstName = user.name.split(' ')[0];
  const options   = getOptions(gender);

  const animClass = anim === 'out'
    ? 'opacity-0 translate-y-3'
    : 'opacity-100 translate-y-0';

  return (
    <div className="h-[100svh] bg-white flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-5 pb-4 pt-safe-5">
        {/* Retour / placeholder */}
        <div className="w-8 flex justify-start">
          {step === 'styles' ? (
            <button
              onClick={() => transition(() => setStep('genre'))}
              className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            <div className="w-8" />
          )}
        </div>

        {/* Barre de progression */}
        <ProgressBar step={step} />

        {/* Passer */}
        <div className="w-12 flex justify-end">
          {step !== 'done' && (
            <button onClick={skip} className="text-[13px] font-medium text-neutral-400 hover:text-neutral-700 transition-colors">
              Passer
            </button>
          )}
        </div>
      </div>

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
                  return (
                    <button
                      key={opt.slug}
                      onClick={() => toggleSlug(opt.slug)}
                      className={`relative flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all duration-150 ${
                        active ? 'border-neutral-900 bg-neutral-50' : 'border-transparent bg-neutral-50 hover:bg-neutral-100 active:scale-[0.93]'
                      }`}
                    >
                      <div className="relative">
                        <Image src={opt.icon} alt={opt.label} width={68} height={68} className="object-contain mix-blend-multiply" />
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
                        {opt.label}
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
                  const opt = [...FEMME, ...HOMME, ...ALL].find((o) => o.slug === slug);
                  return opt ? (
                    <span key={slug} className="text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-full">
                      {opt.label}
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
                className="w-full flex items-center justify-center gap-2 text-neutral-500 font-semibold py-3 text-[13px] hover:text-neutral-800 transition-colors"
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
            shareText="Découvre CHAIR, l'app pour trouver les meilleurs coiffeurs près de toi !"
            actionType="share_profile"
          />
        )}

      </div>
    </div>
  );
}
