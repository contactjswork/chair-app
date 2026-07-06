'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  Scissors,
  CalendarCheck,
  Building2,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  Star,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('chair_admin_token') : null;

// ─── StatCard ────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  value,
  label,
  delta,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  value: string | number;
  label: string;
  delta?: number;
}) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5 flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon size={18} className={iconColor} />
      </div>
      <div>
        <div className="text-[26px] font-bold text-neutral-900 leading-none">{value}</div>
        <div className="text-[12px] text-neutral-400 mt-1">{label}</div>
      </div>
      {delta !== undefined && (
        <div
          className={`flex items-center gap-1 text-[12px] font-medium ${
            delta >= 0 ? 'text-emerald-600' : 'text-red-500'
          }`}
        >
          {delta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {delta >= 0 ? '+' : ''}{delta}% ce mois
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-neutral-100 rounded-xl ${className ?? ''}`} />;
}

interface Stats {
  total_users: number;
  total_hairdressers: number;
  total_clients: number;
  total_salons: number;
  new_today: number;
  new_week: number;
  new_month: number;
  appointments_total: number;
  appointments_pending: number;
  appointments_confirmed: number;
  appointments_cancelled: number;
  top_hairdressers: Array<{ name: string; city: string; appointments: number; rating: number }>;
}

interface Activity {
  id: number;
  type: string;
  description: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getToken();
    const headers = { Authorization: `Bearer ${token}` };

    fetch(`${API_URL}/admin/stats`, { headers })
      .then((r) => r.json())
      .then((d) => { setStats(d); setLoadingStats(false); })
      .catch(() => { setError('Impossible de charger les statistiques'); setLoadingStats(false); });

    fetch(`${API_URL}/admin/activity`, { headers })
      .then((r) => r.json())
      .then((d) => { setActivity(d.activity ?? d ?? []); setLoadingActivity(false); })
      .catch(() => setLoadingActivity(false));
  }, []);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  }

  function activityIcon(type: string) {
    if (type?.includes('appointment')) return <CalendarCheck size={14} className="text-blue-500" />;
    if (type?.includes('review')) return <Star size={14} className="text-amber-500" />;
    return <Users size={14} className="text-violet-500" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-bold text-neutral-900">Tableau de bord</h1>
        <p className="text-[13px] text-neutral-400 mt-0.5">Vue d'ensemble de la plateforme CHAIR</p>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 rounded-xl text-[13px] text-red-600">{error}</div>
      )}

      {/* KPIs grille */}
      {loadingStats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : stats ? (
        <>
          <div>
            <h2 className="text-[13px] font-semibold text-neutral-500 uppercase tracking-wider mb-3">Utilisateurs</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} iconBg="bg-violet-50" iconColor="text-violet-600" value={stats.total_users.toLocaleString('fr')} label="Total utilisateurs" />
              <StatCard icon={Scissors} iconBg="bg-blue-50" iconColor="text-blue-600" value={stats.total_hairdressers.toLocaleString('fr')} label="Coiffeurs" />
              <StatCard icon={Users} iconBg="bg-emerald-50" iconColor="text-emerald-600" value={stats.total_clients.toLocaleString('fr')} label="Clients" />
              <StatCard icon={Building2} iconBg="bg-amber-50" iconColor="text-amber-600" value={stats.total_salons.toLocaleString('fr')} label="Salons" />
            </div>
          </div>

          <div>
            <h2 className="text-[13px] font-semibold text-neutral-500 uppercase tracking-wider mb-3">Nouvelles inscriptions</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard icon={TrendingUp} iconBg="bg-neutral-100" iconColor="text-neutral-600" value={stats.new_today} label="Aujourd'hui" />
              <StatCard icon={TrendingUp} iconBg="bg-neutral-100" iconColor="text-neutral-600" value={stats.new_week} label="Cette semaine" />
              <StatCard icon={TrendingUp} iconBg="bg-neutral-100" iconColor="text-neutral-600" value={stats.new_month} label="Ce mois" />
            </div>
          </div>

          <div>
            <h2 className="text-[13px] font-semibold text-neutral-500 uppercase tracking-wider mb-3">Réservations</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={CalendarCheck} iconBg="bg-blue-50" iconColor="text-blue-600" value={stats.appointments_total.toLocaleString('fr')} label="Total RDV" />
              <StatCard icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-600" value={stats.appointments_pending} label="En attente" />
              <StatCard icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" value={stats.appointments_confirmed} label="Confirmés" />
              <StatCard icon={XCircle} iconBg="bg-red-50" iconColor="text-red-500" value={stats.appointments_cancelled} label="Annulés" />
            </div>
          </div>
        </>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top coiffeurs */}
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm">
          <div className="px-5 py-4 border-b border-neutral-100">
            <h2 className="text-[14px] font-semibold text-neutral-900">Top 5 coiffeurs</h2>
          </div>
          {loadingStats ? (
            <div className="p-5 flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Nom</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Ville</th>
                  <th className="text-right px-3 py-2.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">RDV</th>
                  <th className="text-right px-5 py-2.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Note</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.top_hairdressers ?? []).map((h, i) => (
                  <tr key={i} className={i % 2 === 1 ? 'bg-neutral-50/30' : ''}>
                    <td className="px-5 py-3 text-[13px] font-medium text-neutral-900">{h.name}</td>
                    <td className="px-3 py-3 text-[13px] text-neutral-500">{h.city}</td>
                    <td className="px-3 py-3 text-[13px] text-right text-neutral-700">{h.appointments}</td>
                    <td className="px-5 py-3 text-[13px] text-right">
                      <span className="text-amber-500 font-medium">★ {h.rating?.toFixed(1)}</span>
                    </td>
                  </tr>
                ))}
                {!stats?.top_hairdressers?.length && (
                  <tr><td colSpan={4} className="px-5 py-6 text-center text-[13px] text-neutral-400">Aucune donnée</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Activité récente */}
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm">
          <div className="px-5 py-4 border-b border-neutral-100">
            <h2 className="text-[14px] font-semibold text-neutral-900">Activité récente</h2>
          </div>
          {loadingActivity ? (
            <div className="p-5 flex flex-col gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : activity.length === 0 ? (
            <div className="px-5 py-8 text-center text-[13px] text-neutral-400">Aucune activité récente</div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {activity.slice(0, 10).map((a) => (
                <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                  <div className="mt-0.5">{activityIcon(a.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-neutral-700 leading-snug">{a.description}</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">{formatDate(a.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
