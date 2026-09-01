'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api, appointments as apptApi } from '@/lib/api';
import {
  hasChairPlus,
  type ApiPost, type ApiStats, type ApiHairdresserProfile,
  type ApiAppointment,
  type ApiChairLevel,
  type ApiSpecialtyHighlight, type ApiNextBadge, type ApiChairBadge,
} from '@/lib/types';
import {
  ChevronRight, Sparkles,
} from 'lucide-react';
import PortfolioSnapshotCard from '@/components/ui/PortfolioSnapshotCard';
import StoryCreateCard from '@/components/ui/StoryCreateCard';
import RankCard from '@/components/pro/home/RankCard';
import TodayCard from '@/components/pro/home/TodayCard';
import WeekCard from '@/components/pro/home/WeekCard';
import StreakCard from '@/components/pro/home/StreakCard';
import QuestCard from '@/components/pro/home/QuestCard';
import CompletionCard from '@/components/pro/home/CompletionCard';
import FirstStepsCard, { type Geste } from '@/components/pro/home/FirstStepsCard';
import VisibilityCard from '@/components/pro/home/VisibilityCard';
import { completionFromProfile } from '@/lib/profileCompletion';
import ProModeSwitcher from '@/components/layout/ProModeSwitcher';
import { CARTE, CARTE_TAP, MICRO_TITRE } from '@/lib/proStyle';

export default function CockpitPage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);
  const router = useRouter();

  // Filet de sécurité : un compte double-identité en mode Gérant qui atterrit
  // ici (lien historique, retour navigateur...) doit voir son cockpit Salon,
  // pas rester coincé sur le cockpit coiffeur — toutes les surfaces de nav
  // pointent déjà vers /pro/salon-owner en mode Gérant, ceci couvre le reste.
  useEffect(() => {
    if (user?.active_pro_mode === 'salon_owner') router.replace('/pro/salon-owner');
  }, [user, router]);

  const [fullProfile,   setFullProfile]   = useState<ApiHairdresserProfile | null>(null);
  const [stats,         setStats]         = useState<ApiStats | null>(null);
  const [posts,         setPosts]         = useState<ApiPost[]>([]);
  const [appointments,  setAppointments]  = useState<ApiAppointment[]>([]);
  const [dataLoading,   setDataLoading]   = useState(true);
  // Tout vient du même GET /profile : classements par spécialité, badges
  // débloqués, prochains paliers. Pas d'appel supplémentaire pour la home.
  const [specialtyHighlights, setSpecialtyHighlights] = useState<ApiSpecialtyHighlight[]>([]);
  const [nextBadges,    setNextBadges]    = useState<ApiNextBadge[]>([]);
  const [unlockedBadges, setUnlockedBadges] = useState<ApiChairBadge[]>([]);
  const [badgeCatalogueTotal, setBadgeCatalogueTotal] = useState(0);

  const isIndependent = user?.hairdresser_profile?.is_independent !== false;

  useEffect(() => {
    if (!user) return;
    // Agenda utile aux DEUX rôles (RDV du jour pour un salarié aussi, pas
    // seulement l'indépendant) — pas de fetch conditionnel par rôle ici.
    Promise.allSettled([
      api.get<ApiHairdresserProfile>('/profile'),
      apptApi.getStats(),
      api.get<ApiPost[]>('/posts'),
      api.get<ApiAppointment[]>('/appointments'),
    ]).then(([prof, st, ps, apts]) => {
      if (prof.status === 'fulfilled') {
        const p = prof.value as ApiHairdresserProfile & {
          chair_level?: ApiChairLevel;
          profile?: ApiHairdresserProfile;
        };
        const profileData = (p as { profile?: ApiHairdresserProfile }).profile ?? p;
        setFullProfile(profileData as ApiHairdresserProfile);
        const brut = p as unknown as {
          specialty_highlights?: ApiSpecialtyHighlight[];
          next_badges?: ApiNextBadge[];
          chair_badges_all?: ApiChairBadge[];
          chair_badges_catalog?: ApiChairBadge[];
        };
        if (Array.isArray(brut.specialty_highlights)) setSpecialtyHighlights(brut.specialty_highlights);
        if (Array.isArray(brut.next_badges)) setNextBadges(brut.next_badges);
        if (Array.isArray(brut.chair_badges_all)) setUnlockedBadges(brut.chair_badges_all);
        if (Array.isArray(brut.chair_badges_catalog)) setBadgeCatalogueTotal(brut.chair_badges_catalog.length);
      }
      if (st.status  === 'fulfilled') setStats(st.value as ApiStats);
      // Liste complète (pas tronquée) — nécessaire pour des totaux réels (likes, meilleure réalisation)
      if (ps.status  === 'fulfilled' && Array.isArray(ps.value)) setPosts(ps.value as ApiPost[]);
      if (apts.status === 'fulfilled' && Array.isArray(apts.value)) setAppointments(apts.value as ApiAppointment[]);
    }).finally(() => setDataLoading(false));
  }, [user]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  const profile   = user.hairdresser_profile;
  // Meme calcul que la page Profil, importe et non recopie : deux ecrans
  // qui annoncent deux pourcentages differents pour le meme profil, c est
  // le genre d incoherence qui fait douter du reste.
  const completion = completionFromProfile(fullProfile);

  // Les cinq gestes qui lancent un profil. La complétion dit si la FICHE est
  // prête ; ceux-ci disent si le MÉTIER a commencé. Tant qu'ils ne sont pas
  // tous faits, cette checklist remplace la carte de complétion — deux
  // cartes « à faire » côte à côte se neutralisent.
  const gestes: Geste[] = [
    { libelle: 'Ajouter votre photo de profil', fait: !!user.avatar, href: '/pro/profil' },
    { libelle: 'Compléter votre profil', fait: (completion?.pct ?? 0) >= 100, href: '/pro/profil' },
    { libelle: 'Publier 3 réalisations', fait: posts.length >= 3, href: '/pro/portfolio' },
    { libelle: 'Valider votre premier passage client', fait: (fullProfile?.visits_count ?? 0) >= 1, href: '/pro/mon-qr' },
    { libelle: 'Décrocher un premier avis vérifié', fait: (stats?.reviews_count ?? 0) >= 1, href: '/pro/mon-qr' },
  ];
  const lancementFini = gestes.every((g) => g.fait);
  const firstName = user.name.split(' ')[0];


  const pending      = appointments.filter((a) => a.status === 'pending');

  const todayDateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  // Meilleure spécialité = score de spécialité le plus élevé (déjà trié
  // ainsi côté backend, /my-specialty-progress ORDER BY score DESC).

  // Horaires du jour. hairdresser_schedules.day_of_week suit la convention
  // PHP date('w') : 0 = Dimanche … 6 = Samedi (voir la migration
  // create_hairdresser_schedules_table, ScheduleController::index qui renvoie
  // les 7 jours indexés 0..6, AvailabilityController et SlotGuard).
  // Date.getDay() utilise exactement la même numérotation : le décalage
  // "(getDay() + 6) % 7" appliqué ici lisait donc la ligne de la VEILLE.


  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 pt-6 md:pt-10 pb-12">

      {/* ── Double identité : Mode Gérant / Mode Coiffeur (mobile — la
          sidebar desktop a la sienne) ── */}
      {(user.can_manage_salon && user.has_hairdresser_profile) && (
        <div className="md:hidden mb-5">
          <ProModeSwitcher />
        </div>
      )}

      {/* ══════════ Qui je suis ══════════
          Une ligne, pas une carte. L'identité n'a pas besoin d'occuper le
          haut de l'écran : le coiffeur sait qui il est. Ce qu'il vient
          chercher, c'est sa place et sa journée. */}
      <div className="flex items-baseline justify-between gap-3 mb-5">
        <h1 className="text-[26px] font-bold text-neutral-900 tracking-[-0.02em] truncate">
          {firstName ? `Bonjour ${firstName}` : 'Bonjour'}
        </h1>
        <span className="text-[12px] text-neutral-400 capitalize shrink-0">{todayDateStr}</span>
      </div>

      {/* ══════════ Où je me situe ══════════
          En tête, et volontairement. C'est le seul écran de l'app qui
          répond à « est-ce que je progresse ? » — et « Novice » n'y
          répondait pas. Voir components/pro/home/RankCard.tsx. */}
      {dataLoading ? (
        <div className="h-48 bg-neutral-100 rounded-[24px] animate-pulse" />
      ) : (
        <RankCard highlights={specialtyHighlights} city={profile?.city ?? null} isIndependent={isIndependent} />
      )}

      {/* ══════════ Ma journée ══════════ */}
      <div className="mt-3 space-y-3">
        {dataLoading ? (
          <div className="h-32 bg-neutral-50 rounded-[24px] animate-pulse" />
        ) : (
          <>
            {/* Les demandes en attente passent avant tout le reste : un
                client qui n'a pas de réponse est un client qui part. */}
            {isIndependent && pending.length > 0 && (
              <Link
                href="/pro/agenda"
                className="flex items-center gap-3.5 bg-amber-50 rounded-[28px] ring-1 ring-amber-100 shadow-[0_1px_2px_rgba(10,10,10,0.04),0_10px_26px_-14px_rgba(180,83,9,0.18)] px-5 py-4 active:scale-[0.985] transition-transform duration-200"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-amber-900">
                    {pending.length} demande{pending.length > 1 ? 's' : ''} en attente
                  </p>
                  <p className="text-[13px] text-amber-700/70 mt-0.5">Répondez pour ne pas perdre ces clients</p>
                </div>
                <ChevronRight size={16} className="text-amber-700/50 flex-shrink-0" />
              </Link>
            )}

            {/* Salarié : sa semaine (scans, avis) — les RDV sont le monde de
                l'indépendant, pas le sien. */}
            {isIndependent
              ? <TodayCard appointments={appointments} href="/pro/agenda" />
              : <WeekCard />}

            {/* ══════════ Ce qui me tire vers le haut ══════════ */}
            <StreakCard />

            <QuestCard
              nextBadges={nextBadges}
              unlocked={unlockedBadges}
              catalogueTotal={badgeCatalogueTotal}
            />

            {/* Lancement d'abord ; la complétion fine ne prend le relais
                qu'une fois les cinq gestes faits. */}
            {!lancementFini && <FirstStepsCard gestes={gestes} />}
            {lancementFini && completion && <CompletionCard completion={completion} />}
          </>
        )}
      </div>

        {/* ══════════ Ce que je montre ══════════
            Même langage que les cartes du dessus : micro-titre en capitales,
            relief, coins à 28. Les gros titres de section pesaient autant que
            « Bonjour Julien » et écrasaient la hiérarchie. */}
        {!dataLoading && (
          <div className={`${CARTE} p-5`}>
            <div className="flex items-center justify-between gap-3 mb-1">
              <p className={MICRO_TITRE}>Ma vitrine</p>
              <Link href="/pro/portfolio" className="relative before:absolute before:-inset-2 before:content-[''] text-neutral-300 active:text-neutral-500 transition-colors">
                <ChevronRight size={16} />
              </Link>
            </div>
            <PortfolioSnapshotCard posts={posts} />
            {hasChairPlus(fullProfile) && (
              <div className="mt-4"><StoryCreateCard profile={fullProfile} /></div>
            )}
          </div>
        )}

        {/* ══════════ Ce que ça rapporte ══════════
            Remplace « 0 · 0 · 0 € ». Le chiffre d'affaires estimé est reparti
            dans /pro/business : CHAIR ne voit que les rendez-vous pris dans
            l'app, donc « 0 € » sur l'accueil d'un coiffeur qui travaille
            était simplement faux. */}
        {!dataLoading && stats && (
          <VisibilityCard stats={stats} slug={profile?.slug ?? null} name={firstName} />
        )}

        {/* ══════════ CHAIR+ ══════════
            Une seule ligne, discrète, sans argumentaire : l'abonnement doit
            se savoir, pas se vendre depuis l'écran d'accueil. Le parrainage
            et « modifier mon profil » sont partis dans l'onglet Plus, où l'on
            va quand on cherche un réglage — pas quand on ouvre l'app. */}
        {!dataLoading && !hasChairPlus(fullProfile) && (
          <Link
            href="/pro/chair-plus"
            className={`flex items-center gap-3 ${CARTE_TAP} px-5 min-h-[60px] py-3`}
          >
            <Sparkles size={17} className="text-neutral-400 shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block text-[14px] font-semibold text-neutral-900">CHAIR+</span>
              <span className="block text-[12px] text-neutral-500">Stories, boost et statistiques détaillées</span>
            </span>
            <ChevronRight size={16} className="text-neutral-300 shrink-0" />
          </Link>
        )}

    </div>
  );
}
