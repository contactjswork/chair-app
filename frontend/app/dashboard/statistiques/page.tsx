'use client';

import { useState, useEffect } from 'react';
import DashboardNav from '@/components/layout/DashboardNav';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import StarRating from '@/components/ui/StarRating';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { appointments as apptApi } from '@/lib/api';
import type { ApiStats } from '@/lib/types';
import { Users, Heart, Star, Calendar, CheckCircle2, Clock, ImageIcon, TrendingUp, Activity } from 'lucide-react';

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-white border border-neutral-100 flex items-center justify-center">
          <Icon size={15} className="text-neutral-600" />
        </div>
        <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-neutral-400">{label}</p>
      </div>
      <p className="text-3xl font-bold text-neutral-900 leading-none mb-0.5">{value}</p>
      {sub && <p className="text-xs text-neutral-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function StatistiquesPage() {
  const { user, isLoading: authLoading } = useRequireAuth(['hairdresser']);
  const [stats, setStats]   = useState<ApiStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    apptApi.getStats()
      .then((data) => setStats(data as ApiStats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading) return null;

  const profile = user?.hairdresser_profile;

  return (
    <div className="min-h-screen bg-white pb-28 md:pb-8">
      <DashboardNav />
      <div className="max-w-2xl mx-auto">
        <div className="px-4 pt-4">
          <DashboardPageHeader title="Statistiques" />
        </div>
        <div className="hidden md:block px-4 pt-6 pb-4 border-b border-neutral-100">
          <h1 className="text-xl font-bold text-neutral-900">Statistiques</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Un aperçu de votre activité sur CHAIR</p>
        </div>

        {loading ? (
          <div className="px-4 pt-5 grid grid-cols-2 gap-3">
            {[1,2,3,4,5,6,7,8].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-neutral-100 animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <div className="px-4 pt-5 space-y-6">

            {/* Profil */}
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">Profil</p>
              <div className="grid grid-cols-2 gap-3">
                <StatCard icon={Users} label="Abonnés" value={stats.followers_count} />
                <StatCard icon={Heart} label="Favoris" value={stats.saved_count} />
                <StatCard icon={ImageIcon} label="Réalisations" value={stats.posts_count} />
                <StatCard
                  icon={Activity}
                  label="Visites"
                  value={stats.visits_count ?? 0}
                  sub="Prestations realisees"
                />
                <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-white border border-neutral-100 flex items-center justify-center">
                      <Star size={15} className="text-neutral-600" />
                    </div>
                    <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-neutral-400">Note</p>
                  </div>
                  {stats.reviews_count > 0 ? (
                    <>
                      <p className="text-3xl font-bold text-neutral-900 leading-none mb-1">{parseFloat(stats.avg_rating).toFixed(1)}</p>
                      <StarRating rating={parseFloat(stats.avg_rating)} size={13} />
                      <p className="text-xs text-neutral-400 mt-1">{stats.reviews_count} avis</p>
                    </>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-neutral-300 leading-none">—</p>
                      <p className="text-xs text-neutral-400 mt-1">Aucun avis pour l'instant</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Avis — répartition détaillée */}
            {stats.reviews_count > 0 && stats.review_breakdown && (
              <div>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">Repartition des avis</p>
                <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-5">
                  <div className="flex items-start gap-5">
                    {/* Note globale */}
                    <div className="text-center flex-shrink-0">
                      <p className="text-4xl font-bold text-neutral-900 leading-none">
                        {parseFloat(stats.avg_rating).toFixed(1)}
                      </p>
                      <StarRating rating={parseFloat(stats.avg_rating)} size={12} />
                      <p className="text-[11px] text-neutral-400 mt-1.5">
                        {stats.reviews_count} avis
                      </p>
                    </div>

                    {/* Barres */}
                    <div className="flex-1 space-y-1.5">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = stats.review_breakdown?.[star] ?? 0;
                        const pct = stats.reviews_count > 0
                          ? Math.round((count / stats.reviews_count) * 100)
                          : 0;
                        return (
                          <div key={star} className="flex items-center gap-2">
                            <span className="text-[11px] font-medium text-neutral-500 w-3 text-right flex-shrink-0">{star}</span>
                            <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-neutral-900 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-neutral-400 w-4 text-right flex-shrink-0">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rendez-vous */}
            {profile?.is_independent !== false && (
              <div>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">Rendez-vous</p>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon={Clock}
                    label="En attente"
                    value={stats.appointments_pending}
                    sub="Demandes à traiter"
                  />
                  <StatCard
                    icon={Calendar}
                    label="Confirmés"
                    value={stats.appointments_confirmed}
                    sub="RDV à venir"
                  />
                  <StatCard
                    icon={CheckCircle2}
                    label="Terminés"
                    value={stats.appointments_completed}
                    sub="Clients reçus"
                  />
                  <StatCard
                    icon={Users}
                    label="Total"
                    value={stats.appointments_total}
                    sub="Toutes demandes"
                  />
                  <StatCard
                    icon={Calendar}
                    label="Ce mois"
                    value={stats.appointments_this_month ?? 0}
                    sub="Rendez-vous du mois"
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="Chiffre d'affaires"
                    value={stats.revenue_estimate != null ? `${stats.revenue_estimate.toFixed(0)} €` : '—'}
                    sub="Total encaisse"
                  />
                </div>
              </div>
            )}

            <p className="text-[11px] text-neutral-400 text-center pb-2">
              Statistiques mises à jour en temps réel.
            </p>
          </div>
        ) : (
          <div className="px-4 py-16 text-center">
            <p className="text-sm text-neutral-400">Impossible de charger les statistiques.</p>
          </div>
        )}
      </div>
    </div>
  );
}
