'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api, specialtyProgress, streak as streakApi } from '@/lib/api';
import {
  type ApiHairdresserProfile, type ApiStats,
  type ApiChairBadge, type ApiChairLevel, type ApiSpecialtyProgress, type ApiStreak,
} from '@/lib/types';
import {
  Check, Lock, ChevronDown, ArrowLeft, Trophy, Sparkles,
  Scissors, TrendingUp, Award, ArrowRight,
} from 'lucide-react';
import { BadgeMedallion, BadgeExplainSheet, METIER_LEVEL_ICONS } from '@/components/ui/ChairBadges';

// ── Niveau CHAIR global — couleurs héritées du système existant ──────────────

const LEVEL_HERO: Record<string, string> = {
  neutral: 'bg-neutral-900',
  bronze:  'bg-gradient-to-br from-amber-500 to-amber-600',
  silver:  'bg-gradient-to-br from-slate-400 to-slate-500',
  gold:    'bg-gradient-to-br from-yellow-400 to-amber-500',
  purple:  'bg-gradient-to-br from-purple-500 to-purple-700',
  diamond: 'bg-gradient-to-br from-neutral-800 to-neutral-900',
};

const SPECIALTY_LEVEL_PILL: Record<string, string> = {
  neutral: 'bg-neutral-100 text-neutral-500',
  bronze:  'bg-amber-100 text-amber-700',
  silver:  'bg-neutral-200 text-neutral-700',
  gold:    'bg-yellow-100 text-yellow-700',
  purple:  'bg-purple-100 text-purple-700',
  diamond: 'bg-neutral-900 text-white',
};

// ── Barres de progression pour les badges carrière à seuil numérique ────────
// Les badges exceptionnels/ancienneté (rang, temps) n'ont pas de barre — leur
// critère n'est pas un simple compteur à incrémenter.

function careerTargets(stats: ApiStats | null, streak: ApiStreak | null): Record<string, { current: number; target: number }> {
  const posts     = stats?.posts_count ?? 0;
  const followers = stats?.followers_count ?? 0;
  const longest   = streak?.longest_streak ?? 0;

  return {
    portfolio_10:   { current: Math.min(posts, 10),      target: 10 },
    portfolio_50:   { current: Math.min(posts, 50),      target: 50 },
    portfolio_300:  { current: Math.min(posts, 300),     target: 300 },
    follower_100:   { current: Math.min(followers, 100),   target: 100 },
    follower_500:   { current: Math.min(followers, 500),   target: 500 },
    follower_2500:  { current: Math.min(followers, 2500),  target: 2500 },
    follower_15000: { current: Math.min(followers, 15000), target: 15000 },
    streak_7:       { current: Math.min(longest, 7),   target: 7 },
    streak_30:      { current: Math.min(longest, 30),  target: 30 },
    streak_100:     { current: Math.min(longest, 100), target: 100 },
    streak_365:     { current: Math.min(longest, 365), target: 365 },
  };
}

// ── Section repliable générique ──────────────────────────────────────────────

function Section({
  title, icon: Icon, count, children, defaultOpen = true,
}: { title: string; icon: React.ElementType; count?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 w-full text-left mb-3 group">
        <Icon size={14} className="text-neutral-400" strokeWidth={1.5} />
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-500 group-hover:text-neutral-800 transition-colors">
          {title}
        </p>
        {count && <span className="text-[10px] font-bold text-neutral-300">{count}</span>}
        <ChevronDown size={14} className={`ml-auto text-neutral-300 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && children}
    </div>
  );
}

// ── Carte d'une spécialité (Expertise métier) ───────────────────────────────

function SpecialtyCard({ progress, onExplain }: { progress: ApiSpecialtyProgress; onExplain: () => void }) {
  const pill = SPECIALTY_LEVEL_PILL[progress.level_color] ?? SPECIALTY_LEVEL_PILL.neutral;
  const Icon = METIER_LEVEL_ICONS[progress.level] ?? Scissors;
  // Barre visuelle bornée au seuil "Référence locale" (500 pts) — au-delà,
  // la progression se joue sur le classement, plus sur un simple score.
  const pct = Math.min(100, Math.round((progress.score / 500) * 100));

  return (
    <button onClick={onExplain} className="w-full text-left bg-white border border-neutral-100 rounded-2xl p-4 hover:border-neutral-200 transition-colors">
      <div className="flex items-center gap-3 mb-2.5">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${pill}`}>
          <Icon size={16} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-neutral-900 truncate">{progress.specialty_name}</p>
          <span className={`inline-block text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full mt-0.5 ${pill}`}>
            {progress.level_name}
          </span>
        </div>
        <span className="text-xs font-bold text-neutral-400 flex-shrink-0">{progress.score} pts</span>
      </div>

      <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden mb-2.5">
        <div className={`h-full rounded-full ${progress.is_reference ? 'bg-neutral-900' : 'bg-neutral-400'}`} style={{ width: `${pct}%` }} />
      </div>

      {progress.next_step ? (
        <p className="text-[11px] text-neutral-500 leading-snug">
          Ajoutez <span className="font-bold text-neutral-800">{progress.next_step.missing} {progress.next_step.label}{progress.next_step.missing > 1 ? 's' : ''}</span> en {progress.specialty_name} pour progresser vers <span className="font-bold text-neutral-800">{progress.next_step.next_level_name}</span>.
        </p>
      ) : (
        <p className="text-[11px] text-neutral-400 leading-snug">Niveau maximum atteint pour cette spécialité.</p>
      )}
    </button>
  );
}

// ── Carte badge (carrière / exceptionnel) ───────────────────────────────────

function BadgeCard({ badge, unlocked, onExplain }: { badge: ApiChairBadge; unlocked: boolean; onExplain: () => void }) {
  const isDark = unlocked && badge.tier === 4;
  return (
    <button
      onClick={onExplain}
      className={`text-left rounded-2xl p-3.5 flex flex-col gap-2.5 transition-all ${
        unlocked
          ? isDark ? 'bg-neutral-900' : 'bg-white border border-neutral-100 hover:border-neutral-200'
          : 'bg-white border border-neutral-100 opacity-60 hover:opacity-90'
      }`}
    >
      <div className="flex items-start justify-between">
        <BadgeMedallion code={badge.code} tier={badge.tier} size={40} locked={!unlocked} />
        {unlocked ? (
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
            <Check size={10} className="text-white" strokeWidth={3} />
          </div>
        ) : (
          <Lock size={12} className="text-neutral-300 mt-1" />
        )}
      </div>
      <div>
        <p className={`text-[12px] font-bold leading-tight ${isDark ? 'text-white' : unlocked ? 'text-neutral-900' : 'text-neutral-400'}`}>{badge.name}</p>
        <p className={`text-[10px] mt-0.5 leading-snug ${isDark ? 'text-white/50' : 'text-neutral-300'}`}>{badge.desc}</p>
      </div>
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BadgesPage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);

  const [stats,          setStats]          = useState<ApiStats | null>(null);
  const [streak,         setStreak]         = useState<ApiStreak | null>(null);
  const [chairBadgesAll, setChairBadgesAll] = useState<ApiChairBadge[]>([]);
  const [chairLevel,     setChairLevel]     = useState<ApiChairLevel | null>(null);
  const [specialties,    setSpecialties]    = useState<ApiSpecialtyProgress[]>([]);
  const [dataLoading,    setDataLoading]    = useState(true);
  const [selectedBadge,  setSelectedBadge]  = useState<ApiChairBadge | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.allSettled([
      api.get<ApiHairdresserProfile & { chair_badges_all?: ApiChairBadge[]; chair_level?: ApiChairLevel }>('/profile'),
      api.get<ApiStats>('/stats'),
      streakApi.get(),
      specialtyProgress.mine(),
    ]).then(([prof, st, sk, sp]) => {
      if (prof.status === 'fulfilled') {
        if (prof.value.chair_badges_all) setChairBadgesAll(prof.value.chair_badges_all);
        if (prof.value.chair_level)      setChairLevel(prof.value.chair_level);
      }
      if (st.status === 'fulfilled') setStats(st.value);
      if (sk.status === 'fulfilled') setStreak(sk.value as ApiStreak);
      if (sp.status === 'fulfilled') setSpecialties(sp.value.specialties);
    }).finally(() => setDataLoading(false));
  }, [user]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  const unlockedCodes  = new Set(chairBadgesAll.map((b) => b.code));
  const careerBadges       = chairBadgesAll.filter((b) => b.family === 'carriere');
  const exceptionalBadges  = chairBadgesAll.filter((b) => b.family === 'exceptionnel');
  const careerUnlocked     = careerBadges.filter((b) => unlockedCodes.has(b.code) && b.pts > 0 && b.tier > 1);
  const careerLocked       = careerBadges.filter((b) => !unlockedCodes.has(b.code));
  const exceptionalUnlocked = exceptionalBadges.filter((b) => unlockedCodes.has(b.code));
  const exceptionalLocked   = exceptionalBadges.filter((b) => !unlockedCodes.has(b.code));

  const targets = careerTargets(stats, streak);

  // Prochain objectif le plus proche, toutes catégories carrière confondues
  // (les leviers métier ont déjà leur propre CTA dans "Expertise métier").
  const nextCareerTarget = careerLocked
    .map((b) => {
      const t = targets[b.code];
      if (!t) return null;
      const pct = Math.round((t.current / t.target) * 100);
      return { badge: b, current: t.current, target: t.target, pct };
    })
    .filter((x): x is { badge: ApiChairBadge; current: number; target: number; pct: number } => x !== null && x.pct > 0 && x.pct < 100)
    .sort((a, b) => b.pct - a.pct)[0];

  const levelColor = chairLevel?.color ?? 'neutral';
  const heroBg = LEVEL_HERO[levelColor] ?? LEVEL_HERO.neutral;

  return (
    <div className="min-h-screen bg-neutral-50">

      <div className="sticky top-0 z-20 bg-white border-b border-neutral-100 px-4 h-14 flex items-center md:hidden">
        <Link href="/pro" className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors mr-auto">
          <ArrowLeft size={16} />
          <span className="text-xs font-medium">Tableau de bord</span>
        </Link>
        <span className="text-sm font-bold tracking-tight text-neutral-900 absolute left-1/2 -translate-x-1/2">Badges</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-5 md:pt-10 pb-28 md:pb-10 space-y-7">

        <div className="hidden md:flex items-center gap-3">
          <Link href="/pro" className="flex items-center gap-1.5 text-neutral-400 hover:text-neutral-700 transition-colors">
            <ArrowLeft size={14} /><span className="text-xs">Retour</span>
          </Link>
          <span className="text-neutral-200">/</span>
          <h1 className="text-lg font-bold text-neutral-900">Badges CHAIR</h1>
        </div>

        {/* ── MA PROGRESSION ── */}
        {dataLoading ? (
          <div className="h-40 bg-neutral-200 rounded-2xl animate-pulse" />
        ) : chairLevel ? (
          <div className={`rounded-2xl p-6 ${heroBg}`}>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/50 mb-1">Niveau CHAIR</p>
            <h2 className="text-4xl font-black text-white tracking-tight leading-none mb-2">{chairLevel.name}</h2>
            <p className="text-sm font-semibold text-white/70 mb-4">{chairLevel.points} pts</p>
            {chairLevel.next ? (
              <div>
                <div className="h-2.5 bg-white/15 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${chairLevel.progress}%` }} />
                </div>
                <p className="text-[11px] font-semibold text-white/50">
                  {chairLevel.next.min - chairLevel.points} pts pour atteindre <span className="text-white/80">{chairLevel.next.name}</span>
                </p>
              </div>
            ) : (
              <p className="text-sm font-bold text-white/60">Niveau maximum — vous êtes une légende</p>
            )}
          </div>
        ) : null}

        {/* ── EXPERTISE MÉTIER ── */}
        {!dataLoading && specialties.length > 0 && (
          <Section title="Expertise métier" icon={Scissors}>
            <div className="space-y-2.5">
              {specialties.map((s) => (
                <SpecialtyCard
                  key={s.specialty_id}
                  progress={s}
                  onExplain={() => {}}
                />
              ))}
            </div>
            <p className="text-[11px] text-neutral-400 mt-3 leading-relaxed">
              Spécialiste → Expert → Référence locale (top 1% de votre ville) → Référence régionale, le palier ultime — combine score élevé, position régionale, activité récente et plusieurs avis distincts.
            </p>
          </Section>
        )}

        {/* ── PROCHAIN BADGE À DÉBLOQUER ── */}
        {!dataLoading && nextCareerTarget && (
          <div className="bg-neutral-900 rounded-2xl p-4 flex items-center gap-3.5">
            <BadgeMedallion code={nextCareerTarget.badge.code} tier={nextCareerTarget.badge.tier} size={44} locked />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/40 mb-0.5">Prochain badge</p>
              <p className="text-sm font-bold text-white truncate">{nextCareerTarget.badge.name}</p>
              <div className="h-1.5 bg-white/15 rounded-full overflow-hidden mt-1.5">
                <div className="h-full bg-white rounded-full" style={{ width: `${nextCareerTarget.pct}%` }} />
              </div>
            </div>
            <span className="text-[11px] font-bold text-white/60 flex-shrink-0">{nextCareerTarget.current}/{nextCareerTarget.target}</span>
          </div>
        )}

        {/* ── CARRIÈRE ── */}
        {!dataLoading && (
          <Section title="Carrière" icon={Trophy} count={`${careerUnlocked.length} débloqué${careerUnlocked.length > 1 ? 's' : ''}`}>
            {careerUnlocked.length > 0 && (
              <div className="grid grid-cols-3 gap-2.5 mb-3">
                {careerUnlocked.map((b) => (
                  <BadgeCard key={b.code} badge={b} unlocked onExplain={() => setSelectedBadge(b)} />
                ))}
              </div>
            )}
            {careerLocked.length > 0 && (
              <details className="group">
                <summary className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-400 cursor-pointer list-none">
                  <Lock size={11} />À débloquer ({careerLocked.length})
                  <ChevronDown size={12} className="group-open:rotate-180 transition-transform" />
                </summary>
                <div className="grid grid-cols-3 gap-2.5 mt-3">
                  {careerLocked.map((b) => (
                    <BadgeCard key={b.code} badge={b} unlocked={false} onExplain={() => setSelectedBadge(b)} />
                  ))}
                </div>
              </details>
            )}
          </Section>
        )}

        {/* ── BADGES EXCEPTIONNELS ── */}
        {!dataLoading && (
          <Section title="Badges exceptionnels" icon={Sparkles} count={`${exceptionalUnlocked.length}/${exceptionalBadges.length}`}>
            <div className="grid grid-cols-3 gap-2.5">
              {[...exceptionalUnlocked, ...exceptionalLocked].map((b) => (
                <BadgeCard key={b.code} badge={b} unlocked={unlockedCodes.has(b.code)} onExplain={() => setSelectedBadge(b)} />
              ))}
            </div>
            <p className="text-[11px] text-neutral-400 mt-3 leading-relaxed flex items-start gap-1.5">
              <TrendingUp size={12} className="flex-shrink-0 mt-0.5" />
              Ces badges restent difficiles par construction — certains sont verrouillés pour tout le monde tant que la communauté CHAIR n&apos;est pas assez grande pour qu&apos;un classement ait un sens.
            </p>
          </Section>
        )}

        {chairBadgesAll.length === 0 && !dataLoading && specialties.length === 0 && (
          <div className="bg-white rounded-2xl border border-neutral-100 px-5 py-10 text-center">
            <Award size={28} className="text-neutral-200 mx-auto mb-2" />
            <p className="text-sm font-semibold text-neutral-400">Aucun badge encore</p>
            <p className="text-[12px] text-neutral-300 mt-1">Complétez votre profil et publiez vos premières réalisations pour progresser.</p>
            <Link href="/pro/profil" className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold bg-neutral-900 text-white px-4 py-2.5 rounded-xl">
              Compléter mon profil <ArrowRight size={12} />
            </Link>
          </div>
        )}
      </div>

      <BadgeExplainSheet badge={selectedBadge} onClose={() => setSelectedBadge(null)} coiffeurName={user.name} />
    </div>
  );
}
