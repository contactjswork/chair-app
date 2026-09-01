'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useNewlyUnlockedBadges } from '@/hooks/useNewlyUnlockedBadges';
import { api, specialtyProgress, streak as streakApi } from '@/lib/api';
import {
  type ApiHairdresserProfile, type ApiChairBadge,
  type ApiSpecialtyProgress, type ApiStreak, type ApiNextBadge, type ApiRarity,
} from '@/lib/types';
import {
  Check, Lock, ChevronDown, ArrowLeft, Trophy, Sparkles,
  Scissors, TrendingUp, Award, ArrowRight, Flame, Gem,
} from 'lucide-react';
import { BadgeMedallion, BadgeExplainSheet, METIER_LEVEL_ICONS } from '@/components/ui/ChairBadges';
import BadgeUnlockModal from '@/components/ui/BadgeUnlockModal';

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

const RARITY_LABELS: Record<ApiRarity, string> = {
  commun: 'Commun', rare: 'Rare', epique: 'Épique', legendaire: 'Légendaire', ultime: 'Ultime',
};

// Ordre d'affichage des familles de badges — la collection ne doit jamais
// être une simple grille de 40 cartes identiques sans contexte (brief).
const CATEGORY_ORDER = [
  'demarrage', 'contenu', 'avis', 'visites', 'communauté', 'reseau',
  'streak', 'discipline', 'ancienneté', 'vérification', 'ambassadeur', 'spécial', 'exceptionnel',
];
const CATEGORY_LABELS: Record<string, string> = {
  demarrage: 'Démarrage', contenu: 'Réalisations', avis: 'Avis & clientèle', visites: 'Visites vérifiées',
  communauté: 'Abonnés', reseau: 'Partages', streak: 'Régularité', discipline: 'Discipline',
  ancienneté: 'Ancienneté', vérification: 'Certifications CHAIR', ambassadeur: 'Parrainage',
  spécial: 'Spécial', exceptionnel: 'Exceptionnels',
};

// ── Section repliable générique ──────────────────────────────────────────────

function Section({
  title, icon: Icon, count, children, defaultOpen = true,
}: { title: string; icon: React.ElementType; count?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button onClick={() => setOpen((v) => !v)} className="relative before:absolute before:-inset-y-[13px] before:inset-x-0 before:content-[''] flex items-center gap-2 w-full text-left mb-3 group">
        <Icon size={14} className="text-neutral-400" strokeWidth={1.5} />
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-500 group-hover:text-neutral-800 transition-colors">
          {title}
        </p>
        {count && <span className="text-[10px] font-bold text-neutral-500">{count}</span>}
        <ChevronDown size={14} className={`ml-auto text-neutral-300 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && children}
    </div>
  );
}

// ── Carte d'une spécialité (Expertise métier) ───────────────────────────────

function SpecialtyCard({ progress }: { progress: ApiSpecialtyProgress }) {
  const pill = SPECIALTY_LEVEL_PILL[progress.level_color] ?? SPECIALTY_LEVEL_PILL.neutral;
  const Icon = METIER_LEVEL_ICONS[progress.level] ?? Scissors;
  // Barre visuelle bornée au seuil "Référence locale" (500 pts) — au-delà,
  // la progression se joue sur le classement, plus sur un simple score.
  const pct = Math.min(100, Math.round((progress.score / 500) * 100));

  return (
    <div className="w-full text-left bg-white rounded-[22px] shadow-[0_4px_16px_-6px_rgba(10,10,10,0.1)] ring-1 ring-neutral-100 p-4">
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
      ) : progress.is_national_reference ? (
        <p className="text-[11px] text-neutral-400 leading-snug">Référence nationale — le palier ultime de cette spécialité.</p>
      ) : (
        <p className="text-[11px] text-neutral-400 leading-snug">Niveau maximum atteint pour cette spécialité.</p>
      )}
    </div>
  );
}

// ── Ligne de défi en cours (badge ou spécialité, unifiés côté backend) ─────

function ChallengeRow({ challenge, onExplain }: { challenge: ApiNextBadge; onExplain: () => void }) {
  if (challenge.type === 'specialty') {
    return (
      <button onClick={onExplain} className="w-full flex items-center gap-3 bg-white rounded-[20px] shadow-[0_3px_14px_-6px_rgba(10,10,10,0.1)] ring-1 ring-neutral-100 hover:shadow-[0_6px_18px_-6px_rgba(10,10,10,0.16)] p-3.5 text-left transition-all">
        <div className="w-9 h-9 rounded-2xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
          <Scissors size={15} className="text-neutral-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-neutral-900 truncate">{challenge.name}</p>
          <p className="text-[11px] text-neutral-400 leading-snug line-clamp-1">{challenge.label}</p>
        </div>
        <ArrowRight size={14} className="text-neutral-300 flex-shrink-0" />
      </button>
    );
  }

  return (
    <button onClick={onExplain} className="w-full flex items-center gap-3 bg-white rounded-[20px] shadow-[0_3px_14px_-6px_rgba(10,10,10,0.1)] ring-1 ring-neutral-100 hover:shadow-[0_6px_18px_-6px_rgba(10,10,10,0.16)] p-3.5 text-left transition-all">
      <BadgeMedallion code={challenge.code} tier={challenge.tier} size={36} locked />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-neutral-900 truncate">{challenge.name}</p>
        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden mt-1.5">
          <div className="h-full bg-neutral-900 rounded-full" style={{ width: `${challenge.pct}%` }} />
        </div>
      </div>
      <span className="text-[11px] font-bold text-neutral-400 flex-shrink-0">{challenge.current}/{challenge.target}</span>
    </button>
  );
}

// ── Carte badge (collection) ───────────────────────────────────────────────

function BadgeCard({ badge, onExplain }: { badge: ApiChairBadge; onExplain: () => void }) {
  const unlocked = !!badge.unlocked;
  const isDark = unlocked && badge.tier >= 4;
  return (
    <button
      onClick={onExplain}
      className={`text-left rounded-[20px] p-3.5 flex flex-col gap-2.5 transition-all shadow-[0_3px_14px_-6px_rgba(10,10,10,0.1)] ${
        unlocked
          ? isDark ? 'bg-neutral-900' : 'bg-white ring-1 ring-neutral-100 hover:shadow-[0_6px_18px_-6px_rgba(10,10,10,0.16)]'
          : 'bg-white ring-1 ring-neutral-100 opacity-60 hover:opacity-90'
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
        {unlocked && badge.unlocked_at ? (
          <p className={`text-[10px] mt-0.5 ${isDark ? 'text-white/40' : 'text-neutral-300'}`}>
            {new Date(badge.unlocked_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        ) : (
          <p className={`text-[10px] mt-0.5 leading-snug ${isDark ? 'text-white/50' : 'text-neutral-300'}`}>{badge.desc}</p>
        )}
      </div>
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BadgesPage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);

  const [streak,         setStreak]         = useState<ApiStreak | null>(null);
  const [chairBadgesAll, setChairBadgesAll] = useState<ApiChairBadge[]>([]);
  const [catalog,        setCatalog]        = useState<ApiChairBadge[]>([]);
  const [nextBadges,     setNextBadges]     = useState<ApiNextBadge[]>([]);
  const [specialties,    setSpecialties]    = useState<ApiSpecialtyProgress[]>([]);
  const [dataLoading,    setDataLoading]    = useState(true);
  const [selectedBadge,  setSelectedBadge]  = useState<ApiChairBadge | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.allSettled([
      api.get<ApiHairdresserProfile & {
        chair_badges_all?: ApiChairBadge[];
        chair_badges_catalog?: ApiChairBadge[];
        next_badges?: ApiNextBadge[];
      }>('/profile'),
      streakApi.get(),
      specialtyProgress.mine(),
    ]).then(([prof, sk, sp]) => {
      if (prof.status === 'fulfilled') {
        if (prof.value.chair_badges_all)     setChairBadgesAll(prof.value.chair_badges_all);
        if (prof.value.chair_badges_catalog) setCatalog(prof.value.chair_badges_catalog);
        if (prof.value.next_badges)          setNextBadges(prof.value.next_badges);
      }
      if (sk.status === 'fulfilled') setStreak(sk.value as ApiStreak);
      if (sp.status === 'fulfilled') setSpecialties(sp.value.specialties);
    }).finally(() => setDataLoading(false));
  }, [user]);

  const newlyUnlocked = useNewlyUnlockedBadges(chairBadgesAll, !dataLoading);
  const [celebrationDismissed, setCelebrationDismissed] = useState(false);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  const rarestOwned = [...chairBadgesAll].sort((a, b) => b.tier - a.tier)[0] ?? null;

  const byCategory = new Map<string, ApiChairBadge[]>();
  for (const badge of catalog) {
    const list = byCategory.get(badge.category) ?? [];
    list.push(badge);
    byCategory.set(badge.category, list);
  }
  const orderedCategories = CATEGORY_ORDER.filter((c) => byCategory.has(c));

  const dominant = nextBadges[0] ?? null;
  const challengeRest = nextBadges.slice(dominant ? 1 : 0, 5);

  // La spécialité la plus forte porte le héros — la même identité que la
  // home et le classement. Une seule échelle, plus de « Expert » ici contre
  // « Novice » là.
  const bestSpecialty = specialties[0] ?? null;
  const levelColor = bestSpecialty?.level_color ?? 'neutral';
  const heroBg = LEVEL_HERO[levelColor] ?? LEVEL_HERO.neutral;

  return (
    <div className="min-h-screen bg-neutral-50">

      <div className="sticky top-0 z-20 bg-white border-b border-neutral-100 px-4 h-14 flex items-center md:hidden">
        <Link href="/pro" className="relative before:absolute before:-inset-2.5 before:content-[''] flex items-center text-neutral-500 hover:text-neutral-900 transition-colors mr-auto p-1 -ml-1 rounded-lg">
          <ArrowLeft size={18} />
        </Link>
        <span className="text-sm font-bold tracking-tight text-neutral-900 absolute left-1/2 -translate-x-1/2">Badges</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-5 md:pt-10 pb-28 md:pb-10 space-y-7">

        <div className="hidden md:flex items-center gap-3">
          <Link href="/pro" className="flex items-center text-neutral-400 hover:text-neutral-700 transition-colors p-1 -ml-1 rounded-lg">
            <ArrowLeft size={16} />
          </Link>
          <span className="text-neutral-200">/</span>
          <h1 className="text-lg font-bold text-neutral-900">Badges CHAIR</h1>
        </div>

        {/* La règle du jeu, écrite une fois pour toutes — l'échelle unique. */}
        <p className="text-[12px] text-neutral-500 leading-relaxed">
          Chaque spécialité a son niveau : <span className="font-semibold text-neutral-700">Nouveau → Confirmé → Expert → Maître → Référence</span>.
          Vos passages vérifiés, vos avis et vos réalisations dans la spécialité le font monter — rien d&apos;autre.
        </p>

        {/* ── HERO PROGRESSION ── */}
        {dataLoading ? (
          <div className="h-40 bg-neutral-200 rounded-[28px] animate-pulse" />
        ) : bestSpecialty ? (
          <div className={`rounded-[28px] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_4px_-2px_rgba(10,10,10,0.25),0_16px_36px_-14px_rgba(10,10,10,0.35)] p-6 ${heroBg}`}>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/50 mb-1">
              {bestSpecialty.specialty_name ?? 'Votre spécialité'}
            </p>
            <h2 className="text-4xl font-black text-white tracking-tight leading-none mb-2">{bestSpecialty.level_name}</h2>
            <p className="text-sm font-semibold text-white/70 mb-4 tabular-nums">
              {bestSpecialty.score} pts
              {bestSpecialty.local_rank != null && bestSpecialty.local_total != null && (
                <> · {bestSpecialty.local_rank}{bestSpecialty.local_rank === 1 ? 'er' : 'e'} sur {bestSpecialty.local_total} dans votre ville</>
              )}
            </p>
            {bestSpecialty.next_step ? (
              <div className="mb-4">
                <div className="h-2.5 bg-white/15 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.max(4, Math.round((bestSpecialty.score / Math.max(1, bestSpecialty.next_step.next_level_min)) * 100)))}%` }}
                  />
                </div>
                <p className="text-[11px] font-semibold text-white/50">
                  Encore {bestSpecialty.next_step.missing} {bestSpecialty.next_step.label}
                  {bestSpecialty.next_step.missing > 1 ? 's' : ''} pour devenir{' '}
                  <span className="text-white/80">{bestSpecialty.next_step.next_level_name}</span>
                </p>
              </div>
            ) : (
              <p className="text-sm font-bold text-white/60 mb-4">Palier maximal atteint sur cette spécialité</p>
            )}
            <div className="flex items-center gap-4 pt-4 border-t border-white/10">
              <div className="flex items-center gap-1.5">
                <Flame size={13} className="text-white/40" />
                <span className="text-[11px] font-semibold text-white/60">{streak?.current_streak ?? 0}j actifs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Trophy size={13} className="text-white/40" />
                <span className="text-[11px] font-semibold text-white/60">{chairBadgesAll.length} badge{chairBadgesAll.length > 1 ? 's' : ''}</span>
              </div>
              {rarestOwned && (
                <div className="flex items-center gap-1.5">
                  <Gem size={13} className="text-white/40" />
                  <span className="text-[11px] font-semibold text-white/60">{RARITY_LABELS[rarestOwned.rarity]}</span>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* ── PROCHAIN BADGE — carte dominante ── */}
        {!dataLoading && dominant && (
          dominant.type === 'badge' ? (
            <div className="bg-neutral-900 bg-[radial-gradient(120%_100%_at_50%_0%,#1f1f21_0%,#0a0a0a_62%)] rounded-[22px] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_2px_4px_-2px_rgba(10,10,10,0.4),0_14px_32px_-16px_rgba(10,10,10,0.5)] p-4 flex items-center gap-3.5">
              <BadgeMedallion code={dominant.code} tier={dominant.tier} size={44} locked />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/40 mb-0.5">Prochain badge</p>
                <p className="text-sm font-bold text-white truncate">{dominant.name}</p>
                <div className="h-1.5 bg-white/15 rounded-full overflow-hidden mt-1.5">
                  <div className="h-full bg-white rounded-full" style={{ width: `${dominant.pct}%` }} />
                </div>
              </div>
              <span className="text-[11px] font-bold text-white/60 flex-shrink-0">{dominant.current}/{dominant.target}</span>
            </div>
          ) : (
            <div className="bg-neutral-900 bg-[radial-gradient(120%_100%_at_50%_0%,#1f1f21_0%,#0a0a0a_62%)] rounded-[22px] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_2px_4px_-2px_rgba(10,10,10,0.4),0_14px_32px_-16px_rgba(10,10,10,0.5)] p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <Scissors size={18} className="text-white/70" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/40 mb-0.5">Prochain objectif</p>
                <p className="text-[13px] font-semibold text-white leading-snug">{dominant.label}</p>
              </div>
            </div>
          )
        )}

        {/* ── DÉFIS EN COURS ── */}
        {!dataLoading && challengeRest.length > 0 && (
          <Section title="Défis en cours" icon={TrendingUp}>
            <div className="space-y-2">
              {challengeRest.map((c) => (
                <ChallengeRow
                  key={c.type === 'badge' ? c.code : `sp-${c.specialty_id}`}
                  challenge={c}
                  onExplain={() => {
                    if (c.type === 'badge') {
                      const full = catalog.find((b) => b.code === c.code);
                      if (full) setSelectedBadge(full);
                    }
                  }}
                />
              ))}
            </div>
          </Section>
        )}

        {/* ── EXPERTISE MÉTIER ── */}
        {!dataLoading && specialties.length > 0 && (
          <Section title="Expertise métier" icon={Scissors}>
            <div className="space-y-2.5">
              {specialties.map((s) => (
                <SpecialtyCard key={s.specialty_id} progress={s} />
              ))}
            </div>
            <p className="text-[11px] text-neutral-400 mt-3 leading-relaxed">
              Spécialiste → Expert → Référence locale → régionale → nationale. Chaque spécialité progresse selon ses propres avis, visites et réalisations.
            </p>
          </Section>
        )}

        {/* ── COLLECTION — organisée par famille ── */}
        {!dataLoading && orderedCategories.map((cat) => {
          const badges = byCategory.get(cat) ?? [];
          const unlockedCount = badges.filter((b) => b.unlocked).length;
          return (
            <Section
              key={cat}
              title={CATEGORY_LABELS[cat] ?? cat}
              icon={cat === 'exceptionnel' ? Sparkles : Award}
              count={`${unlockedCount}/${badges.length}`}
              defaultOpen={cat === 'demarrage' || cat === 'exceptionnel'}
            >
              <div className="grid grid-cols-3 gap-2.5">
                {[...badges].sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || a.tier - b.tier).map((b) => (
                  <BadgeCard key={b.code} badge={b} onExplain={() => setSelectedBadge(b)} />
                ))}
              </div>
            </Section>
          );
        })}

        {chairBadgesAll.length === 0 && !dataLoading && specialties.length === 0 && (
          <div className="bg-white rounded-[24px] shadow-[0_4px_16px_-6px_rgba(10,10,10,0.1)] ring-1 ring-neutral-100 px-5 py-10 text-center">
            <Award size={28} className="text-neutral-200 mx-auto mb-2" />
            <p className="text-sm font-semibold text-neutral-400">Aucun badge encore</p>
            <p className="text-[12px] text-neutral-500 mt-1">Complétez votre profil et publiez vos premières réalisations pour progresser.</p>
            <Link href="/pro/profil" className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold bg-neutral-900 text-white px-4 py-2.5 rounded-xl">
              Compléter mon profil <ArrowRight size={12} />
            </Link>
          </div>
        )}
      </div>

      <BadgeExplainSheet badge={selectedBadge} onClose={() => setSelectedBadge(null)} coiffeurName={user.name} />
      {!celebrationDismissed && newlyUnlocked.length > 0 && (
        <BadgeUnlockModal badges={newlyUnlocked} onClose={() => setCelebrationDismissed(true)} />
      )}
    </div>
  );
}
