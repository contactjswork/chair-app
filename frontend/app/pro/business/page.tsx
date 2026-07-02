'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api, appointments as apptApi } from '@/lib/api';
import type { ApiStats, ApiAppointment } from '@/lib/types';
import {
  Users, Star, Eye, Bookmark, Euro, Percent, TrendingUp,
  Crown, ChevronRight, Briefcase, Armchair, Mail, BarChart2,
} from 'lucide-react';
import DashboardNav from '@/components/layout/DashboardNav';

export default function BusinessPage() {
  const { user, isLoading: authLoading } = useRequireAuth(['hairdresser']);
  const [stats,        setStats]        = useState<ApiStats | null>(null);
  const [appointments, setAppointments] = useState<ApiAppointment[]>([]);
  const [loading,      setLoading]      = useState(true);

  const isIndependent = user?.hairdresser_profile?.is_independent !== false;

  useEffect(() => {
    if (!user) return;
    const requests: Promise<unknown>[] = [apptApi.getStats()];
    if (isIndependent) requests.push(apptApi.list());

    Promise.allSettled(requests).then(([st, apts]) => {
      if (st.status === 'fulfilled') setStats(st.value as ApiStats);
      if (apts?.status === 'fulfilled' && Array.isArray(apts.value)) {
        setAppointments(apts.value as ApiAppointment[]);
      }
    }).finally(() => setLoading(false));
  }, [user, isIndependent]);

  if (authLoading || !user) {
    return <div className="min-h-screen bg-white flex items-center justify-center"><div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" /></div>;
  }

  // Revenus
  const now       = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisYear  = String(now.getFullYear());

  const doneMonth = appointments.filter((a) => a.status === 'completed' && (a.appointment_date ?? '').startsWith(thisMonth));
  const doneYear  = appointments.filter((a) => a.status === 'completed' && (a.appointment_date ?? '').startsWith(thisYear));
  const caMonth   = doneMonth.reduce((s, a) => s + (parseFloat(String(a.price ?? 0)) || 0), 0);
  const caYear    = doneYear.reduce((s, a) => s + (parseFloat(String(a.price ?? 0)) || 0), 0);

  // Taux remplissage
  const totalMonth = appointments.filter((a) => (a.appointment_date ?? '').startsWith(thisMonth) && !['cancelled', 'declined'].includes(a.status));
  const confirmedMonth = totalMonth.filter((a) => ['confirmed', 'completed'].includes(a.status));
  const fillRate = totalMonth.length > 0 ? Math.round((confirmedMonth.length / totalMonth.length) * 100) : null;

  const Skeleton = () => <div className="h-20 bg-neutral-100 rounded-2xl animate-pulse" />;

  return (
    <div className="min-h-screen bg-neutral-50 pb-28">
      <DashboardNav />

      {/* Header mobile */}
      <div className="md:hidden sticky top-0 z-20 bg-white border-b border-neutral-100 px-4 h-14 flex items-center justify-between">
        <span className="text-base font-bold text-neutral-900">Business</span>
      </div>
      {/* Header desktop */}
      <header className="hidden md:flex sticky top-0 z-10 bg-white border-b border-neutral-100 px-8 h-14 items-center">
        <span className="text-sm font-bold text-neutral-900">Business</span>
      </header>

      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-6 space-y-8">

        {/* ── 1. AUDIENCE ── */}
        <section>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-neutral-400 mb-3">Audience</p>
          {loading ? (
            <div className="grid grid-cols-2 gap-3"><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Users,    label: 'Abonnés',       value: stats?.followers_count ?? 0 },
                { icon: Star,     label: 'Avis clients',  value: stats?.reviews_count ?? 0 },
                { icon: Eye,      label: 'Visites profil', value: stats?.visits_count ?? 0 },
                { icon: Bookmark, label: 'Enregistrements', value: stats?.saved_count ?? 0 },
              ].map(({ icon: Icon, label, value }) => (
                <Link key={label} href="/pro/statistiques"
                  className="bg-white rounded-2xl border border-neutral-100 p-4 hover:border-neutral-200 hover:shadow-sm transition-all">
                  <Icon size={15} className="text-neutral-400 mb-3" strokeWidth={1.5} />
                  <p className="text-2xl font-bold text-neutral-900 leading-none">{value}</p>
                  <p className="text-xs font-medium text-neutral-500 mt-1">{label}</p>
                </Link>
              ))}
            </div>
          )}
          <Link href="/pro/statistiques"
            className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-neutral-700 transition-colors mt-3">
            <BarChart2 size={12} />Statistiques complètes et recommandations
            <ChevronRight size={11} />
          </Link>
        </section>

        {/* ── 2. REVENUS (indépendants) ── */}
        {isIndependent && (
          <section>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-neutral-400 mb-3">Revenus</p>
            {loading ? (
              <div className="grid grid-cols-2 gap-3"><Skeleton /><Skeleton /></div>
            ) : caYear === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-100 px-5 py-6 text-center">
                <Euro size={22} className="text-neutral-200 mx-auto mb-2" />
                <p className="text-sm font-semibold text-neutral-700">Aucun revenu enregistré</p>
                <p className="text-xs text-neutral-400 mt-1">Vos revenus apparaissent dès qu'une réservation est terminée.</p>
                <Link href="/pro/reservations" className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900 mt-3">
                  Gérer mes réservations <ChevronRight size={11} />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-2xl border border-neutral-100 p-4">
                    <Euro size={15} className="text-neutral-400 mb-3" strokeWidth={1.5} />
                    <p className="text-2xl font-bold text-neutral-900 leading-none">{caMonth.toFixed(0)}€</p>
                    <p className="text-xs font-medium text-neutral-500 mt-1">Ce mois</p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">{doneMonth.length} RDV terminés</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-neutral-100 p-4">
                    <TrendingUp size={15} className="text-neutral-400 mb-3" strokeWidth={1.5} />
                    <p className="text-2xl font-bold text-neutral-900 leading-none">{caYear.toFixed(0)}€</p>
                    <p className="text-xs font-medium text-neutral-500 mt-1">Cette année</p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">{doneYear.length} RDV terminés</p>
                  </div>
                </div>
                {fillRate !== null && (
                  <div className="bg-white rounded-2xl border border-neutral-100 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Percent size={14} className="text-neutral-400" />
                        <p className="text-sm font-semibold text-neutral-900">Taux de remplissage</p>
                      </div>
                      <span className={`text-sm font-bold ${fillRate >= 70 ? 'text-green-600' : fillRate >= 40 ? 'text-amber-600' : 'text-neutral-500'}`}>
                        {fillRate}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${fillRate >= 70 ? 'bg-green-500' : fillRate >= 40 ? 'bg-amber-400' : 'bg-neutral-300'}`}
                        style={{ width: `${fillRate}%` }} />
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-1.5">{confirmedMonth.length} confirmés sur {totalMonth.length} ce mois</p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ── 3. PROGRESSION ── */}
        <section>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-neutral-400 mb-3">Progression</p>
          <div className="space-y-2">
            <Link href="/pro/badges"
              className="flex items-center gap-4 bg-white rounded-2xl border border-neutral-100 p-4 hover:border-neutral-200 hover:shadow-sm transition-all group">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Crown size={17} className="text-amber-600" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-neutral-900">Mes badges</p>
                <p className="text-xs text-neutral-400 mt-0.5">Niveau, récompenses et objectifs CHAIR</p>
              </div>
              <ChevronRight size={14} className="text-neutral-300 group-hover:text-neutral-700 flex-shrink-0" />
            </Link>
            <Link href="/pro/statistiques"
              className="flex items-center gap-4 bg-white rounded-2xl border border-neutral-100 p-4 hover:border-neutral-200 hover:shadow-sm transition-all group">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                <BarChart2 size={17} className="text-neutral-600" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-neutral-900">Statistiques</p>
                <p className="text-xs text-neutral-400 mt-0.5">Analyses, tendances et recommandations</p>
              </div>
              <ChevronRight size={14} className="text-neutral-300 group-hover:text-neutral-700 flex-shrink-0" />
            </Link>
          </div>
        </section>

        {/* ── 4. OPPORTUNITÉS ── */}
        <section>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-neutral-400 mb-3">Opportunités</p>
          <div className="space-y-2">
            <Link href="/pro/offres-emploi"
              className="flex items-center gap-4 bg-white rounded-2xl border border-neutral-100 p-4 hover:border-neutral-200 hover:shadow-sm transition-all group">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Briefcase size={17} className="text-blue-600" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-neutral-900">Offres d'emploi</p>
                <p className="text-xs text-neutral-400 mt-0.5">Parcourez les offres et postulez</p>
              </div>
              <ChevronRight size={14} className="text-neutral-300 group-hover:text-neutral-700 flex-shrink-0" />
            </Link>
            {isIndependent && (
              <Link href="/pro/fauteuils-a-louer"
                className="flex items-center gap-4 bg-white rounded-2xl border border-neutral-100 p-4 hover:border-neutral-200 hover:shadow-sm transition-all group">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                  <Armchair size={17} className="text-neutral-600" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-neutral-900">Fauteuils à louer</p>
                  <p className="text-xs text-neutral-400 mt-0.5">Trouvez un espace dans un salon</p>
                </div>
                <ChevronRight size={14} className="text-neutral-300 group-hover:text-neutral-700 flex-shrink-0" />
              </Link>
            )}
            {isIndependent && (
              <Link href="/pro/invitations"
                className="flex items-center gap-4 bg-white rounded-2xl border border-neutral-100 p-4 hover:border-neutral-200 hover:shadow-sm transition-all group">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                  <Mail size={17} className="text-green-600" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-neutral-900">Invitations de salons</p>
                  <p className="text-xs text-neutral-400 mt-0.5">Répondez aux invitations reçues</p>
                </div>
                <ChevronRight size={14} className="text-neutral-300 group-hover:text-neutral-700 flex-shrink-0" />
              </Link>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
