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
  ChevronRight, Gift, Pencil, Sparkles, Eye,
} from 'lucide-react';
import BusinessSnapshotCard from '@/components/ui/BusinessSnapshotCard';
import PortfolioSnapshotCard from '@/components/ui/PortfolioSnapshotCard';
import StoryCreateCard from '@/components/ui/StoryCreateCard';
import RankCard from '@/components/pro/home/RankCard';
import TodayCard from '@/components/pro/home/TodayCard';
import StreakCard from '@/components/pro/home/StreakCard';
import QuestCard from '@/components/pro/home/QuestCard';
import CompletionCard from '@/components/pro/home/CompletionCard';
import { completionFromProfile } from '@/lib/profileCompletion';
import ProSection from '@/components/pro/ProSection';
import { ProGroup, ProGroupRow } from '@/components/pro/ProGroup';
import ProModeSwitcher from '@/components/layout/ProModeSwitcher';

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
        <RankCard highlights={specialtyHighlights} city={profile?.city ?? null} />
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
                className="flex items-center gap-3.5 bg-amber-50 rounded-[24px] px-5 py-4 active:bg-amber-100/70 transition-colors"
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

            <TodayCard appointments={appointments} href={isIndependent ? '/pro/agenda' : '/pro/reservations'} />

            {/* ══════════ Ce qui me tire vers le haut ══════════ */}
            <StreakCard />

            <QuestCard
              nextBadges={nextBadges}
              unlocked={unlockedBadges}
              catalogueTotal={badgeCatalogueTotal}
            />

            {completion && <CompletionCard completion={completion} />}
          </>
        )}
      </div>

      {/* ══════════ Ce que je montre ══════════ */}
      {!dataLoading && (
        <ProSection title="Ma vitrine" href="/pro/portfolio">
          <PortfolioSnapshotCard posts={posts} />
          {/* Stories : la carte "verrouillée CHAIR+" disait exactement la même
              chose que la ligne CHAIR+ plus bas — un seul upsell sur la page. */}
          {hasChairPlus(fullProfile) && (
            <div className="mt-4"><StoryCreateCard profile={fullProfile} /></div>
          )}
          {profile?.slug && (
            <div className="mt-4">
              <ProGroup>
                <ProGroupRow href={`/app/coiffeur/${profile.slug}`} external icon={Eye} label="Voir mon profil public" />
              </ProGroup>
            </div>
          )}
        </ProSection>
      )}

      {/* ══════════ Ce que ça rapporte (indépendant uniquement) ══════════ */}
      {!dataLoading && isIndependent && stats && (
        <ProSection title="Mon activité" href="/pro/business">
          <BusinessSnapshotCard stats={stats} />
        </ProSection>
      )}

      {/* ══════════ Le reste, groupé ══════════ */}
      {!dataLoading && (
        <ProSection title="Aller plus loin">
          <ProGroup>
            {!hasChairPlus(fullProfile) && (
              <ProGroupRow href="/pro/chair-plus" icon={Sparkles} label="CHAIR+" hint="Stories, boost et analytics" />
            )}
            <ProGroupRow href="/pro/parrainage" icon={Gift} label="Parrainer un coiffeur" hint="Points, badges et CHAIR+ offert" />
            <ProGroupRow href="/pro/profil" icon={Pencil} label="Modifier mon profil" />
          </ProGroup>
        </ProSection>
      )}

    </div>
  );
}
