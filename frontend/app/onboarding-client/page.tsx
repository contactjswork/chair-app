'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import { Check, ArrowRight, ArrowLeft } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

type Gender = 'femme' | 'homme' | 'non-binaire' | null;
type Step   = 'genre' | 'styles' | 'done';

interface StyleOption {
  slug:    string;
  label:   string;
  photo:   string;
  group:   string;
}

// ─────────────────────────────────────────────────────────
// DONNÉES : catégories par genre
// ─────────────────────────────────────────────────────────

const FEMME: StyleOption[] = [
  // ── Couleur ──────────────────────────────────────────
  { group: 'Couleur & Technique', slug: 'balayage',       label: 'Balayage',       photo: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=500&q=80' },
  { group: 'Couleur & Technique', slug: 'blond',          label: 'Blond',          photo: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=500&q=80' },
  { group: 'Couleur & Technique', slug: 'coloration',     label: 'Coloration',     photo: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&q=80' },
  { group: 'Couleur & Technique', slug: 'ombre-hair',     label: 'Ombré Hair',     photo: 'https://images.unsplash.com/photo-1487412912498-0447578fcca8?w=500&q=80' },
  { group: 'Couleur & Technique', slug: 'tie-dye',        label: 'Tie & Dye',      photo: 'https://images.unsplash.com/photo-1583864697784-a0efc8379f70?w=500&q=80' },
  { group: 'Couleur & Technique', slug: 'roux',           label: 'Roux',           photo: 'https://images.unsplash.com/photo-1595475038665-403f0c0c0d0b?w=500&q=80' },
  { group: 'Couleur & Technique', slug: 'hair-contouring',label: 'Hair Contouring',photo: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&q=80' },
  // ── Coupe ─────────────────────────────────────────────
  { group: 'Coupe',               slug: 'coupe-femme',    label: 'Coupe Femme',    photo: 'https://images.unsplash.com/photo-1595476589022-7c86ade2c24d?w=500&q=80' },
  { group: 'Coupe',               slug: 'coupe-courte',   label: 'Coupe Courte',   photo: 'https://images.unsplash.com/photo-1559620192-032c4bc4674e?w=500&q=80' },
  { group: 'Coupe',               slug: 'coupe-longue',   label: 'Coupe Longue',   photo: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=500&q=80' },
  { group: 'Coupe',               slug: 'frange',         label: 'Frange',         photo: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=500&q=80' },
  // ── Texture ───────────────────────────────────────────
  { group: 'Texture & Style',     slug: 'boucles',        label: 'Boucles',        photo: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=500&q=80' },
  { group: 'Texture & Style',     slug: 'lissage',        label: 'Lissage',        photo: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=500&q=80' },
  { group: 'Texture & Style',     slug: 'ondulations',    label: 'Ondulations',    photo: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=500&q=80' },
  { group: 'Texture & Style',     slug: 'keratine',       label: 'Kératine',       photo: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&q=80' },
  { group: 'Texture & Style',     slug: 'extensions',     label: 'Extensions',     photo: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=500&q=80' },
  { group: 'Texture & Style',     slug: 'dreads',         label: 'Dreads & Locks', photo: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=500&q=80' },
  // ── Occasion ──────────────────────────────────────────
  { group: 'Occasion',            slug: 'mariage',        label: 'Mariée',         photo: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=500&q=80' },
  { group: 'Occasion',            slug: 'chignon',        label: 'Chignon',        photo: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=500&q=80' },
  { group: 'Occasion',            slug: 'coiffure-soiree',label: 'Soirée',         photo: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=500&q=80' },
  { group: 'Occasion',            slug: 'braid',          label: 'Tresses',        photo: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=500&q=80' },
];

const HOMME: StyleOption[] = [
  // ── Coupes ────────────────────────────────────────────
  { group: 'Coupe',               slug: 'barber',         label: 'Barber',         photo: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=500&q=80' },
  { group: 'Coupe',               slug: 'coupe-homme',    label: 'Coupe Classique',photo: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=500&q=80' },
  { group: 'Coupe',               slug: 'coupe-courte',   label: 'Coupe Courte',   photo: 'https://images.unsplash.com/photo-1534308143481-c55f00be8bd7?w=500&q=80' },
  { group: 'Coupe',               slug: 'buzz-cut',       label: 'Buzz Cut',       photo: 'https://images.unsplash.com/photo-1520341280432-4749d4d7bcf9?w=500&q=80' },
  { group: 'Coupe',               slug: 'coupe-longue',   label: 'Cheveux Longs',  photo: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=500&q=80' },
  // ── Dégradés ──────────────────────────────────────────
  { group: 'Dégradés & Fades',    slug: 'degrade',        label: 'Dégradé',        photo: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=500&q=80' },
  { group: 'Dégradés & Fades',    slug: 'taper',          label: 'Taper',          photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80' },
  { group: 'Dégradés & Fades',    slug: 'fade',           label: 'Skin Fade',      photo: 'https://images.unsplash.com/photo-1517832606415-31ad6e57ef1e?w=500&q=80' },
  { group: 'Dégradés & Fades',    slug: 'buzz-cut',       label: 'Undercut',       photo: 'https://images.unsplash.com/photo-1536766820879-059fec98ec0a?w=500&q=80' },
  // ── Barbe ─────────────────────────────────────────────
  { group: 'Barbe',               slug: 'barbe',          label: 'Barbe',          photo: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=500&q=80' },
  { group: 'Barbe',               slug: 'barbe',          label: 'Barbe + Coupe',  photo: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=500&q=80' },
  // ── Couleur ───────────────────────────────────────────
  { group: 'Couleur',             slug: 'couleur-homme',  label: 'Couleur',        photo: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=500&q=80' },
  { group: 'Couleur',             slug: 'dreads',         label: 'Dreads & Locks', photo: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=500&q=80' },
];

const NON_BINAIRE: StyleOption[] = [
  { group: 'Coupe',               slug: 'coupe-courte',   label: 'Coupe Courte',   photo: 'https://images.unsplash.com/photo-1559620192-032c4bc4674e?w=500&q=80' },
  { group: 'Coupe',               slug: 'coupe-longue',   label: 'Coupe Longue',   photo: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=500&q=80' },
  { group: 'Coupe',               slug: 'barber',         label: 'Barber',         photo: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=500&q=80' },
  { group: 'Coupe',               slug: 'degrade',        label: 'Dégradé',        photo: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=500&q=80' },
  { group: 'Couleur',             slug: 'coloration',     label: 'Coloration',     photo: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&q=80' },
  { group: 'Couleur',             slug: 'balayage',       label: 'Balayage',       photo: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=500&q=80' },
  { group: 'Couleur',             slug: 'tie-dye',        label: 'Tie & Dye',      photo: 'https://images.unsplash.com/photo-1583864697784-a0efc8379f70?w=500&q=80' },
  { group: 'Texture & Style',     slug: 'boucles',        label: 'Boucles',        photo: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=500&q=80' },
  { group: 'Texture & Style',     slug: 'lissage',        label: 'Lissage',        photo: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=500&q=80' },
  { group: 'Texture & Style',     slug: 'dreads',         label: 'Dreads & Locks', photo: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=500&q=80' },
  { group: 'Occasion',            slug: 'mariage',        label: 'Mariée / Marié', photo: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=500&q=80' },
  { group: 'Occasion',            slug: 'coiffure-soiree',label: 'Soirée',         photo: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=500&q=80' },
];

function getOptions(g: Gender): StyleOption[] {
  if (g === 'femme')       return FEMME;
  if (g === 'homme')       return HOMME;
  return NON_BINAIRE; // non-binaire + null
}

function getGroups(options: StyleOption[]): string[] {
  return [...new Set(options.map((o) => o.group))];
}

// ─────────────────────────────────────────────────────────
// SOUS-COMPOSANTS
// ─────────────────────────────────────────────────────────

function ProgressDots({ step }: { step: Step }) {
  const steps: Step[] = ['genre', 'styles', 'done'];
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((s) => (
        <div
          key={s}
          className={`rounded-full transition-all duration-300 ${
            s === step
              ? 'w-5 h-1.5 bg-neutral-900'
              : steps.indexOf(s) < steps.indexOf(step)
              ? 'w-1.5 h-1.5 bg-neutral-400'
              : 'w-1.5 h-1.5 bg-neutral-200'
          }`}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────

export default function ClientOnboardingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [step,     setStep]     = useState<Step>('genre');
  const [gender,   setGender]   = useState<Gender>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [visible,  setVisible]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/connexion'); return; }
    if (user.role === 'hairdresser' || user.role === 'salon_owner') router.replace('/dashboard');
  }, [user, isLoading, router]);

  function fade(fn: () => void) {
    setVisible(false);
    setTimeout(() => { fn(); setVisible(true); }, 180);
  }

  function pickGender(g: Gender) {
    setGender(g);
    setSelected(new Set());
    fade(() => setStep('styles'));
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
    const prefs = { gender, interests: slugs };

    localStorage.setItem('chair_preferences', JSON.stringify(prefs));

    try {
      const token = localStorage.getItem('chair_token');
      await fetch(`${API}/preferences`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ profile_type: gender, interests: slugs, goal: null }),
      });
    } catch { /* silently ignore */ }

    setSaving(false);
    fade(() => setStep('done'));
  }

  function skip() {
    if (!localStorage.getItem('chair_preferences')) {
      localStorage.setItem('chair_preferences', JSON.stringify({ gender: null, interests: [] }));
    }
    router.push('/');
  }

  if (isLoading || !user) return null;

  const firstName = user.name.split(' ')[0];
  const options   = getOptions(gender);
  const groups    = getGroups(options);

  return (
    <div className="min-h-[100svh] bg-white flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-2">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-[15px] font-bold tracking-[0.14em] uppercase text-neutral-900">
            CHAIR
          </Link>
          {step !== 'genre' && step !== 'done' && (
            <button
              onClick={() => fade(() => setStep('genre'))}
              className="text-neutral-400 hover:text-neutral-900 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-4">
          <ProgressDots step={step} />
          {step !== 'done' && (
            <button onClick={skip} className="text-[12px] text-neutral-400 hover:text-neutral-700 transition-colors">
              Passer
            </button>
          )}
        </div>
      </div>

      {/* ── Contenu animé ── */}
      <div className={`flex-1 flex flex-col transition-opacity duration-[180ms] ${visible ? 'opacity-100' : 'opacity-0'}`}>

        {/* ════════════════════════════════════════
            ÉTAPE 1 — Genre
        ════════════════════════════════════════ */}
        {step === 'genre' && (
          <div className="flex-1 flex flex-col px-4 pb-6 gap-5">
            <div className="pt-2">
              <p className="text-[11px] font-semibold tracking-[0.24em] uppercase text-neutral-400 mb-1.5">
                Bienvenue, {firstName} 👋
              </p>
              <h1 className="text-[30px] font-bold text-neutral-900 leading-[1.08] tracking-tight">
                Tu cherches<br />quelle inspiration ?
              </h1>
            </div>

            {/* 2 grandes cartes */}
            <div className="grid grid-cols-2 gap-3 h-[42svh]">
              {([
                { g: 'femme' as Gender,  label: 'Coiffure\nFemme',  sub: 'Couleurs, coupes, textures…', photo: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=600&q=80' },
                { g: 'homme' as Gender,  label: 'Coiffure\nHomme',  sub: 'Barber, dégradés, styles…',   photo: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&q=80' },
              ]).map(({ g, label, photo }) => (
                <button
                  key={g as string}
                  onClick={() => pickGender(g)}
                  className="relative overflow-hidden rounded-2xl group active:scale-[0.97] transition-transform duration-150"
                >
                  <Image src={photo} alt={label} fill priority sizes="50vw"
                    className="object-cover object-top group-hover:scale-[1.04] transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                    <p className="text-[16px] font-bold text-white leading-tight whitespace-pre-line">{label}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* 2 options secondaires */}
            <div className="grid grid-cols-2 gap-2">
              {([
                { g: 'non-binaire' as Gender, label: 'Non-binaire',           emoji: '⊛' },
                { g: null,                    label: 'Je préfère ne pas dire', emoji: '·' },
              ]).map(({ g, label, emoji }) => (
                <button
                  key={label}
                  onClick={() => pickGender(g)}
                  className="flex items-center justify-center gap-2 border border-neutral-200 rounded-xl py-3.5 px-3 text-[13px] font-medium text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 active:scale-[0.97] transition-all duration-150"
                >
                  <span className="text-[15px]">{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            ÉTAPE 2 — Sélection des styles
        ════════════════════════════════════════ */}
        {step === 'styles' && (
          <div className="flex-1 flex flex-col relative">
            {/* Titre */}
            <div className="px-4 pt-2 pb-4">
              <h1 className="text-[28px] font-bold text-neutral-900 leading-[1.08] tracking-tight">
                Tape ce qui<br />t&apos;inspire.
              </h1>
              <p className="text-[13px] text-neutral-400 mt-1">
                {selected.size === 0
                  ? 'Sélectionne au moins un style'
                  : `${selected.size} style${selected.size > 1 ? 's' : ''} sélectionné${selected.size > 1 ? 's' : ''}`}
              </p>
            </div>

            {/* Grille scrollable par groupes */}
            <div className="flex-1 overflow-y-auto px-4 pb-32">
              {groups.map((group) => {
                const groupOptions = options.filter((o) => o.group === group);
                return (
                  <div key={group} className="mb-6">
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-neutral-400 mb-3">
                      {group}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {groupOptions.map((opt, i) => {
                        const active = selected.has(opt.slug);
                        return (
                          <button
                            key={`${group}-${i}`}
                            onClick={() => toggleSlug(opt.slug)}
                            className={`relative aspect-square overflow-hidden rounded-xl active:scale-[0.96] transition-transform duration-150 ${
                              active ? 'ring-2 ring-neutral-900 ring-offset-1' : ''
                            }`}
                          >
                            <Image
                              src={opt.photo}
                              alt={opt.label}
                              fill
                              sizes="33vw"
                              className={`object-cover transition-all duration-300 ${active ? 'brightness-[0.6] scale-105' : 'group-hover:scale-[1.03]'}`}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />

                            {/* Check */}
                            <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
                              active ? 'bg-white scale-100 opacity-100' : 'bg-black/25 border border-white/30 scale-90 opacity-60'
                            }`}>
                              {active && <Check size={10} className="text-neutral-900" strokeWidth={3} />}
                            </div>

                            {/* Label */}
                            <p className="absolute bottom-1.5 left-2 right-2 text-[10px] font-semibold text-white leading-tight">
                              {opt.label}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA sticky */}
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-4 bg-gradient-to-t from-white via-white/95 to-transparent">
              <button
                onClick={finish}
                disabled={saving}
                className={`w-full flex items-center justify-center gap-2 font-semibold py-4 rounded-2xl text-[15px] transition-all duration-200 disabled:opacity-60 ${
                  selected.size > 0
                    ? 'bg-neutral-900 text-white hover:bg-neutral-700'
                    : 'bg-neutral-100 text-neutral-400'
                }`}
              >
                {saving
                  ? 'Un instant…'
                  : selected.size > 0
                  ? 'Voir mon feed →'
                  : 'Continuer sans préférence'}
                {!saving && selected.size > 0 && <ArrowRight size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            DONE
        ════════════════════════════════════════ */}
        {step === 'done' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 pb-12 gap-0">
            {/* Cercle animé */}
            <div className="w-20 h-20 rounded-full bg-neutral-900 flex items-center justify-center mb-8 animate-[scale-in_0.3s_ease-out]">
              <Check size={32} className="text-white" strokeWidth={2.5} />
            </div>

            <h1 className="text-[32px] font-bold text-neutral-900 leading-tight tracking-tight mb-3">
              Ton feed est<br />sur mesure. ✨
            </h1>
            <p className="text-[14px] text-neutral-400 leading-relaxed mb-10 max-w-[270px]">
              CHAIR sélectionne les coiffeurs et les réalisations qui correspondent exactement à ce que tu aimes.
            </p>

            {selected.size > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5 mb-8 max-w-[300px]">
                {[...selected].slice(0, 6).map((slug) => {
                  const opt = [...FEMME, ...HOMME, ...NON_BINAIRE].find((o) => o.slug === slug);
                  return opt ? (
                    <span key={slug} className="text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-full">
                      {opt.label}
                    </span>
                  ) : null;
                })}
              </div>
            )}

            <button
              onClick={() => router.push('/')}
              className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white font-bold py-4 rounded-2xl text-[15px] hover:bg-neutral-700 transition-colors"
            >
              Découvrir CHAIR
              <ArrowRight size={16} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
