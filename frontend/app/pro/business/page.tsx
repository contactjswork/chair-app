'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import StarRating from '@/components/ui/StarRating';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { appointments as apptApi, analytics as analyticsApi, api } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/types';
import type {
  ApiStats, ApiAppointment, ApiAnalytics, ApiAnalyticsTimeseries,
  ApiNextBadge, ApiHairdresserProfile,
} from '@/lib/types';
import { BadgeMedallion } from '@/components/ui/ChairBadges';
import { PremiumLockCard } from '@/components/ui/PremiumLock';
import {
  Users, Star, Eye, Bookmark, Euro, Percent, TrendingUp, TrendingDown, Minus,
  Crown, ChevronRight, Calendar, CheckCircle2, Clock, ImageIcon, Lightbulb, ArrowRight,
  Medal, Scissors, MessageSquare, UserPlus, Heart,
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
    <div className="bg-white rounded-[22px] shadow-[0_4px_16px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-50 p-4">
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

// ── Mini graphique en barres — pas de librairie externe, SVG brut ──────

const CHART_METRICS = [
  { key: 'appointments' as const, label: 'Rendez-vous', color: '#171717' },
  { key: 'posts'        as const, label: 'Publications', color: '#a3a3a3' },
  { key: 'followers'    as const, label: 'Abonnés',      color: '#f59e0b' },
];

// Réservé CHAIR+ — backend ne calcule visits/conversion que si is_premium
// (voir AnalyticsController::timeseries). Ajoutés aux boutons du graphique
// existant uniquement pour les profils premium, jamais affichés/cliquables
// pour les autres (pas de données à montrer).
const PREMIUM_CHART_METRICS = [
  { key: 'visits'     as const, label: 'Vues réelles', color: '#0ea5e9' },
  { key: 'conversion' as const, label: 'Conversion',   color: '#10b981' },
];

function MiniBarChart({ data, labels, period, unit }: { data: number[]; labels: string[]; period: '7d' | '30d' | '90d' | '12mo'; unit?: string }) {
  const max = Math.max(1, ...data);
  const showEvery = period === '90d' ? 10 : period === '30d' ? 5 : period === '12mo' ? 1 : 1;
  return (
    <div className="flex items-end gap-[3px] h-24">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div className="w-full flex items-end justify-center" style={{ height: 72 }}>
            <div
              className="w-full max-w-[14px] rounded-t bg-neutral-900 transition-all"
              style={{ height: `${Math.max(2, (v / max) * 72)}px`, opacity: v === 0 ? 0.15 : 1 }}
              title={`${labels[i]} : ${v}${unit ?? ''}`}
            />
          </div>
          {i % showEvery === 0 && (
            <span className="text-[8px] text-neutral-300 truncate max-w-full">
              {period === '12mo' ? labels[i].slice(5) : labels[i].slice(8)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function PerformancePage() {
  const { user, isLoading: authLoading } = useRequireAuth(['hairdresser']);
  const [stats,        setStats]        = useState<ApiStats | null>(null);
  const [analyticsData, setAnalytics]   = useState<ApiAnalytics | null>(null);
  const [appointments, setAppointments] = useState<ApiAppointment[]>([]);
  const [nextBadges,   setNextBadges]   = useState<ApiNextBadge[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [chartPeriod,  setChartPeriod]  = useState<'7d' | '30d' | '90d' | '12mo'>('7d');
  const [chartMetric,  setChartMetric]  = useState<typeof CHART_METRICS[number]['key'] | typeof PREMIUM_CHART_METRICS[number]['key']>('appointments');
  const [timeseries,   setTimeseries]   = useState<ApiAnalyticsTimeseries | null>(null);
  const [chartLoading, setChartLoading] = useState(true);

  const isIndependent = user?.hairdresser_profile?.is_independent !== false;

  useEffect(() => {
    if (!user) return;
    Promise.allSettled([
      apptApi.getStats(),
      analyticsApi.get(),
      isIndependent ? apptApi.list() : Promise.resolve([]),
      api.get<ApiHairdresserProfile & { next_badges?: ApiNextBadge[] }>('/profile'),
    ]).then(([st, an, apts, prof]) => {
      if (st.status === 'fulfilled') setStats(st.value);
      if (an.status === 'fulfilled') setAnalytics(an.value);
      if (apts.status === 'fulfilled' && Array.isArray(apts.value)) setAppointments(apts.value as ApiAppointment[]);
      if (prof.status === 'fulfilled' && prof.value.next_badges) {
        setNextBadges(prof.value.next_badges);
      }
    }).finally(() => setLoading(false));
  }, [user, isIndependent]);

  useEffect(() => {
    if (!user) return;
    analyticsApi.timeseries(chartPeriod).then(setTimeseries).catch(() => {}).finally(() => setChartLoading(false));
  }, [user, chartPeriod]);

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

            {/* Un écran nommé « Performance » ouvre sur les chiffres.
                Le niveau et l objectif vivent sur la page Badges — les
                redire ici coûtait un écran de scroll avant la première
                information neuve. */}
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
                {/* Compteur cumulé réel (table profile_views), plus l'ancien
                    "Visites profil" qui affichait en fait des RDV terminés
                    (hairdresser_profiles.visits_count) — voir ApiStats.visits_count. */}
                <StatCard icon={Eye} label="Vues du profil" value={stats?.profile_views_count ?? 0} />
                <StatCard icon={Bookmark} label="Favoris" value={stats?.saved_count ?? 0} />
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

            {/* ── Graphiques ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">Évolution</p>
                <div className="flex items-center gap-1 bg-neutral-100 rounded-full p-0.5">
                  {(analyticsData?.is_premium ? (['7d', '30d', '90d', '12mo'] as const) : (['7d', '30d', '12mo'] as const)).map((p) => (
                    <button key={p} onClick={() => { setChartPeriod(p); setChartLoading(true); }}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors ${
                        chartPeriod === p ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'
                      }`}>
                      {p === '7d' ? '7j' : p === '30d' ? '30j' : p === '90d' ? '90j' : '12mois'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-[22px] shadow-[0_4px_16px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-50 p-4">
                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  {CHART_METRICS.map((m) => (
                    <button key={m.key} onClick={() => setChartMetric(m.key)}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                        chartMetric === m.key ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-500 border-neutral-200'
                      }`}>
                      {m.label}
                    </button>
                  ))}
                  {/* Réservé CHAIR+ — timeseries.visits/conversion ne sont
                      présents que si is_premium (voir AnalyticsController::timeseries). */}
                  {analyticsData?.is_premium && PREMIUM_CHART_METRICS.map((m) => (
                    <button key={m.key} onClick={() => setChartMetric(m.key)}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                        chartMetric === m.key ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-500 border-neutral-200'
                      }`}>
                      {m.label}
                    </button>
                  ))}
                </div>
                {chartLoading || !timeseries ? (
                  <div className="h-24 bg-neutral-50 rounded-xl animate-pulse" />
                ) : (
                  <MiniBarChart
                    data={(timeseries[chartMetric as keyof ApiAnalyticsTimeseries] as number[] | undefined) ?? []}
                    labels={timeseries.labels}
                    period={chartPeriod}
                    unit={chartMetric === 'conversion' ? '%' : undefined}
                  />
                )}
              </div>
              {analyticsData && !analyticsData.is_premium && (
                <div className="mt-3">
                  <PremiumLockCard
                    title="Vues réelles & conversion"
                    subtitle="Visites du profil (pas seulement les RDV) et taux de conversion en rendez-vous, jusqu'à 90 jours d'historique."
                    compact
                  />
                </div>
              )}
            </section>

            {/* ── Analytics avancées (CHAIR+) ── */}
            {analyticsData && (
              <section>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">Analytics avancées</p>
                {analyticsData.is_premium ? (
                  <div className="space-y-3">
                    {(analyticsData.premium?.top_services.length ?? 0) > 0 && (
                      <div className="bg-white rounded-[22px] shadow-[0_4px_16px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-50 p-4">
                        <p className="text-[13px] font-bold text-neutral-900 mb-3">Services les plus réservés</p>
                        <div className="space-y-2">
                          {analyticsData.premium!.top_services.map((s, i) => (
                            <div key={s.id} className="flex items-center gap-3">
                              <span className="text-[11px] font-bold text-neutral-500 w-4 flex-shrink-0">{i + 1}</span>
                              <p className="flex-1 text-[13px] font-medium text-neutral-800 truncate">{s.name}</p>
                              <span className="text-[11px] text-neutral-400 flex-shrink-0">{s.bookings_count} RDV</span>
                              <span className="text-[12px] font-semibold text-neutral-900 flex-shrink-0">{s.revenue.toFixed(0)}€</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(analyticsData.premium?.top_posts.length ?? 0) > 0 && (
                      <div className="bg-white rounded-[22px] shadow-[0_4px_16px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-50 p-4">
                        <p className="text-[13px] font-bold text-neutral-900 mb-3">Réalisations les plus performantes</p>
                        <div className="flex gap-2 overflow-x-auto -mx-1 px-1">
                          {analyticsData.premium!.top_posts.map((p) => (
                            <Link key={p.id} href="/pro/portfolio" className="flex-shrink-0 w-[72px]">
                              <div className="relative w-[72px] h-[72px] rounded-xl overflow-hidden bg-neutral-100">
                                {p.cover_image && (
                                  <Image src={resolveMediaUrl(p.cover_image)!} alt="" fill className="object-cover" sizes="72px" />
                                )}
                              </div>
                              <p className="text-[9px] text-neutral-400 mt-1 text-center">{p.score} pts</p>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {((analyticsData.premium?.best_times.by_day.length ?? 0) > 0 || (analyticsData.premium?.best_times.by_hour.length ?? 0) > 0) && (
                      <div className="bg-white rounded-[22px] shadow-[0_4px_16px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-50 p-4">
                        <p className="text-[13px] font-bold text-neutral-900 mb-3">Meilleurs jours &amp; heures</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide mb-2">Jours</p>
                            <div className="space-y-1.5">
                              {analyticsData.premium!.best_times.by_day.slice(0, 3).map((d) => (
                                <div key={d.day} className="flex items-center justify-between text-[12px]">
                                  <span className="text-neutral-700">{d.day}</span>
                                  <span className="font-semibold text-neutral-900">{d.count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide mb-2">Heures</p>
                            <div className="space-y-1.5">
                              {analyticsData.premium!.best_times.by_hour.slice(0, 3).map((h) => (
                                <div key={h.hour} className="flex items-center justify-between text-[12px]">
                                  <span className="text-neutral-700">{h.hour}h</span>
                                  <span className="font-semibold text-neutral-900">{h.count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <StatCard icon={Heart} label="Favoris cette semaine" value={analyticsData.premium?.saved_growth.this_week ?? 0}
                      trend={analyticsData.premium?.saved_growth.trend}
                      context={`${analyticsData.premium?.saved_growth.total ?? 0} au total`} />

                    {!analyticsData.premium?.top_services.length && !analyticsData.premium?.top_posts.length
                      && !analyticsData.premium?.best_times.by_day.length && (
                      <p className="text-[12px] text-neutral-400 text-center py-2">Pas encore assez de données pour ces analyses.</p>
                    )}
                  </div>
                ) : (
                  <PremiumLockCard
                    title="Analytics avancées"
                    subtitle="Services les plus réservés, réalisations qui marchent le mieux, meilleurs jours/heures et croissance des favoris."
                  />
                )}
              </section>
            )}

            {/* ── Revenus (indépendants) ── */}
            {isIndependent && (
              <section>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">Revenus</p>
                {caYear === 0 ? (
                  <div className="bg-white rounded-[22px] shadow-[0_4px_16px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-50 px-5 py-6 text-center">
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
                      <div className="bg-white rounded-[22px] shadow-[0_4px_16px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-50 p-4">
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
                <div className="bg-white shadow-[0_4px_18px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-50 rounded-[24px] p-5">
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
                      Générez votre QR d&apos;avis vérifié pour récolter vos premiers retours clients.
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* ── Objectifs de la semaine ── */}
            {analyticsData && (
              <section>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">Objectifs de la semaine</p>
                <div className="bg-white rounded-[22px] shadow-[0_4px_16px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-50 divide-y divide-neutral-50">
                  {[
                    { icon: ImageIcon, label: 'Publier 1 réalisation', done: analyticsData.posts.this_week >= 1, progress: `${Math.min(analyticsData.posts.this_week, 1)}/1` },
                    { icon: MessageSquare, label: 'Obtenir 1 nouvel avis ce mois', done: analyticsData.reviews.this_month >= 1, progress: `${Math.min(analyticsData.reviews.this_month, 1)}/1` },
                    { icon: UserPlus, label: 'Gagner 3 abonnés', done: analyticsData.followers.this_week >= 3, progress: `${Math.min(analyticsData.followers.this_week, 3)}/3` },
                    ...(isIndependent ? [{ icon: Calendar, label: 'Réaliser 3 rendez-vous', done: analyticsData.appointments.this_week >= 3, progress: `${Math.min(analyticsData.appointments.this_week, 3)}/3` }] : []),
                  ].map(({ icon: Icon, label, done, progress }) => (
                    <div key={label} className="flex items-center gap-3 px-4 py-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-green-500' : 'bg-neutral-100'}`}>
                        {done ? <CheckCircle2 size={14} className="text-white" /> : <Icon size={13} className="text-neutral-400" />}
                      </div>
                      <p className={`flex-1 text-[13px] font-medium ${done ? 'text-neutral-400 line-through' : 'text-neutral-800'}`}>{label}</p>
                      <span className="text-[11px] font-bold text-neutral-500 flex-shrink-0">{progress}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Classements ── */}
            <section>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">Classements</p>
              <Link href="/pro/classements"
                className="flex items-center gap-4 bg-white rounded-[22px] shadow-[0_4px_16px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-50 p-4 hover:shadow-[0_8px_22px_-8px_rgba(10,10,10,0.16)] transition-all group">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                  <Medal size={17} className="text-neutral-600" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-neutral-900">Voir mon classement</p>
                  <p className="text-xs text-neutral-400 mt-0.5">Par ville, région, spécialité — face aux autres coiffeurs CHAIR</p>
                </div>
                <ChevronRight size={14} className="text-neutral-300 group-hover:text-neutral-700 flex-shrink-0" />
              </Link>
            </section>

            {/* ── Badges proches ── */}
            {nextBadges.length > 0 && (
              <section>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">Badges proches</p>
                <div className="space-y-2">
                  {nextBadges.slice(0, 3).map((b) => (
                    <Link
                      key={b.type === 'badge' ? b.code : `sp-${b.specialty_id}`}
                      href="/pro/badges"
                      className="flex items-center gap-3 bg-white shadow-[0_3px_14px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-50 rounded-[20px] p-3.5 hover:shadow-[0_6px_18px_-8px_rgba(10,10,10,0.16)] transition-colors"
                    >
                      {b.type === 'badge' ? (
                        <BadgeMedallion code={b.code} tier={b.tier} size={36} locked />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0">
                          <Scissors size={15} className="text-neutral-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-neutral-900 truncate">{b.type === 'badge' ? b.name : b.name}</p>
                        {b.type === 'badge' ? (
                          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden mt-1.5">
                            <div className="h-full bg-neutral-900 rounded-full" style={{ width: `${b.pct}%` }} />
                          </div>
                        ) : (
                          <p className="text-[11px] text-neutral-400 truncate">{b.label}</p>
                        )}
                      </div>
                      {b.type === 'badge' && <span className="text-[10px] font-bold text-neutral-400 flex-shrink-0">{b.current}/{b.target}</span>}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* ── Progression ── */}
            <section>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">Progression</p>
              <Link href="/pro/badges"
                className="flex items-center gap-4 bg-white rounded-[22px] shadow-[0_4px_16px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-50 p-4 hover:shadow-[0_8px_22px_-8px_rgba(10,10,10,0.16)] transition-all group">
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
