'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import StarRating from '@/components/ui/StarRating';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { appointments as apptApi, analytics as analyticsApi } from '@/lib/api';
import type { ApiStats, ApiAppointment, ApiAnalytics } from '@/lib/types';
import {
  Users, Star, Eye, Bookmark, Euro, Percent, TrendingUp, TrendingDown, Minus,
  Crown, ChevronRight, Calendar, CheckCircle2, Clock, ImageIcon, Lightbulb, ArrowRight,
} from 'lucide-react';

// ── Tendance ──────────────────────────────────────────────────────────

function Trend({ direction, pct }: { direction: 'up' | 'down' | 'stable'; pct: number }) {
  if (direction === 'stable' || pct === 0) {
    return <span className="inline-flex items-center gap-0.5 text-[11px] text-neutral-400"><Minus size={10} /> Stable</span>;
  }
  if (direction === 'up') {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-green-600">
        <TrendingUp size={11} /> +{pct}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-red-500">
      <TrendingDown size={11} /> -{pct}%
    </span>
  );
}

// ── Carte stat ────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, context, trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  context?: string;
  trend?: { direction: 'up' | 'down' | 'stable'; pct: number };
}) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <Icon size={15} className="text-neutral-400" strokeWidth={1.5} />
        {trend && <Trend direction={trend.direction} pct={trend.pct} />}
      </div>
      <p className="text-2xl font-bold text-neutral-900 leading-none">{value}</p>
      <p className="text-xs font-medium text-neutral-500 mt-1">{label}</p>
      {context && <p className="text-[10px] text-neutral-400 mt-0.5 leading-snug">{context}</p>}
    </div>
  );
}

// ── Carte recommandation ─────────────────────────────────────────────

const URGENCY_STYLE: Record<string, string> = {
  high:   'border-l-red-400 bg-red-50/60',
  medium: 'border-l-amber-400 bg-amber-50/40',
  low:    'border-l-neutral-300 bg-neutral-50',
};

function RecoCard({ rec }: { rec: ApiAnalytics['recommendations'][0] }) {
  return (
    <Link
      href={rec.href}
      className={`flex items-start gap-3 border-l-2 rounded-r-xl px-4 py-3 ${URGENCY_STYLE[rec.urgency] ?? URGENCY_STYLE.low} hover:opacity-80 transition-opacity`}
    >
      <Lightbulb size={15} className="text-neutral-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-neutral-900 leading-tight">{rec.title}</p>
        <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">{rec.desc}</p>
      </div>
      <ArrowRight size={14} className="text-neutral-400 mt-0.5 flex-shrink-0" />
    </Link>
  );
}

export default function PerformancePage() {
  const { user, isLoading: authLoading } = useRequireAuth(['hairdresser']);
  const [stats,        setStats]        = useState<ApiStats | null>(null);
  const [analyticsData, setAnalytics]   = useState<ApiAnalytics | null>(null);
  const [appointments, setAppointments] = useState<ApiAppointment[]>([]);
  const [loading,      setLoading]      = useState(true);

  const isIndependent = user?.hairdresser_profile?.is_independent !== false;

  useEffect(() => {
    if (!user) return;
    Promise.allSettled([
      apptApi.getStats(),
      analyticsApi.get(),
      isIndependent ? apptApi.list() : Promise.resolve([]),
    ]).then(([st, an, apts]) => {
      if (st.status === 'fulfilled') setStats(st.value);
      if (an.status === 'fulfilled') setAnalytics(an.value);
      if (apts.status === 'fulfilled' && Array.isArray(apts.value)) setAppointments(apts.value as ApiAppointment[]);
    }).finally(() => setLoading(false));
  }, [user, isIndependent]);

  if (authLoading || !user) {
    return <div className="min-h-screen bg-white flex items-center justify-center"><div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" /></div>;
  }

  // Revenus (indépendant)
  const now       = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisYear  = String(now.getFullYear());
  const doneMonth = appointments.filter((a) => a.status === 'completed' && (a.appointment_date ?? '').startsWith(thisMonth));
  const doneYear  = appointments.filter((a) => a.status === 'completed' && (a.appointment_date ?? '').startsWith(thisYear));
  const caMonth   = doneMonth.reduce((s, a) => s + (parseFloat(String(a.price ?? 0)) || 0), 0);
  const caYear    = doneYear.reduce((s, a) => s + (parseFloat(String(a.price ?? 0)) || 0), 0);
  const totalMonth = appointments.filter((a) => (a.appointment_date ?? '').startsWith(thisMonth) && !['cancelled', 'declined'].includes(a.status));
  const confirmedMonth = totalMonth.filter((a) => ['confirmed', 'completed'].includes(a.status));
  const fillRate = totalMonth.length > 0 ? Math.round((confirmedMonth.length / totalMonth.length) * 100) : null;

  return (
    <div className="min-h-screen bg-neutral-50 pb-6">
      <div className="max-w-2xl mx-auto">
        <div className="px-4 pt-4">
          <DashboardPageHeader title="Performance" />
        </div>
        <div className="hidden md:block px-4 pt-2 pb-4">
          <p className="text-sm text-neutral-500">Votre activité, votre audience, ce qui marche.</p>
        </div>

        {loading ? (
          <div className="px-4 pt-2 grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl bg-neutral-100 animate-pulse" />)}
          </div>
        ) : (
          <div className="px-4 pt-2 space-y-7">

            {/* ── Recommandations ── */}
            {analyticsData && analyticsData.recommendations.length > 0 && (
              <section>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">Opportunités</p>
                <div className="space-y-2">
                  {analyticsData.recommendations.map((rec, i) => <RecoCard key={i} rec={rec} />)}
                </div>
              </section>
            )}

            {/* ── Audience ── */}
            <section>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">Audience</p>
              <div className="grid grid-cols-2 gap-3">
                <StatCard icon={Users} label="Abonnés" value={analyticsData?.followers.total ?? stats?.followers_count ?? 0}
                  trend={analyticsData?.followers.trend}
                  context={analyticsData && analyticsData.followers.this_week > 0 ? `+${analyticsData.followers.this_week} cette semaine` : undefined} />
                <StatCard icon={Star} label="Avis clients" value={stats?.reviews_count ?? 0} />
                <StatCard icon={Eye} label="Visites profil" value={stats?.visits_count ?? 0}
                  context={(stats?.visits_count ?? 0) >= 100 ? 'Profil très consulté' : undefined} />
                <StatCard icon={Bookmark} label="Favoris" value={stats?.saved_count ?? 0}
                  context={(stats?.saved_count ?? 0) >= 20 ? 'Très attractif' : undefined} />
              </div>
              {analyticsData?.top_specialty && (
                <p className="text-xs text-neutral-400 mt-3">
                  <span className="font-semibold text-neutral-600">{analyticsData.top_specialty.name}</span> génère le plus d&apos;engagement
                </p>
              )}
            </section>

            {/* ── Contenu ── */}
            {analyticsData && (
              <section>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">Contenu</p>
                <StatCard icon={ImageIcon} label="Réalisations" value={stats?.posts_count ?? 0}
                  trend={analyticsData.posts.trend}
                  context={analyticsData.posts.this_week > 0
                    ? `${analyticsData.posts.this_week} publiée${analyticsData.posts.this_week > 1 ? 's' : ''} cette semaine`
                    : 'Aucune publication cette semaine'} />
              </section>
            )}

            {/* ── Revenus (indépendants) ── */}
            {isIndependent && (
              <section>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">Revenus</p>
                {caYear === 0 ? (
                  <div className="bg-white rounded-2xl border border-neutral-100 px-5 py-6 text-center">
                    <Euro size={22} className="text-neutral-200 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-neutral-700">Aucun revenu enregistré</p>
                    <p className="text-xs text-neutral-400 mt-1">Vos revenus apparaissent dès qu&apos;une réservation est terminée.</p>
                    <Link href="/pro/reservations" className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900 mt-3">
                      Gérer mes réservations <ChevronRight size={11} />
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <StatCard icon={Euro} label="Ce mois" value={`${caMonth.toFixed(0)}€`} context={`${doneMonth.length} RDV terminés`} />
                      <StatCard icon={TrendingUp} label="Cette année" value={`${caYear.toFixed(0)}€`} context={`${doneYear.length} RDV terminés`} />
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

            {/* ── Rendez-vous (indépendants) ── */}
            {isIndependent && stats && analyticsData && (
              <section>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">Rendez-vous</p>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={Calendar} label="Ce mois" value={analyticsData.appointments.this_month}
                    trend={analyticsData.appointments.trend_month} context={`vs ${analyticsData.appointments.last_month} le mois dernier`} />
                  <StatCard icon={Clock} label="En attente" value={stats.appointments_pending}
                    context={stats.appointments_pending > 0 ? 'Répondez rapidement' : 'Aucune demande'} />
                  <StatCard icon={CheckCircle2} label="Terminés" value={stats.appointments_completed} />
                </div>
              </section>
            )}

            {/* ── Avis ── */}
            {stats && (
              <section>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">Avis</p>
                <div className="bg-white border border-neutral-100 rounded-2xl p-5">
                  <div className="flex items-start gap-5">
                    <div className="text-center flex-shrink-0">
                      <p className="text-4xl font-bold text-neutral-900 leading-none">
                        {stats.reviews_count > 0 ? parseFloat(stats.avg_rating).toFixed(1) : '—'}
                      </p>
                      {stats.reviews_count > 0 && <StarRating rating={parseFloat(stats.avg_rating)} size={12} />}
                      <p className="text-[11px] text-neutral-400 mt-1.5">{stats.reviews_count} avis</p>
                    </div>
                    {stats.reviews_count > 0 && stats.review_breakdown && (
                      <div className="flex-1 space-y-1.5">
                        {[5, 4, 3, 2, 1].map((star) => {
                          const count = stats.review_breakdown?.[star] ?? 0;
                          const pct = stats.reviews_count > 0 ? Math.round((count / stats.reviews_count) * 100) : 0;
                          return (
                            <div key={star} className="flex items-center gap-2">
                              <span className="text-[11px] font-medium text-neutral-500 w-3 text-right flex-shrink-0">{star}</span>
                              <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                                <div className="h-full bg-neutral-900 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[11px] text-neutral-400 w-4 text-right flex-shrink-0">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {analyticsData && analyticsData.reviews.this_month > 0 && (
                    <p className="text-[11px] text-green-700 font-medium mt-3 pt-3 border-t border-neutral-100">
                      +{analyticsData.reviews.this_month} avis ce mois
                    </p>
                  )}
                  {stats.reviews_count === 0 && (
                    <p className="text-[12px] text-neutral-400 mt-3 pt-3 border-t border-neutral-100 leading-relaxed">
                      Les profils avec 5+ avis reçoivent 4× plus de demandes. Partagez votre lien d&apos;avis.
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* ── Progression ── */}
            <section>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">Progression</p>
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
            </section>

            <p className="text-[11px] text-neutral-400 text-center pb-2">Données mises à jour en temps réel.</p>
          </div>
        )}
      </div>
    </div>
  );
}
