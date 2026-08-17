'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, TrendingUp, MapPin, CreditCard } from 'lucide-react';
import {
  adminApi,
  AdminApiError,
  formatDate,
  hasPermission,
  getStoredAdminUser,
  PERMISSIONS,
  type AnalyticsStats,
  type DemandSupplyResponse,
  type GeoCoverageResponse,
  type AdminSubscriptionsResponse,
} from '@/lib/adminApi';
import { Card, CardHeader, EmptyState, ErrorBanner, PermissionDenied, Skeleton, StatTile, StatusPill, Th } from '../_components/ui';

type Tab = 'overview' | 'insights' | 'subscriptions';

function StatistiquesPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const tab: Tab = params.get('tab') === 'insights' ? 'insights' : params.get('tab') === 'subscriptions' ? 'subscriptions' : 'overview';
  const admin = getStoredAdminUser();
  const canAnalytics = hasPermission(admin, PERMISSIONS.ANALYTICS_READ);
  const canSubscriptions = hasPermission(admin, PERMISSIONS.SUBSCRIPTIONS_READ);

  if (!canAnalytics && !canSubscriptions) return <PermissionDenied />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-neutral-900 dark:text-neutral-50">Analytics</h1>
          <p className="text-[13px] text-neutral-400 mt-0.5">Croissance, insights business et abonnements</p>
        </div>
        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1">
          {canAnalytics && (
            <>
              <TabButton active={tab === 'overview'} onClick={() => router.push('/admin/statistiques')}>
                Vue d&apos;ensemble
              </TabButton>
              <TabButton active={tab === 'insights'} onClick={() => router.push('/admin/statistiques?tab=insights')}>
                Insights
              </TabButton>
            </>
          )}
          {canSubscriptions && (
            <TabButton active={tab === 'subscriptions'} onClick={() => router.push('/admin/statistiques?tab=subscriptions')}>
              Abonnements
            </TabButton>
          )}
        </div>
      </div>

      {tab === 'overview' && canAnalytics && <OverviewTab />}
      {tab === 'insights' && canAnalytics && <InsightsTab />}
      {tab === 'subscriptions' && canSubscriptions && <SubscriptionsTab />}
    </div>
  );
}

// ─── Vue d'ensemble ──────────────────────────────────────────────────────────

function OverviewTab() {
  const [data, setData] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);

  useEffect(() => {
    // Rechargement au changement de période — fetch au montage + à chaque
    // changement de `days`, pas une simple synchronisation d'état dérivé.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    adminApi
      .get<AnalyticsStats>('/admin/analytics', { days })
      .then(setData)
      .catch((e) => setError(e instanceof AdminApiError ? e.message : 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <Skeleton className="h-96" />;
  if (error) return <ErrorBanner message={error} />;
  if (!data) return null;

  const totalRegistrations = data.registrations.reduce((s, r) => s + r.count, 0);
  const totalAppointments = data.appointments.reduce((s, r) => s + r.count, 0);
  const totalReviews = data.reviews.reduce((s, r) => s + r.count, 0);
  const maxCity = Math.max(1, ...data.top_cities.map((c) => c.count));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        {[7, 30, 90, 365].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
              days === d ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
            }`}
          >
            {d === 365 ? '1 an' : `${d} j`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile icon={Users} value={totalRegistrations} label={`Inscriptions (${data.days}j)`} tone="violet" />
        <StatTile icon={TrendingUp} value={totalAppointments} label="Réservations" tone="blue" />
        <StatTile icon={Users} value={data.active_users.last_7_days} label="Actifs 7 derniers jours" tone="emerald" />
        <StatTile icon={Users} value={data.active_users.last_30_days} label="Actifs 30 derniers jours" tone="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Inscriptions par rôle" subtitle={`${totalRegistrations} au total sur la période`} />
          <div className="p-5 flex flex-col gap-2">
            <RoleBar label="Clients" count={data.registrations_by_role.client.reduce((s, r) => s + r.count, 0)} total={totalRegistrations} tone="bg-neutral-400" />
            <RoleBar label="Coiffeurs" count={data.registrations_by_role.hairdresser.reduce((s, r) => s + r.count, 0)} total={totalRegistrations} tone="bg-violet-500" />
          </div>
        </Card>

        <Card>
          <CardHeader title="Top villes" />
          {!data.top_cities.length ? (
            <EmptyState text="Aucune donnée" />
          ) : (
            <div className="p-5 flex flex-col gap-2">
              {data.top_cities.map((c) => (
                <div key={c.city} className="flex items-center gap-3">
                  <span className="text-[12px] text-neutral-500 dark:text-neutral-400 w-28 truncate">{c.city}</span>
                  <div className="flex-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    <div className="h-full bg-neutral-900 dark:bg-white rounded-full" style={{ width: `${(c.count / maxCity) * 100}%` }} />
                  </div>
                  <span className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300 w-8 text-right">{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold text-neutral-700 dark:text-neutral-300">Rétention (proxy)</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <RetentionBox label="D7" value={data.retention.d7} />
          <RetentionBox label="D30" value={data.retention.d30} />
        </div>
        <p className="text-[11px] text-neutral-400 mt-3">{data.retention.note}</p>
      </Card>

      <p className="text-[12px] text-neutral-400">
        {totalReviews} avis · {data.new_subscriptions.reduce((s, r) => s + r.count, 0)} nouveaux abonnements sur la période.
      </p>
    </div>
  );
}

function RoleBar({ label, count, total, tone }: { label: string; count: number; total: number; tone: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] text-neutral-500 dark:text-neutral-400 w-20">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300 w-10 text-right">{count}</span>
    </div>
  );
}

function RetentionBox({ label, value }: { label: string; value: { cohort_size: number; retained: number; rate: number | null } }) {
  return (
    <div className="rounded-xl border border-neutral-100 dark:border-neutral-800 p-4 text-center">
      <div className="text-[24px] font-bold text-neutral-900 dark:text-neutral-50">{value.rate !== null ? `${value.rate}%` : '—'}</div>
      <div className="text-[12px] text-neutral-400 mt-0.5">
        {label} — {value.retained}/{value.cohort_size} retenus
      </div>
    </div>
  );
}

// ─── Insights ────────────────────────────────────────────────────────────────

function InsightsTab() {
  const [demand, setDemand] = useState<DemandSupplyResponse | null>(null);
  const [geo, setGeo] = useState<GeoCoverageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([adminApi.get<DemandSupplyResponse>('/admin/insights/demand-supply'), adminApi.get<GeoCoverageResponse>('/admin/insights/geo-coverage')])
      .then(([d, g]) => {
        setDemand(d);
        setGeo(g);
      })
      .catch((e) => setError(e instanceof AdminApiError ? e.message : 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-96" />;
  if (error) return <ErrorBanner message={error} />;

  return (
    <div className="flex flex-col gap-6">
      {geo && geo.low_coverage.length > 0 && (
        <Card>
          <CardHeader title="Villes sous-couvertes" subtitle="Base clients réelle mais peu de professionnels disponibles" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                  <Th>Ville</Th>
                  <Th align="right">Clients</Th>
                  <Th align="right">Pros</Th>
                  <Th align="right">Salons</Th>
                  <Th align="right">Clients/pro</Th>
                </tr>
              </thead>
              <tbody>
                {geo.low_coverage.map((c) => (
                  <tr key={c.city}>
                    <td className="px-4 py-2.5 text-[13px] font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                      <MapPin size={12} className="text-neutral-300" /> {c.city}
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-right text-neutral-600 dark:text-neutral-400">{c.clients_count}</td>
                    <td className="px-4 py-2.5 text-[13px] text-right text-red-500 font-medium">{c.professionals_count}</td>
                    <td className="px-4 py-2.5 text-[13px] text-right text-neutral-600 dark:text-neutral-400">{c.salons_count}</td>
                    <td className="px-4 py-2.5 text-[13px] text-right text-neutral-600 dark:text-neutral-400">{c.clients_per_professional ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-5 py-3 text-[11px] text-neutral-400 border-t border-neutral-100 dark:border-neutral-800">{geo.limitation}</p>
        </Card>
      )}

      {demand && (
        <Card>
          <CardHeader title="Écart demande / offre par spécialité" subtitle="Proxy — préférences déclarées à l'inscription, pas un tracking de recherche réel" />
          {!demand.data.length ? (
            <EmptyState text="Pas assez de signal pour ce seuil" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                    <Th>Ville</Th>
                    <Th>Spécialité</Th>
                    <Th align="right">Demande (proxy)</Th>
                    <Th align="right">Offre</Th>
                    <Th align="right">Écart</Th>
                  </tr>
                </thead>
                <tbody>
                  {demand.data.map((r, i) => (
                    <tr key={`${r.city}-${r.specialty_slug}`} className={i % 2 === 1 ? 'bg-neutral-50/30 dark:bg-neutral-900/30' : ''}>
                      <td className="px-4 py-2.5 text-[13px] text-neutral-900 dark:text-neutral-100">{r.city}</td>
                      <td className="px-4 py-2.5 text-[13px] text-neutral-600 dark:text-neutral-400">{r.specialty_name}</td>
                      <td className="px-4 py-2.5 text-[13px] text-right">{r.demand_count}</td>
                      <td className="px-4 py-2.5 text-[13px] text-right">{r.supply_count}</td>
                      <td className={`px-4 py-2.5 text-[13px] text-right font-medium ${r.gap > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{r.gap > 0 ? `+${r.gap}` : r.gap}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="px-5 py-3 text-[11px] text-neutral-400 border-t border-neutral-100 dark:border-neutral-800">{demand.limitation}</p>
        </Card>
      )}
    </div>
  );
}

// ─── Abonnements ─────────────────────────────────────────────────────────────

function SubscriptionsTab() {
  const [data, setData] = useState<AdminSubscriptionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .get<AdminSubscriptionsResponse>('/admin/subscriptions')
      .then(setData)
      .catch((e) => setError(e instanceof AdminApiError ? e.message : 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Chargement initial — fetch au montage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (loading) return <Skeleton className="h-64" />;
  if (error) return <ErrorBanner message={error} />;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatTile icon={CreditCard} value={`${data.mrr.toLocaleString('fr')} €`} label="MRR (actif + past due)" tone="emerald" />
        <StatTile icon={Users} value={data.active_paying_count} label="Abonnés payants actifs" tone="violet" />
        <StatTile icon={CreditCard} value={data.total} label="Total (incl. essai)" tone="neutral" />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                <Th>Compte</Th>
                <Th>Plan</Th>
                <Th align="right">Montant</Th>
                <Th>Statut</Th>
                <Th>Démarré</Th>
              </tr>
            </thead>
            <tbody>
              {!data.data.length ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState text="Aucun abonnement" />
                  </td>
                </tr>
              ) : (
                data.data.map((s, i) => (
                  <tr key={s.id} className={i % 2 === 1 ? 'bg-neutral-50/30 dark:bg-neutral-900/30' : ''}>
                    <td className="px-4 py-2.5 text-[13px] text-neutral-900 dark:text-neutral-100">{s.name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-[12px] text-neutral-500 dark:text-neutral-400">{s.plan}</td>
                    <td className="px-4 py-2.5 text-[13px] text-right font-medium">{s.amount} €</td>
                    <td className="px-4 py-2.5">
                      <StatusPill status={s.status === 'active' ? 'active' : s.status === 'past_due' ? 'suspended' : 'pending'} labelOverride={s.status} />
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-neutral-400">{formatDate(s.started_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${
        active ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700'
      }`}
    >
      {children}
    </button>
  );
}

export default function StatistiquesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-40" />}>
      <StatistiquesPageInner />
    </Suspense>
  );
}
