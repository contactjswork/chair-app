'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuth } from '@/contexts/AuthContext';
import { api, appointments as apptApi, specialtyProgress } from '@/lib/api';
import { computeScore } from '@/lib/profileScore';
import {
  resolveMediaUrl,
  type ApiPost, type ApiStats, type ApiHairdresserProfile,
  type ApiAppointment, type ApiScheduleDay,
  type ApiChairLevel, type ApiService, type ApiSpecialtyProgress,
  apptDateStr,
} from '@/lib/types';
import {
  ChevronRight, Eye, Plus, Clock, LogOut, Gift, Pencil, CalendarDays,
} from 'lucide-react';
import CockpitHero from '@/components/ui/CockpitHero';
import NextStepCard from '@/components/ui/NextStepCard';
import LocalReputationCard from '@/components/ui/LocalReputationCard';
import CareerProgressCard from '@/components/ui/CareerProgressCard';
import ProfileCompletionCard from '@/components/ui/ProfileCompletionCard';
import BusinessSnapshotCard from '@/components/ui/BusinessSnapshotCard';
import PortfolioSnapshotCard from '@/components/ui/PortfolioSnapshotCard';
import StoryCreateCard from '@/components/ui/StoryCreateCard';

export default function CockpitPage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);
  const { logout } = useAuth();

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

  // Horaires du jour (salarié) — jour de la semaine ISO (0=lundi...6=dimanche),
  // même convention que hairdresser_schedules.day_of_week côté backend.
  const todayDow = (new Date().getDay() + 6) % 7;
  const todaySchedule = schedule.find((d) => d.day_of_week === todayDow && d.is_open);

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 pt-6 md:pt-8 pb-6 space-y-4">

      {/* ── Identité + accès profil public ── */}
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-200 flex-shrink-0 ring-2 ring-white shadow-sm">
          {avatarUrl
            ? <Image src={avatarUrl} alt={user.name} fill className="object-cover" sizes="40px" />
            : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-neutral-500">{firstName[0]}</div>
          }
        </div>
        <p className="text-xs text-neutral-400 capitalize">{todayDateStr}</p>
        {profile && (
          <Link href={`/app/coiffeur/${profile.slug}`} target="_blank" rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-neutral-500 border border-neutral-200 bg-white px-3 py-2 rounded-xl hover:border-neutral-400 hover:text-neutral-900 transition-colors flex-shrink-0"
          >
            <Eye size={13} />Mon profil
          </Link>
        )}
      </div>

      {/* ── Alerte demandes en attente ── */}
      {isIndependent && !dataLoading && pending.length > 0 && (
        <Link href="/pro/agenda"
          className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5 hover:bg-amber-100 transition-colors"
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

      {/* ══════════ ZONE 1 — LA seule chose à faire maintenant ══════════ */}
      {!dataLoading ? (
        <NextStepCard profileScore={score} topProfileItem={missingItems[0] ?? null} bestSpecialty={bestSpecialty} />
      ) : (
        <div className="h-24 bg-neutral-100 rounded-2xl animate-pulse" />
      )}

      {/* ══════════ ZONE 2 — Où j'en suis (niveau, spécialité, classement) ══════════ */}
      {!dataLoading ? (
        <div className="space-y-2">
          <CockpitHero firstName={firstName} bestSpecialty={bestSpecialty} city={profile?.city ?? null} />
          <div className="grid grid-cols-1 gap-2">
            <CareerProgressCard chairLevel={chairLevel} />
            <LocalReputationCard specialties={specialties} city={profile?.city ?? null} />
          </div>
        </div>
      ) : (
        <div className="h-44 bg-neutral-100 rounded-2xl animate-pulse" />
      )}

      {/* ══════════ ZONE 3 — Ma journée ══════════ */}
      <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between">
          <p className="text-sm font-bold text-neutral-900">{isIndependent ? "Aujourd'hui" : 'Votre journée'}</p>
          <Link href="/pro/agenda" className="text-neutral-300 hover:text-neutral-600 transition-colors">
            <ChevronRight size={16} />
          </Link>
        </div>

        {dataLoading ? (
          <div className="px-5 pb-4 space-y-2">
            <div className="h-10 bg-neutral-100 rounded-xl animate-pulse" />
          </div>
        ) : (
          <>
            {!isIndependent && (
              <div className="px-5 pb-3 flex items-center gap-3 text-sm">
                <div className="w-9 h-9 rounded-xl bg-neutral-50 flex items-center justify-center flex-shrink-0">
                  <Clock size={15} className="text-neutral-400" />
                </div>
                <p className="text-neutral-600">
                  {todaySchedule
                    ? <>Horaires : <span className="font-semibold text-neutral-900">{todaySchedule.start_time?.slice(0, 5)} – {todaySchedule.end_time?.slice(0, 5)}</span></>
                    : 'Pas d\'horaires renseignés aujourd\'hui'}
                </p>
              </div>
            )}

            {todayApts.length === 0 && pending.length === 0 ? (
              <div className="px-5 pb-5 flex items-center gap-3 text-sm text-neutral-400">
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
              <div className="divide-y divide-neutral-50 border-t border-neutral-50">
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
                  <div className="px-5 py-3 text-xs text-neutral-400 text-center">
                    +{todayApts.length - 3} autres RDV
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ══════════ ZONE 4 — Activité, portfolio, découverte (secondaire) ══════════ */}
      {!dataLoading && <PortfolioSnapshotCard posts={posts} />}
      {!dataLoading && <StoryCreateCard profile={fullProfile} />}
      {!dataLoading && <ProfileCompletionCard score={score} missingItems={missingItems} isIndependent={isIndependent} />}
      {!dataLoading && isIndependent && <BusinessSnapshotCard stats={stats} />}

      <Link href="/pro/parrainage" className="flex items-center gap-3 bg-white rounded-2xl border border-neutral-100 p-4 hover:border-neutral-200 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
          <Gift size={16} className="text-neutral-500" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-neutral-900">Parrainez, gagnez des récompenses</p>
          <p className="text-xs text-neutral-400 mt-0.5">Points, badge ambassadeur, CHAIR+ offert, mise en avant</p>
        </div>
        <ChevronRight size={16} className="text-neutral-300 flex-shrink-0" />
      </Link>

      {/* ── Actions rapides ── */}
      <div className="grid grid-cols-2 gap-2.5">
        <Link href="/pro/portfolio"
          className="bg-white rounded-2xl border border-neutral-100 p-4 flex flex-col items-center gap-2 hover:border-neutral-200 hover:shadow-sm transition-all text-center"
        >
          <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center">
            <Plus size={18} className="text-white" />
          </div>
          <p className="text-xs font-semibold text-neutral-700 leading-tight">Ajouter<br />réalisation</p>
        </Link>
        <Link href="/pro/profil"
          className="bg-white rounded-2xl border border-neutral-100 p-4 flex flex-col items-center gap-2 hover:border-neutral-200 hover:shadow-sm transition-all text-center"
        >
          <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center">
            <Pencil size={18} className="text-neutral-600" />
          </div>
          <p className="text-xs font-semibold text-neutral-700 leading-tight">Modifier<br />profil</p>
        </Link>
      </div>

      {/* ── Déconnexion mobile ── */}
      <div className="pb-2 md:hidden text-center">
        <button onClick={logout} className="text-xs text-neutral-300 hover:text-neutral-500 transition-colors py-2">
          <LogOut size={12} className="inline mr-1.5" />Se déconnecter
        </button>
      </div>

    </div>
  );
}
