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
  Scissors, TrendingUp, Award, ArrowRight, Flame, Gem, Share2,
} from 'lucide-react';
import { BadgeMedallion, BadgeExplainSheet, METIER_LEVEL_ICONS } from '@/components/ui/ChairBadges';
import BadgeUnlockModal from '@/components/ui/BadgeUnlockModal';
import StoryShareSheet from '@/components/pro/StoryShareSheet';
import { genererStoryReussite } from '@/lib/storyImage';

/**
 * Progression — refonte UX complète (01/09/2026, « on comprend vraiment rien »).
 *
 * L'ancienne page empilait quatre concepts qui se répétaient : un héros, un
 * « prochain badge », des « défis », puis une section « expertise métier »
 * qui redisait le héros, puis TREIZE sections repliables de badges. Trois
 * zones désormais, dans l'ordre où un coiffeur se pose les questions :
 *
 *  1. MON NIVEAU — l'échelle unique, DESSINÉE (les 5 paliers en frise, on
 *     voit où on est et ce qui reste), une seule action suivante, et les
 *     autres spécialités en lignes compactes sous le héros.
 *  2. MES DÉFIS — les badges en cours de progression, avec leurs barres.
 *  3. MES TROPHÉES — les badges obtenus d'abord ; le reste du catalogue
 *     derrière un seul bouton, pas treize accordéons.
 */

// ── Frise des 5 paliers — LA pièce pédagogique de la page ────────────────────

const PALIERS = [
  { name: 'Nouveau',   min: 0 },
  { name: 'Confirmé',  min: 60 },
  { name: 'Expert',    min: 250 },
  { name: 'Maître',    min: 500 },
  { name: 'Référence', min: 650 },
];

function LevelTrack({ levelIndex }: { levelIndex: number }) {
  return (
    <div>
      <div className="flex items-center">
        {PALIERS.map((p, i) => (
          <div key={p.name} className="flex items-center flex-1 last:flex-none">
            <div
              className={`rounded-full flex-shrink-0 transition-all ${
                i < levelIndex
                  ? 'w-2.5 h-2.5 bg-white/70'
                  : i === levelIndex
                    ? 'w-3.5 h-3.5 bg-white ring-4 ring-white/20'
                    : 'w-2.5 h-2.5 bg-white/20'
              }`}
            />
            {i < PALIERS.length - 1 && (
              <div className={`flex-1 h-px mx-1 ${i < levelIndex ? 'bg-white/50' : 'bg-white/15'}`} />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2">
        {PALIERS.map((p, i) => (
          <span
            key={p.name}
            className={`text-[9px] font-bold uppercase tracking-wide ${
              i === levelIndex ? 'text-white' : i < levelIndex ? 'text-white/50' : 'text-white/25'
            } ${i === 0 ? 'text-left' : i === PALIERS.length - 1 ? 'text-right' : 'text-center'}`}
            style={{ width: '20%' }}
          >
            {p.name}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Constantes visuelles ─────────────────────────────────────────────────────

const LEVEL_HERO: Record<string, string> = {
  neutral: 'bg-neutral-900',
  bronze:  'bg-gradient-to-br from-amber-500 to-amber-600',
  gold:    'bg-gradient-to-br from-yellow-400 to-amber-500',
  purple:  'bg-gradient-to-br from-purple-500 to-purple-700',
  diamond: 'bg-gradient-to-br from-neutral-800 to-neutral-900',
};

const SPECIALTY_LEVEL_PILL: Record<string, string> = {
  neutral: 'bg-neutral-100 text-neutral-500',
  bronze:  'bg-amber-100 text-amber-700',
  gold:    'bg-yellow-100 text-yellow-700',
  purple:  'bg-purple-100 text-purple-700',
  diamond: 'bg-neutral-900 text-white',
};

const RARITY_LABELS: Record<ApiRarity, string> = {
  commun: 'Commun', rare: 'Rare', epique: 'Épique', legendaire: 'Légendaire', ultime: 'Ultime',
};

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

// ── Ligne compacte d'une autre spécialité ────────────────────────────────────

function SpecialtyRow({ progress }: { progress: ApiSpecialtyProgress }) {
  const pill = SPECIALTY_LEVEL_PILL[progress.level_color] ?? SPECIALTY_LEVEL_PILL.neutral;
  const Icon = METIER_LEVEL_ICONS[progress.level] ?? Scissors;

  // Progression vers le PROCHAIN palier (pas vers un plafond lointain) :
  // la barre repart à zéro à chaque palier franchi, comme dans le héros.
  const current = PALIERS[Math.min(progress.level, PALIERS.length - 1)];
  const next = PALIERS[progress.level + 1] ?? null;
  const pct = next
    ? Math.min(100, Math.max(4, Math.round(((progress.score - current.min) / Math.max(1, next.min - current.min)) * 100)))
    : 100;

  return (
    <div className="bg-white rounded-[20px] shadow-[0_3px_14px_-6px_rgba(10,10,10,0.1)] ring-1 ring-neutral-100 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${pill}`}>
          <Icon size={16} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-neutral-900 truncate">{progress.specialty_name}</p>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            <span className="font-semibold text-neutral-600">{progress.level_name}</span>
            {' · '}{progress.score} pts
            {progress.local_rank != null && progress.local_total != null && (
              <> · {progress.local_rank}{progress.local_rank === 1 ? 'ᵉʳ' : 'ᵉ'} sur {progress.local_total}</>
            )}
          </p>
        </div>
        {next && (
          <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-wide flex-shrink-0">{next.name}</span>
        )}
      </div>
      <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden mt-3">
        <div className="h-full bg-neutral-900 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      {progress.next_step && (
        <p className="text-[11px] text-neutral-500 leading-snug mt-2">
          Encore <span className="font-bold text-neutral-800">{progress.next_step.missing} {progress.next_step.label}{progress.next_step.missing > 1 ? 's' : ''}</span> pour devenir {progress.next_step.next_level_name}.
        </p>
      )}
    </div>
  );
}

// ── Ligne de défi (badge en cours) ───────────────────────────────────────────

function ChallengeRow({ challenge, onExplain }: { challenge: ApiNextBadge; onExplain: () => void }) {
  if (challenge.type !== 'badge') return null;
  return (
    <button onClick={onExplain} className="w-full flex items-center gap-3 bg-white rounded-[20px] shadow-[0_3px_14px_-6px_rgba(10,10,10,0.1)] ring-1 ring-neutral-100 hover:shadow-[0_6px_18px_-6px_rgba(10,10,10,0.16)] p-3.5 text-left transition-all">
      <BadgeMedallion code={challenge.code} tier={challenge.tier} size={36} locked />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-neutral-900 truncate">{challenge.name}</p>
        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden mt-1.5">
          <div className="h-full bg-neutral-900 rounded-full" style={{ width: `${challenge.pct}%` }} />
        </div>
      </div>
      <span className="text-[11px] font-bold text-neutral-400 flex-shrink-0 tabular-nums">{challenge.current}/{challenge.target}</span>
    </button>
  );
}

// ── Carte badge ──────────────────────────────────────────────────────────────

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
  const [catalogOuvert,  setCatalogOuvert]  = useState(false);
  // « Partage ta réussite » — story de montée de palier (levier viral entre coiffeurs).
  const [reussiteOpen,   setReussiteOpen]   = useState(false);

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

  // Défis : uniquement les badges avec une vraie barre de progression — le
  // « prochain objectif » de spécialité vit déjà dans le héros, pas deux fois.
  const defis = nextBadges.filter((c) => c.type === 'badge').slice(0, 4);

  // Trophées : obtenus (récents d'abord) / verrouillés (par famille).
  // Source = catalogue (drapeau unlocked posé) — chair_badges_all ne porte
  // pas ce drapeau et rendrait tout verrouillé.
  const obtenus = catalog
    .filter((b) => b.unlocked)
    .sort((a, b) => (b.unlocked_at ?? '').localeCompare(a.unlocked_at ?? ''));
  const verrouilles = catalog.filter((b) => !b.unlocked);
  const verrouillesParFamille = CATEGORY_ORDER
    .map((cat) => ({ cat, badges: verrouilles.filter((b) => b.category === cat) }))
    .filter((g) => g.badges.length > 0);

  const bestSpecialty = specialties[0] ?? null;
  const autresSpecialties = specialties.slice(1);
  const levelColor = bestSpecialty?.level_color ?? 'neutral';
  const heroBg = LEVEL_HERO[levelColor] ?? LEVEL_HERO.neutral;

  // Barre du héros : progression vers le PROCHAIN palier, relative au palier
  // courant (elle repart à zéro à chaque palier franchi — sinon un Confirmé
  // fraîchement promu verrait une barre déjà pleine aux 3/4).
  const palierCourant = bestSpecialty ? PALIERS[Math.min(bestSpecialty.level, PALIERS.length - 1)] : null;
  const palierSuivant = bestSpecialty ? (PALIERS[bestSpecialty.level + 1] ?? null) : null;
  const heroPct = bestSpecialty && palierCourant && palierSuivant
    ? Math.min(100, Math.max(4, Math.round(((bestSpecialty.score - palierCourant.min) / Math.max(1, palierSuivant.min - palierCourant.min)) * 100)))
    : 100;

  return (
    <div className="min-h-screen bg-neutral-50">

      <div className="sticky top-0 z-20 bg-white border-b border-neutral-100 px-4 h-14 flex items-center md:hidden">
        <Link href="/pro" className="relative before:absolute before:-inset-2.5 before:content-[''] flex items-center text-neutral-500 hover:text-neutral-900 transition-colors mr-auto p-1 -ml-1 rounded-lg">
          <ArrowLeft size={18} />
        </Link>
        <span className="text-sm font-bold tracking-tight text-neutral-900 absolute left-1/2 -translate-x-1/2">Progression</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-5 md:pt-10 pb-28 md:pb-10 space-y-8">

        <div className="hidden md:flex items-center gap-3">
          <Link href="/pro" className="flex items-center text-neutral-400 hover:text-neutral-700 transition-colors p-1 -ml-1 rounded-lg">
            <ArrowLeft size={16} />
          </Link>
          <span className="text-neutral-200">/</span>
          <h1 className="text-lg font-bold text-neutral-900">Progression</h1>
        </div>

        {/* ══ 1. MON NIVEAU ══ */}
        {dataLoading ? (
          <div className="h-56 bg-neutral-200 rounded-[28px] animate-pulse" />
        ) : bestSpecialty ? (
          <div>
            <div className={`rounded-[28px] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_4px_-2px_rgba(10,10,10,0.25),0_16px_36px_-14px_rgba(10,10,10,0.35)] p-6 ${heroBg}`}>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/50 mb-1">
                {bestSpecialty.specialty_name ?? 'Votre spécialité'}
              </p>
              <div className="flex items-end justify-between gap-3 mb-1.5">
                <h2 className="text-4xl font-black text-white tracking-tight leading-none">{bestSpecialty.level_name}</h2>
                <p className="text-sm font-bold text-white/70 tabular-nums pb-0.5 flex-shrink-0">{bestSpecialty.score} pts</p>
              </div>
              {bestSpecialty.local_rank != null && bestSpecialty.local_total != null && (
                <p className="text-[13px] font-semibold text-white/60 tabular-nums">
                  {bestSpecialty.local_rank}{bestSpecialty.local_rank === 1 ? 'ᵉʳ' : 'ᵉ'} sur {bestSpecialty.local_total} dans votre ville
                </p>
              )}

              {/* L'échelle entière, sous les yeux — on voit où on est. */}
              <div className="mt-5 mb-4">
                <LevelTrack levelIndex={Math.min(bestSpecialty.level, PALIERS.length - 1)} />
              </div>

              {palierSuivant && (
                <div className="h-2 bg-white/15 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${heroPct}%` }} />
                </div>
              )}
              {bestSpecialty.next_step ? (
                <p className="text-[12px] font-semibold text-white/60">
                  Encore <span className="text-white">{bestSpecialty.next_step.missing} {bestSpecialty.next_step.label}{bestSpecialty.next_step.missing > 1 ? 's' : ''}</span> pour devenir {bestSpecialty.next_step.next_level_name}
                </p>
              ) : !palierSuivant ? (
                <p className="text-[12px] font-bold text-white/60">Palier maximal — vous êtes la Référence.</p>
              ) : null}

              {/* Partage ta réussite : dès le palier Confirmé (level ≥ 1), le
                  coiffeur poste sa montée en story CHAIR — pub gratuite entre
                  coiffeurs. On ne le propose pas au palier « Nouveau ». */}
              {bestSpecialty.level >= 1 && (
                <button
                  onClick={() => setReussiteOpen(true)}
                  className="mt-5 w-full flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white font-semibold py-3 rounded-2xl text-[13px] transition-colors"
                >
                  <Share2 size={14} /> Partager ma réussite
                </button>
              )}

              <div className="flex items-center gap-4 pt-4 mt-4 border-t border-white/10">
                <div className="flex items-center gap-1.5">
                  <Flame size={13} className="text-white/40" />
                  <span className="text-[11px] font-semibold text-white/60">{streak?.current_streak ?? 0}j actifs</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Trophy size={13} className="text-white/40" />
                  <span className="text-[11px] font-semibold text-white/60">{chairBadgesAll.length} trophée{chairBadgesAll.length > 1 ? 's' : ''}</span>
                </div>
                {rarestOwned && (
                  <div className="flex items-center gap-1.5">
                    <Gem size={13} className="text-white/40" />
                    <span className="text-[11px] font-semibold text-white/60">{RARITY_LABELS[rarestOwned.rarity]}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Comment ça monte — la seule explication nécessaire, sous le visuel. */}
            <p className="text-[11px] text-neutral-400 leading-relaxed mt-2.5 px-1">
              Les <span className="font-semibold text-neutral-600">passages vérifiés</span> (QR ou RDV honorés),
              les <span className="font-semibold text-neutral-600">avis</span> et
              les <span className="font-semibold text-neutral-600">réalisations</span>{' '}
              de cette spécialité font monter le score — rien d&apos;autre.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-[24px] shadow-[0_4px_16px_-6px_rgba(10,10,10,0.1)] ring-1 ring-neutral-100 px-5 py-8 text-center">
            <Scissors size={26} className="text-neutral-200 mx-auto mb-2" />
            <p className="text-sm font-semibold text-neutral-500">Choisissez vos spécialités</p>
            <p className="text-[12px] text-neutral-400 mt-1">Votre progression se mesure par spécialité — sélectionnez-les sur votre profil.</p>
            <Link href="/pro/profil" className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold bg-neutral-900 text-white px-4 py-2.5 rounded-xl">
              Mon profil <ArrowRight size={12} />
            </Link>
          </div>
        )}

        {/* Les autres spécialités — mêmes règles, lignes compactes. */}
        {!dataLoading && autresSpecialties.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3 flex items-center gap-2">
              <Scissors size={13} className="text-neutral-400" />Vos autres spécialités
            </p>
            <div className="space-y-2.5">
              {autresSpecialties.map((s) => (
                <SpecialtyRow key={s.specialty_id} progress={s} />
              ))}
            </div>
          </div>
        )}

        {/* ══ 2. DÉFIS ══ */}
        {!dataLoading && defis.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-1 flex items-center gap-2">
              <TrendingUp size={13} className="text-neutral-400" />Défis en cours
            </p>
            <p className="text-[11px] text-neutral-400 mb-3">Des trophées à portée de main — visibles par vous seul.</p>
            <div className="space-y-2">
              {defis.map((c) => (
                <ChallengeRow
                  key={c.code}
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
          </div>
        )}

        {/* ══ 3. TROPHÉES ══ */}
        {!dataLoading && catalog.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-1 flex items-center gap-2">
              <Award size={13} className="text-neutral-400" />Trophées
              <span className="text-[10px] font-bold text-neutral-500 normal-case tracking-normal">{obtenus.length}/{catalog.length}</span>
            </p>
            <p className="text-[11px] text-neutral-400 mb-3">
              Des souvenirs de parcours — ils ne comptent pas dans votre niveau, affichés sur votre profil public.
            </p>

            {obtenus.length > 0 ? (
              <div className="grid grid-cols-3 gap-2.5">
                {obtenus.map((b) => (
                  <BadgeCard key={b.code} badge={b} onExplain={() => setSelectedBadge(b)} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-[20px] ring-1 ring-neutral-100 px-5 py-6 text-center">
                <p className="text-[12px] text-neutral-400">Vos premiers trophées arrivent avec vos premiers gestes — profil complété, première réalisation, premier avis.</p>
              </div>
            )}

            {/* Le reste du catalogue : UN bouton, pas treize accordéons. */}
            {verrouilles.length > 0 && (
              <div className="mt-3">
                <button
                  onClick={() => setCatalogOuvert((v) => !v)}
                  className="w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl border border-dashed border-neutral-200 text-[13px] font-semibold text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 transition-colors"
                >
                  {catalogOuvert ? 'Masquer' : `Voir les ${verrouilles.length} trophées à débloquer`}
                  <ChevronDown size={14} className={`transition-transform ${catalogOuvert ? 'rotate-180' : ''}`} />
                </button>
                {catalogOuvert && (
                  <div className="mt-4 space-y-5">
                    {verrouillesParFamille.map(({ cat, badges }) => (
                      <div key={cat}>
                        <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-neutral-400 mb-2 flex items-center gap-1.5">
                          {cat === 'exceptionnel' && <Sparkles size={11} />}
                          {CATEGORY_LABELS[cat] ?? cat}
                        </p>
                        <div className="grid grid-cols-3 gap-2.5">
                          {[...badges].sort((a, b) => a.tier - b.tier).map((b) => (
                            <BadgeCard key={b.code} badge={b} onExplain={() => setSelectedBadge(b)} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <BadgeExplainSheet badge={selectedBadge} onClose={() => setSelectedBadge(null)} coiffeurName={user.name} />
      {!celebrationDismissed && newlyUnlocked.length > 0 && (
        <BadgeUnlockModal badges={newlyUnlocked} onClose={() => setCelebrationDismissed(true)} />
      )}

      {reussiteOpen && bestSpecialty && (
        <StoryShareSheet
          generer={() => genererStoryReussite({
            niveau: bestSpecialty.level_name,
            specialite: bestSpecialty.specialty_name ?? 'ma spécialité',
            rang: bestSpecialty.local_rank != null && user.city
              ? `${bestSpecialty.local_rank}${bestSpecialty.local_rank === 1 ? 'ᵉʳ' : 'ᵉ'} à ${user.city}`
              : null,
            name: user.name,
            city: user.city,
            slug: user.hairdresser_profile?.slug ?? null,
          })}
          lien={user.hairdresser_profile?.slug ? `https://getchair.app/coiffeur/${user.hairdresser_profile.slug}` : null}
          onClose={() => setReussiteOpen(false)}
        />
      )}
    </div>
  );
}
