'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Users, Scissors, Building2, Search as SearchIcon } from 'lucide-react';
import {
  adminApi,
  getStoredAdminUser,
  hasPermission,
  PERMISSIONS,
  type AdminUserRow,
  type AdminHairdresserRow,
  type AdminSalonRow,
  type Paginated,
} from '@/lib/adminApi';
import { Card, EmptyState, RolePill, SearchInput, Skeleton, StatusPill } from '../_components/ui';

/**
 * Recherche globale — interroge en parallèle les 3 endpoints déjà
 * paramétrables par `search` (users, hairdressers, salons) et regroupe les
 * résultats par type. Aucun endpoint de recherche unifiée n'existe côté
 * backend : c'est volontairement 3 appels côté client, pas une invention
 * d'API.
 */
export default function RecherchePage() {
  const user = getStoredAdminUser();
  const canUsers = hasPermission(user, PERMISSIONS.USERS_READ);
  const canHairdressers = hasPermission(user, PERMISSIONS.HAIRDRESSERS_READ);
  const canSalons = hasPermission(user, PERMISSIONS.SALONS_READ);

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [hairdressers, setHairdressers] = useState<AdminHairdresserRow[]>([]);
  const [salons, setSalons] = useState<AdminSalonRow[]>([]);
  const [searched, setSearched] = useState(false);

  const run = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setUsers([]);
        setHairdressers([]);
        setSalons([]);
        setSearched(false);
        return;
      }
      setLoading(true);
      setSearched(true);
      const jobs: Promise<void>[] = [];

      if (canUsers) {
        jobs.push(
          adminApi
            .get<Paginated<AdminUserRow>>('/admin/users', { search: q, per_page: 8 })
            .then((r) => setUsers(r.data))
            .catch(() => setUsers([]))
        );
      }
      if (canHairdressers) {
        jobs.push(
          adminApi
            .get<{ data: AdminHairdresserRow[] }>('/admin/hairdressers', { search: q })
            .then((r) => setHairdressers(r.data.slice(0, 8)))
            .catch(() => setHairdressers([]))
        );
      }
      if (canSalons) {
        jobs.push(
          adminApi
            .get<{ data: AdminSalonRow[] }>('/admin/salons', { search: q })
            .then((r) => setSalons(r.data.slice(0, 8)))
            .catch(() => setSalons([]))
        );
      }

      await Promise.all(jobs);
      setLoading(false);
    },
    [canUsers, canHairdressers, canSalons]
  );

  useEffect(() => {
    const t = setTimeout(() => run(query), 350);
    return () => clearTimeout(t);
  }, [query, run]);

  const totalResults = users.length + hairdressers.length + salons.length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-bold text-neutral-900 dark:text-neutral-50">Recherche globale</h1>
        <p className="text-[13px] text-neutral-400 mt-0.5">Utilisateurs, professionnels et salons en un seul endroit</p>
      </div>

      <SearchInput value={query} onChange={setQuery} placeholder="Nom, email, ville, salon…" className="max-w-xl" />

      {!searched && (
        <Card className="p-10 flex flex-col items-center text-center gap-2">
          <SearchIcon size={22} className="text-neutral-300" />
          <p className="text-[13px] text-neutral-400">Commencez à taper pour rechercher dans toute la plateforme.</p>
        </Card>
      )}

      {searched && (
        <div className="flex flex-col gap-6">
          {loading && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          )}

          {!loading && totalResults === 0 && <EmptyState text={`Aucun résultat pour "${query}"`} />}

          {!loading && canUsers && users.length > 0 && (
            <ResultGroup icon={Users} title={`Utilisateurs (${users.length})`}>
              {users.map((u) => (
                <Link
                  key={u.id}
                  href={`/admin/utilisateurs/${u.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
                >
                  <Avatar name={u.name} url={u.avatar} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100 truncate">{u.name}</p>
                    <p className="text-[12px] text-neutral-400 truncate">{u.email}</p>
                  </div>
                  <RolePill role={u.role} />
                  {u.suspended_at && <StatusPill status="suspended" />}
                </Link>
              ))}
            </ResultGroup>
          )}

          {!loading && canHairdressers && hairdressers.length > 0 && (
            <ResultGroup icon={Scissors} title={`Professionnels (${hairdressers.length})`}>
              {hairdressers.map((h) => (
                <Link
                  key={h.profile_id}
                  href={`/admin/coiffeurs/${h.profile_id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
                >
                  <Avatar name={h.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100 truncate">{h.name}</p>
                    <p className="text-[12px] text-neutral-400 truncate">{h.city ?? '—'}</p>
                  </div>
                  {h.is_verified && <StatusPill status="verified" />}
                  <StatusPill status={h.status} />
                </Link>
              ))}
            </ResultGroup>
          )}

          {!loading && canSalons && salons.length > 0 && (
            <ResultGroup icon={Building2} title={`Salons (${salons.length})`}>
              {salons.map((s) => (
                <Link
                  key={s.id}
                  href={`/admin/salons/${s.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
                >
                  <Avatar name={s.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100 truncate">{s.name}</p>
                    <p className="text-[12px] text-neutral-400 truncate">{s.city ?? '—'}</p>
                  </div>
                  {s.is_verified && <StatusPill status="verified" />}
                  {s.suspended && <StatusPill status="suspended" />}
                </Link>
              ))}
            </ResultGroup>
          )}
        </div>
      )}
    </div>
  );
}

function ResultGroup({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
        <Icon size={14} className="text-neutral-400" />
        <h2 className="text-[13px] font-semibold text-neutral-700 dark:text-neutral-300">{title}</h2>
      </div>
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">{children}</div>
    </Card>
  );
}

function Avatar({ name, url }: { name: string; url?: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />;
  }
  return (
    <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[12px] font-bold text-neutral-600 dark:text-neutral-300 flex-shrink-0">
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  );
}
