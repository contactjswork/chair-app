'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Scissors,
  Building2,
  CalendarCheck,
  Star,
  FileText,
  CreditCard,
  Flag,
  GraduationCap,
  Ban,
  LifeBuoy,
  Search,
  Award,
  SlidersHorizontal,
  ArrowRight,
} from 'lucide-react';
import { adminApi, AdminApiError, PERMISSIONS, getStoredAdminUser, hasPermission, type DashboardToday } from '@/lib/adminApi';
import { Card, CardHeader, ErrorBanner, PermissionDenied, Skeleton, StatTile } from './_components/ui';

function CounterGrid({ counters }: { counters: DashboardToday['today'] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <StatTile icon={Users} value={counters.new_users} label="Nouveaux comptes" tone="violet" />
      <StatTile icon={Scissors} value={counters.new_hairdressers} label="Nouveaux coiffeurs" tone="blue" />
      <StatTile icon={Building2} value={counters.new_salons} label="Nouveaux salons" tone="amber" />
      <StatTile icon={CalendarCheck} value={counters.new_appointments} label="Réservations" tone="emerald" />
      <StatTile icon={Star} value={counters.new_reviews} label="Nouveaux avis" tone="neutral" />
      <StatTile icon={CreditCard} value={counters.new_chair_plus_subscriptions} label="Abonnements CHAIR+" tone="violet" />
    </div>
  );
}

export default function AdminDashboard() {
  const user = getStoredAdminUser();
  const [data, setData] = useState<DashboardToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    adminApi
      .get<DashboardToday>('/admin/dashboard/today')
      .then(setData)
      .catch((e) => {
        if (e instanceof AdminApiError && e.isForbidden) setForbidden(true);
        else setError(e instanceof Error ? e.message : 'Erreur de chargement');
      })
      .finally(() => setLoading(false));
  }, []);

  if (forbidden) return <PermissionDenied />;

  const alerts = data?.alerts;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-bold text-neutral-900 dark:text-neutral-50">Tableau de bord</h1>
        <p className="text-[13px] text-neutral-400 mt-0.5">
          Bonjour {user?.name?.split(' ')[0] ?? ''} — vue d&apos;ensemble de la plateforme CHAIR
        </p>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* Aujourd'hui */}
      <div>
        <h2 className="text-[13px] font-semibold text-neutral-500 uppercase tracking-wider mb-3">Aujourd&apos;hui</h2>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : data ? (
          <CounterGrid counters={data.today} />
        ) : null}
      </div>

      {/* Cette semaine */}
      <div>
        <h2 className="text-[13px] font-semibold text-neutral-500 uppercase tracking-wider mb-3">
          Cette semaine <span className="normal-case text-neutral-300 font-normal">(depuis lundi)</span>
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : data ? (
          <CounterGrid counters={data.this_week} />
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alertes */}
        <Card className="lg:col-span-2">
          <CardHeader title="Alertes" subtitle="Ce qui nécessite votre attention maintenant" />
          {loading ? (
            <div className="p-5 flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : alerts ? (
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AlertRow
                icon={Flag}
                tone="red"
                label="Signalements en attente"
                value={alerts.pending_reports}
                href="/admin/moderation?tab=signalements"
              />
              <AlertRow
                icon={GraduationCap}
                tone="amber"
                label="Diplômes à vérifier"
                value={alerts.hairdressers_to_verify}
                href="/admin/coiffeurs?tab=diplomes"
              />
              <AlertRow icon={Ban} tone="neutral" label="Comptes suspendus" value={alerts.suspended_accounts} href="/admin/utilisateurs?status=suspended" />
              <AlertRow
                icon={LifeBuoy}
                tone={alerts.support_requests_priority_open > 0 ? 'red' : 'blue'}
                label="Support ouvert"
                value={alerts.support_requests_open}
                sublabel={alerts.support_requests_priority_open > 0 ? `dont ${alerts.support_requests_priority_open} prioritaires CHAIR+` : undefined}
              />
            </div>
          ) : (
            <div className="p-5 text-[13px] text-neutral-400">Aucune donnée</div>
          )}
        </Card>

        {/* Actions rapides */}
        <Card>
          <CardHeader title="Actions rapides" />
          <div className="p-3 flex flex-col gap-1">
            <QuickAction icon={Search} label="Rechercher un utilisateur" href="/admin/recherche" />
            {hasPermission(user, PERMISSIONS.BADGES_MANAGE) && (
              <QuickAction icon={Award} label="Créer un badge" href="/admin/badges?new=1" />
            )}
            {hasPermission(user, PERMISSIONS.FEATURE_FLAGS_MANAGE) && (
              <QuickAction icon={SlidersHorizontal} label="Feature flags" href="/admin/configuration?tab=flags" />
            )}
            {hasPermission(user, PERMISSIONS.CONTENT_MODERATE) && (
              <QuickAction icon={FileText} label="File de modération" href="/admin/moderation" />
            )}
          </div>
        </Card>
      </div>

      {data && (
        <p className="text-[11px] text-neutral-300 text-right">
          Généré le {new Date(data.generated_at).toLocaleString('fr-FR')} — semaine ISO démarrée le{' '}
          {new Date(data.week_started_at).toLocaleDateString('fr-FR')}
        </p>
      )}
    </div>
  );
}

function AlertRow({
  icon: Icon,
  tone,
  label,
  sublabel,
  value,
  href,
}: {
  icon: React.ElementType;
  tone: 'red' | 'amber' | 'neutral' | 'blue';
  label: string;
  sublabel?: string;
  value: number;
  href?: string;
}) {
  const tones: Record<string, string> = {
    red: 'bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
    neutral: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
  };
  const content = (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tones[tone]}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">{label}</p>
        {sublabel && <p className="text-[11px] text-neutral-400">{sublabel}</p>}
      </div>
      <span className="text-[18px] font-bold text-neutral-900 dark:text-neutral-50 tabular-nums">{value}</span>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function QuickAction({ icon: Icon, label, href }: { icon: React.ElementType; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group"
    >
      <Icon size={15} className="text-neutral-400" />
      <span className="flex-1">{label}</span>
      <ArrowRight size={13} className="text-neutral-300 group-hover:text-neutral-500 transition-colors" />
    </Link>
  );
}
