'use client';

import { useState, useEffect } from 'react';
import DashboardNav from '@/components/layout/DashboardNav';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import StarRating from '@/components/ui/StarRating';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { appointments as apptApi, analytics as analyticsApi } from '@/lib/api';
import type { ApiStats, ApiAnalytics } from '@/lib/types';
import { TrendingUp, TrendingDown, Minus, Users, Heart, Star, Calendar, CheckCircle2,
         Clock, ImageIcon, Activity, Lightbulb, ArrowRight, Flame } from 'lucide-react';
import Link from 'next/link';

// ── Composant tendance ────────────────────────────────────────────────

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

// ── Carte stat avec tendance ─────────────────────────────────────────

function SmartStatCard({
  icon: Icon,
  label,
  value,
  context,
  trend,
  trendLabel,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  context?: string;
  trend?: { direction: 'up' | 'down' | 'stable'; pct: number };
  trendLabel?: string;
}) {
  return (
    <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-white border border-neutral-100 flex items-center justify-center">
            <Icon size={14} className="text-neutral-600" />
          </div>
          <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-neutral-400">{label}</p>
        </div>
        {trend && <Trend direction={trend.direction} pct={trend.pct} />}
      </div>
      <p className="text-3xl font-bold text-neutral-900 leading-none mb-1">{value}</p>
      {trendLabel && <p className="text-[11px] text-neutral-500 leading-snug">{trendLabel}</p>}
      {context && <p className="text-[11px] text-neutral-400 mt-1 leading-snug">{context}</p>}
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

export default function StatistiquesPage() {
  const { user, isLoading: authLoading } = useRequireAuth(['hairdresser']);
  const [stats, setStats]         = useState<ApiStats | null>(null);
  const [analyticsData, setAnalytics] = useState<ApiAnalytics | null>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      apptApi.getStats().catch(() => null),
      analyticsApi.get().catch(() => null),
    ]).then(([s, a]) => {
      setStats(s as ApiStats | null);
      setAnalytics(a as ApiAnalytics | null);
      setLoading(false);
    });
  }, [user]);

  if (authLoading) return null;

  const profile = user?.hairdresser_profile;
  const isIndependent = profile?.is_independent !== false;

  return (
    <div className="min-h-screen bg-white pb-28 md:pb-8">
      <DashboardNav />
      <div className="max-w-2xl mx-auto">
        <div className="px-4 pt-4">
          <DashboardPageHeader title="Statistiques" />
        </div>
        <div className="hidden md:block px-4 pt-6 pb-4 border-b border-neutral-100">
          <h1 className="text-xl font-bold text-neutral-900">Statistiques</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Votre activité analysée</p>
        </div>

        {loading ? (
          <div className="px-4 pt-5 grid grid-cols-2 gap-3">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-neutral-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="px-4 pt-5 space-y-7">

            {/* ── Recommandations ── */}
            {analyticsData && analyticsData.recommendations.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">
                  Opportunités
                </p>
                <div className="space-y-2">
                  {analyticsData.recommendations.map((rec, i) => (
                    <RecoCard key={i} rec={rec} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Contenu ── */}
            {analyticsData && (
              <div>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">
                  Contenu
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <SmartStatCard
                    icon={ImageIcon}
                    label="Réalisations"
                    value={stats?.posts_count ?? 0}
                    trend={analyticsData.posts.trend}
                    trendLabel={analyticsData.posts.this_week > 0
                      ? `${analyticsData.posts.this_week} publiée${analyticsData.posts.this_week > 1 ? 's' : ''} cette semaine`
                      : 'Aucune publication cette semaine'}
                    context={analyticsData.top_specialty
                      ? `"${analyticsData.top_specialty.name}" génère le plus d'engagement`
                      : undefined}
                  />
                  <SmartStatCard
                    icon={Users}
                    label="Abonnés"
                    value={analyticsData.followers.total}
                    trend={analyticsData.followers.trend}
                    trendLabel={analyticsData.followers.this_week > 0
                      ? `+${analyticsData.followers.this_week} cette semaine`
                      : 'Aucun nouvel abonné cette semaine'}
                    context={(stats?.followers_count ?? 0) >= 50 ? 'Profil très suivi' : 'Partagez votre profil pour en gagner'}
                  />
                </div>
              </div>
            )}

            {/* ── Avis ── */}
            {stats && (
              <div>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">
                  Avis
                </p>
                <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-5">
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
                      Les profils avec 5+ avis reçoivent 4× plus de demandes. Partagez votre lien d'avis.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── Rendez-vous ── */}
            {isIndependent && stats && analyticsData && (
              <div>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">
                  Rendez-vous
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <SmartStatCard
                    icon={Calendar}
                    label="Ce mois"
                    value={analyticsData.appointments.this_month}
                    trend={analyticsData.appointments.trend_month}
                    trendLabel={`vs ${analyticsData.appointments.last_month} le mois dernier`}
                  />
                  <SmartStatCard
                    icon={Clock}
                    label="En attente"
                    value={stats.appointments_pending}
                    context={stats.appointments_pending > 0 ? 'Répondez rapidement — les clients n\'attendent pas' : 'Aucune demande en attente'}
                  />
                  <SmartStatCard
                    icon={CheckCircle2}
                    label="Terminés"
                    value={stats.appointments_completed}
                    context={stats.appointments_completed >= 50 ? 'Excellent historique' : 'Total clients reçus'}
                  />
                  <SmartStatCard
                    icon={TrendingUp}
                    label="Chiffre d'affaires"
                    value={stats.revenue_estimate != null ? `${stats.revenue_estimate.toFixed(0)} €` : '—'}
                    context={stats.revenue_estimate != null ? 'Estimation basée sur vos tarifs' : 'Renseignez vos tarifs'}
                  />
                </div>
              </div>
            )}

            {/* ── Favoris & Visites ── */}
            {stats && (
              <div>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">
                  Visibilité
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <SmartStatCard
                    icon={Heart}
                    label="Favoris"
                    value={stats.saved_count}
                    context={stats.saved_count >= 20 ? 'Très attractif' : 'Clients qui vous gardent en tête'}
                  />
                  <SmartStatCard
                    icon={Activity}
                    label="Visites profil"
                    value={stats.visits_count ?? 0}
                    context={(stats.visits_count ?? 0) >= 100 ? 'Profil très consulté' : 'Visibilité en démarrage'}
                  />
                </div>
              </div>
            )}

            <p className="text-[11px] text-neutral-400 text-center pb-2">
              Données mises à jour en temps réel.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
