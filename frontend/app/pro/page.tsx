'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api, appointments as apptApi, specialtyProgress } from '@/lib/api';
import { computeScore } from '@/lib/profileScore';
import {
  resolveMediaUrl, hasChairPlus,
  type ApiPost, type ApiStats, type ApiHairdresserProfile,
  type ApiAppointment, type ApiScheduleDay,
  type ApiChairLevel, type ApiService, type ApiSpecialtyProgress,
  apptDateStr,
} from '@/lib/types';
import {
  ChevronRight, Clock, Gift, Pencil, Crown, Trophy, UserCheck, Sparkles, Eye,
} from 'lucide-react';
import CockpitHero from '@/components/ui/CockpitHero';
import NextStepCard from '@/components/ui/NextStepCard';
import BusinessSnapshotCard from '@/components/ui/BusinessSnapshotCard';
import PortfolioSnapshotCard from '@/components/ui/PortfolioSnapshotCard';
import StoryCreateCard from '@/components/ui/StoryCreateCard';
import StreakWidget from '@/components/ui/StreakWidget';
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
  const [services,      setServices]      = useState<ApiService[]>([]);
  const [schedule,      setSchedule]      = useState<ApiScheduleDay[]>([]);
  const [scheduleSet,   setScheduleSet]   = useState(false);
  const [dataLoading,   setDataLoading]   = useState(true);
  const [chairLevel,    setChairLevel]    = useState<ApiChairLevel | null>(null);
  const [specialties,   setSpecialties]   = useState<ApiSpecialtyProgress[]>([]);

  const isIndependent = user?.hairdresser_profile?.is_independent !== false;

  useEffect(() => {
    if (!user) return;
    // Agenda utile aux DEUX rôles (RDV du jour pour un salarié aussi, pas
    // seulement l'indépendant) — pas de fetch conditionnel par rôle ici.
    Promise.allSettled([
      api.get<ApiHairdresserProfile>('/profile'),
      apptApi.getStats(),
      api.get<ApiPost[]>('/posts'),
      api.get<ApiService[]>('/services'),
      api.get<ApiAppointment[]>('/appointments'),
      api.get<ApiScheduleDay[]>('/schedule'),
      specialtyProgress.mine(),
    ]).then(([prof, st, ps, svcs, apts, sched, sp]) => {
      if (prof.status === 'fulfilled') {
        const p = prof.value as ApiHairdresserProfile & {
          chair_level?: ApiChairLevel;
          profile?: ApiHairdresserProfile;
        };
        const profileData = (p as { profile?: ApiHairdresserProfile }).profile ?? p;
        setFullProfile(profileData as ApiHairdresserProfile);
        if (p.chair_level) setChairLevel(p.chair_level);
      }
      if (st.status  === 'fulfilled') setStats(st.value as ApiStats);
      // Liste complète (pas tronquée) — nécessaire pour des totaux réels (likes, meilleure réalisation)
      if (ps.status  === 'fulfilled' && Array.isArray(ps.value)) setPosts(ps.value as ApiPost[]);
      if (svcs.status === 'fulfilled' && Array.isArray(svcs.value)) setServices(svcs.value as ApiService[]);
      if (apts.status === 'fulfilled' && Array.isArray(apts.value)) setAppointments(apts.value as ApiAppointment[]);
      if (sched.status === 'fulfilled' && Array.isArray(sched.value)) {
        setSchedule(sched.value as ApiScheduleDay[]);
        setScheduleSet((sched.value as ApiScheduleDay[]).some((d) => d.is_open && d.start_time));
      }
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

  const profile   = user.hairdresser_profile;
  const firstName = user.name.split(' ')[0];
  const avatarUrl = resolveMediaUrl(user.avatar);

  const { score, items: missingItems } = computeScore(user, fullProfile, stats, services.length, scheduleSet);

  const now      = new Date();
  const today    = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
  const pending      = appointments.filter((a) => a.status === 'pending');
  const todayApts    = appointments.filter((a) => a.status === 'confirmed' && apptDateStr(a) === today);
  const tomorrowApts = appointments.filter((a) => a.status === 'confirmed' && apptDateStr(a) === tomorrow);

  const todayDateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  // Meilleure spécialité = score de spécialité le plus élevé (déjà trié
  // ainsi côté backend, /my-specialty-progress ORDER BY score DESC).
  const bestSpecialty = specialties[0] ?? null;

  // Horaires du jour. hairdresser_schedules.day_of_week suit la convention
  // PHP date('w') : 0 = Dimanche … 6 = Samedi (voir la migration
  // create_hairdresser_schedules_table, ScheduleController::index qui renvoie
  // les 7 jours indexés 0..6, AvailabilityController et SlotGuard).
  // Date.getDay() utilise exactement la même numérotation : le décalage
  // "(getDay() + 6) % 7" appliqué ici lisait donc la ligne de la VEILLE.
  const todayDow = new Date().getDay();
  const todaySchedule = schedule.find((d) => d.day_of_week === todayDow && d.is_open);

  const bestRanked = specialties
    .filter((s) => s.local_rank != null && (s.local_total ?? 0) >= 2)
    .sort((a, b) => (a.local_rank ?? 999) - (b.local_rank ?? 999))[0] ?? null;
  const hasSpecialtyActivity = specialties.some((s) => s.score > 0);
  const showRankRow = !!profile?.city && (bestRanked || hasSpecialtyActivity);

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 pt-6 md:pt-10 pb-12">

      {/* ── Double identité : Mode Gérant / Mode Coiffeur (mobile — la
          sidebar desktop a la sienne) ── */}
      {(user.can_manage_salon && user.has_hairdresser_profile) && (
        <div className="md:hidden mb-5">
          <ProModeSwitcher />
        </div>
      )}

      {/* ══════════ Qui je suis ══════════ */}
      {!dataLoading ? (
        <CockpitHero
          firstName={firstName}
          avatarUrl={avatarUrl}
          dateStr={todayDateStr}
          publicSlug={profile?.slug ?? null}
          bestSpecialty={bestSpecialty}
          city={profile?.city ?? null}
        />
      ) : (
        <div className="h-40 bg-neutral-50 rounded-[24px] animate-pulse" />
      )}

      {/* ══════════ Ce qui se passe maintenant ══════════ */}
      <ProSection title="Aujourd'hui" href={isIndependent ? '/pro/agenda' : undefined}>
        {dataLoading ? (
          <div className="h-16 bg-neutral-50 rounded-[20px] animate-pulse" />
        ) : (
          <div className="space-y-3">
            {isIndependent && pending.length > 0 && (
              <Link href="/pro/agenda" className="flex items-center gap-3.5 bg-amber-50 rounded-[20px] px-5 py-4 hover:bg-amber-100/70 transition-colors">
                <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-amber-900">
                    {pending.length} demande{pending.length > 1 ? 's' : ''} en attente
                  </p>
                  <p className="text-[13px] text-amber-700/70 mt-0.5">Répondez pour ne pas perdre ces clients</p>
                </div>
                <ChevronRight size={16} className="text-amber-400 flex-shrink-0" />
              </Link>
            )}

            {todayApts.length === 0 && !(!isIndependent && todaySchedule) ? (
              <div className="bg-neutral-50 rounded-[20px] px-5 py-5">
                <p className="text-[15px] text-neutral-500">Aucun rendez-vous aujourd&apos;hui</p>
                {isIndependent && tomorrowApts.length > 0 && (
                  <p className="text-[13px] text-neutral-400 mt-1">{tomorrowApts.length} RDV demain</p>
                )}
              </div>
            ) : (
              <ProGroup>
                {!isIndependent && todaySchedule && (
                  <ProGroupRow
                    icon={Clock}
                    label="Horaires"
                    value={`${todaySchedule.start_time?.slice(0, 5)} – ${todaySchedule.end_time?.slice(0, 5)}`}
                  />
                )}
                {todayApts.length === 0 ? (
                  <ProGroupRow
                    icon={Clock}
                    label="Aucun rendez-vous aujourd'hui"
                    hint={isIndependent && tomorrowApts.length > 0 ? `${tomorrowApts.length} RDV demain` : undefined}
                  />
                ) : (
                  todayApts.slice(0, 4).map((apt) => (
                    <ProGroupRow
                      key={apt.id}
                      href="/pro/agenda"
                      label={apt.client_name ?? 'Client'}
                      hint={apt.service ?? undefined}
                      value={apt.appointment_time?.slice(0, 5) ?? ''}
                    />
                  ))
                )}
                {todayApts.length > 4 && (
                  <ProGroupRow href="/pro/agenda" label={`+ ${todayApts.length - 4} autres rendez-vous`} />
                )}
              </ProGroup>
            )}
          </div>
        )}
      </ProSection>

      {/* ══════════ LA seule chose à faire ensuite ══════════ */}
      <ProSection title="À faire maintenant">
        {!dataLoading ? (
          <NextStepCard profileScore={score} topProfileItem={missingItems[0] ?? null} bestSpecialty={bestSpecialty} />
        ) : (
          <div className="h-24 bg-neutral-50 rounded-[20px] animate-pulse" />
        )}
      </ProSection>

      {/* ══════════ Où j'en suis — une liste, pas quatre cartes ══════════ */}
      {!dataLoading && (
        <ProSection title="Ma progression" href="/pro/badges">
          <ProGroup>
            {chairLevel && (
              <ProGroupRow
                href="/pro/badges"
                icon={Crown}
                label="Niveau CHAIR"
                value={chairLevel.name}
                hint={chairLevel.next ? `${chairLevel.progress}% vers ${chairLevel.next.name}` : 'Niveau maximum'}
              />
            )}
            <StreakWidget row />
            {showRankRow && (
              <ProGroupRow
                href="/pro/classements"
                icon={Trophy}
                label="Classement"
                value={bestRanked ? `#${bestRanked.local_rank}` : '—'}
                hint={
                  bestRanked
                    ? bestRanked.points_to_next
                      ? `${bestRanked.points_to_next} pt${bestRanked.points_to_next > 1 ? 's' : ''} avant la ${(bestRanked.local_rank ?? 1) - 1}e place`
                      : `${bestRanked.specialty_name} à ${profile?.city}`
                    : `Pas encore classé à ${profile?.city}`
                }
              />
            )}
            <ProGroupRow
              href="/pro/profil"
              icon={UserCheck}
              label="Profil"
              value={`${score} %`}
              hint={
                missingItems.length > 0
                  ? `Il manque ${missingItems[0].short}${missingItems.length > 1 ? ` et ${missingItems.length - 1} autre${missingItems.length > 2 ? 's' : ''}` : ''}`
                  : isIndependent ? 'Prêt pour les réservations' : 'Profil complet'
              }
            />
          </ProGroup>
        </ProSection>
      )}

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
