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
  ChevronRight, Clock, Gift, Pencil, CalendarDays, Crown, Trophy, UserCheck, Sparkles,
} from 'lucide-react';
import CockpitHero from '@/components/ui/CockpitHero';
import NextStepCard from '@/components/ui/NextStepCard';
import BusinessSnapshotCard from '@/components/ui/BusinessSnapshotCard';
import PortfolioSnapshotCard from '@/components/ui/PortfolioSnapshotCard';
import StoryCreateCard from '@/components/ui/StoryCreateCard';
import StreakWidget from '@/components/ui/StreakWidget';
import ProSection from '@/components/pro/ProSection';
import ProStatTile from '@/components/pro/ProStatTile';
import ProLinkRow from '@/components/pro/ProLinkRow';
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

  // ── Tuiles de la section "Ma progression". Construites en liste : la
  //    grille reste pleine quoi qu'il arrive, y compris pour un coiffeur sans
  //    ville renseignée (donc sans classement local possible).
  const bestRanked = specialties
    .filter((s) => s.local_rank != null && (s.local_total ?? 0) >= 2)
    .sort((a, b) => (a.local_rank ?? 999) - (b.local_rank ?? 999))[0] ?? null;
  const hasSpecialtyActivity = specialties.some((s) => s.score > 0);

  const progressTiles: React.ReactNode[] = [];

  if (chairLevel) {
    progressTiles.push(
      <ProStatTile
        key="level"
        href="/pro/badges"
        icon={Crown}
        label="Niveau CHAIR"
        value={chairLevel.name}
        progress={chairLevel.next ? chairLevel.progress : null}
        hint={chairLevel.next ? `${chairLevel.progress}% vers ${chairLevel.next.name}` : 'Niveau maximum'}
      />,
    );
  }

  progressTiles.push(<StreakWidget key="streak" tile />);

  if (profile?.city && (bestRanked || hasSpecialtyActivity)) {
    progressTiles.push(
      <ProStatTile
        key="rank"
        href="/app/classements"
        icon={Trophy}
        label="Classement"
        value={bestRanked ? `#${bestRanked.local_rank} · ${profile.city}` : 'Non classé'}
        hint={
          bestRanked
            ? bestRanked.points_to_next
              ? `${bestRanked.points_to_next} pt${bestRanked.points_to_next > 1 ? 's' : ''} avant la ${(bestRanked.local_rank ?? 1) - 1}e place`
              : `${bestRanked.specialty_name} à ${profile.city}`
            : `Publiez et récoltez des avis pour entrer au classement de ${profile.city}`
        }
      />,
    );
  }

  progressTiles.push(
    <ProStatTile
      key="profile"
      href="/pro/profil"
      icon={UserCheck}
      label="Profil"
      value={`${score}% complété`}
      progress={score}
      hint={
        missingItems.length > 0
          ? `Il manque : ${missingItems.slice(0, 2).map((i) => i.short).join(', ')}`
          : isIndependent ? 'Prêt pour les réservations' : 'Profil complet'
      }
    />,
  );

  // Nombre impair de tuiles : la dernière prend toute la largeur plutôt que
  // de laisser une demi-ligne vide.
  const oddTail = progressTiles.length % 2 === 1;

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 pt-6 md:pt-8 pb-6 space-y-4">

      {/* ── Double identité : Mode Gérant / Mode Coiffeur (mobile — la
          sidebar desktop a la sienne) ── */}
      {(user.can_manage_salon && user.has_hairdresser_profile) && (
        <div className="md:hidden">
          <ProModeSwitcher />
        </div>
      )}

      {/* ══════════ 1 — Qui je suis. Seul bloc sombre de la page ══════════ */}
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
        <div className="h-44 bg-neutral-100 rounded-[26px] animate-pulse" />
      )}

      {/* ══════════ 2 — Ce qui se passe maintenant ══════════ */}
      <ProSection label="Aujourd'hui" action={isIndependent ? { href: '/pro/agenda', label: 'Agenda' } : undefined}>
        {isIndependent && !dataLoading && pending.length > 0 && (
          <Link href="/pro/agenda"
            className="flex items-center gap-3 bg-amber-50 rounded-2xl px-4 py-3.5 shadow-[0_2px_10px_-4px_rgba(217,119,6,0.12)] ring-1 ring-amber-100 hover:bg-amber-100 transition-colors"
          >
            <div className="w-8 h-8 bg-amber-400 rounded-xl flex items-center justify-center flex-shrink-0">
              <CalendarDays size={15} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-900">
                {pending.length} demande{pending.length > 1 ? 's' : ''} en attente
              </p>
              <p className="text-xs text-amber-600">Répondez pour ne pas perdre ces clients</p>
            </div>
            <ChevronRight size={16} className="text-amber-500 flex-shrink-0" />
          </Link>
        )}

        <div className="bg-white rounded-[22px] shadow-[0_2px_10px_-4px_rgba(10,10,10,0.08)] ring-1 ring-neutral-100 overflow-hidden">
          {dataLoading ? (
            <div className="p-5"><div className="h-10 bg-neutral-100 rounded-xl animate-pulse" /></div>
          ) : (
            <>
              {!isIndependent && (
                <div className="px-5 pt-4 pb-3 flex items-center gap-3 text-sm">
                  <div className="w-9 h-9 rounded-xl bg-neutral-50 flex items-center justify-center flex-shrink-0">
                    <Clock size={15} className="text-neutral-400" />
                  </div>
                  <p className="text-neutral-600">
                    {todaySchedule
                      ? <>Horaires : <span className="font-semibold text-neutral-900">{todaySchedule.start_time?.slice(0, 5)} – {todaySchedule.end_time?.slice(0, 5)}</span></>
                      : "Pas d'horaires renseignés aujourd'hui"}
                  </p>
                </div>
              )}

              {todayApts.length === 0 ? (
                <div className="px-5 py-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-50 flex items-center justify-center flex-shrink-0">
                    <Clock size={16} className="text-neutral-300" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 font-medium">Aucun RDV aujourd&apos;hui</p>
                    {isIndependent && tomorrowApts.length > 0 && (
                      <p className="text-xs text-neutral-400">{tomorrowApts.length} RDV demain</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-neutral-50">
                  {todayApts.slice(0, 3).map((apt) => (
                    <Link key={apt.id} href="/pro/agenda"
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-neutral-50 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-600 flex-shrink-0">
                        {apt.client_name?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 truncate">{apt.client_name}</p>
                        <p className="text-xs text-neutral-400 truncate">{apt.service}</p>
                      </div>
                      <span className="text-sm font-bold text-neutral-700 flex-shrink-0">
                        {apt.appointment_time?.slice(0, 5) ?? ''}
                      </span>
                    </Link>
                  ))}
                  {todayApts.length > 3 && (
                    <Link href="/pro/agenda" className="block px-5 py-3 text-xs font-semibold text-neutral-400 text-center hover:text-neutral-900 transition-colors">
                      +{todayApts.length - 3} autre{todayApts.length - 3 > 1 ? 's' : ''} RDV
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </ProSection>

      {/* ══════════ 3 — LA seule chose à faire ensuite ══════════ */}
      <ProSection label="Prochaine étape">
        {!dataLoading ? (
          <NextStepCard profileScore={score} topProfileItem={missingItems[0] ?? null} bestSpecialty={bestSpecialty} />
        ) : (
          <div className="h-24 bg-neutral-100 rounded-[22px] animate-pulse" />
        )}
      </ProSection>

      {/* ══════════ 4 — Où j'en suis : quatre chiffres, pas quatre écrans ══════════ */}
      {!dataLoading && (
        <ProSection label="Ma progression" action={{ href: '/pro/badges', label: 'Badges' }}>
          <div className="grid grid-cols-2 gap-2">
            {progressTiles.map((tile, i) => (
              <div key={i} className={oddTail && i === progressTiles.length - 1 ? 'col-span-2' : ''}>
                {tile}
              </div>
            ))}
          </div>
        </ProSection>
      )}

      {/* ══════════ 5 — Ce que je montre ══════════ */}
      {!dataLoading && (
        <ProSection label="Ma vitrine" action={{ href: '/pro/portfolio', label: 'Tout voir' }}>
          <PortfolioSnapshotCard posts={posts} />
          {/* Stories : la carte "verrouillée CHAIR+" disait exactement la même
              chose que la ligne CHAIR+ d'"Aller plus loin" — un seul upsell. */}
          {hasChairPlus(fullProfile) && <StoryCreateCard profile={fullProfile} />}
        </ProSection>
      )}

      {/* ══════════ 6 — Ce que ça rapporte (indépendant uniquement) ══════════ */}
      {!dataLoading && isIndependent && stats && (
        <ProSection label="Mon activité" action={{ href: '/pro/business', label: 'Performance' }}>
          <BusinessSnapshotCard stats={stats} />
        </ProSection>
      )}

      {/* ══════════ 7 — Le reste, groupé en une carte au lieu de quatre ══════════ */}
      {!dataLoading && (
        <ProSection label="Aller plus loin">
          <div className="bg-white rounded-[22px] shadow-[0_2px_10px_-4px_rgba(10,10,10,0.08)] ring-1 ring-neutral-100 overflow-hidden divide-y divide-neutral-50">
            {!hasChairPlus(fullProfile) && (
              <ProLinkRow href="/pro/chair-plus" icon={Sparkles} title="Passer à CHAIR+" subtitle="Stories, boost, analytics — essai gratuit 30 jours" />
            )}
            <ProLinkRow href="/pro/parrainage" icon={Gift} title="Parrainer un coiffeur" subtitle="Points, badges et CHAIR+ offert" />
            <ProLinkRow href="/pro/profil" icon={Pencil} title="Modifier mon profil" />
          </div>
        </ProSection>
      )}

    </div>
  );
}
