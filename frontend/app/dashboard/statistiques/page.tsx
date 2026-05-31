'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import DashboardNav from '@/components/layout/DashboardNav';
import StarRating from '@/components/ui/StarRating';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { appointments as apptApi } from '@/lib/api';
import type { ApiStats } from '@/lib/types';
import { Users, Heart, Star, Calendar, CheckCircle2, Clock, ImageIcon } from 'lucide-react';

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
    <AppShell>
      <div className="max-w-2xl mx-auto pb-28 md:pb-8">
        <div className="px-4 pt-6 pb-4 border-b border-neutral-100">
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
                <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-white border border-neutral-100 flex items-center justify-center">
                      <Star size={15} className="text-neutral-600" />
                    </div>
                    <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-neutral-400">Note</p>
                  </div>
                  {stats.reviews_count > 0 ? (
                    <>
                      <p className="text-3xl font-bold text-neutral-900 leading-none mb-1">{stats.avg_rating}</p>
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
      <DashboardNav />
    </AppShell>
  );
}
