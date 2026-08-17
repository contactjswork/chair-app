'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, UserX, UserCheck, Trash2, Download } from 'lucide-react';
import {
  adminApi,
  AdminApiError,
  formatDate,
  hasPermission,
  getStoredAdminUser,
  PERMISSIONS,
  type AdminUserRow,
  type Paginated,
} from '@/lib/adminApi';
import { Card, ConfirmModal, ErrorBanner, PermissionDenied, RolePill, SearchInput, Skeleton, StatusPill, Th, Pagination, selectCls, EmptyState } from '../_components/ui';

export default function UtilisateursPage() {
  const params = useSearchParams();
  const admin = getStoredAdminUser();
  const canSuspend = hasPermission(admin, PERMISSIONS.USERS_SUSPEND);
  const canDelete = hasPermission(admin, PERMISSIONS.USERS_DELETE);

  const [data, setData] = useState<Paginated<AdminUserRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<{ type: 'suspend' | 'delete'; row: AdminUserRow } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);

  const fetchUsers = useCallback(async (q: string, r: string, s: string, p: number) => {
    setLoading(true);
    try {
      const json = await adminApi.get<Paginated<AdminUserRow>>('/admin/users', { search: q, role: r, status: s, page: p, per_page: 20 });
      setData(json);
    } catch (e) {
      if (e instanceof AdminApiError && e.isForbidden) setForbidden(true);
      else setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(search, role, status, page), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, role, status, page, fetchUsers]);

  async function handleSuspend(row: AdminUserRow) {
    setActionLoading(true);
    try {
      const action = row.suspended_at ? 'unsuspend' : 'suspend';
      await adminApi.post(`/admin/users/${row.id}/${action}`);
      fetchUsers(search, role, status, page);
    } catch {
      setError('Action impossible');
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  }

  async function handleDelete(row: AdminUserRow) {
    setActionLoading(true);
    try {
      await adminApi.delete(`/admin/users/${row.id}`);
      fetchUsers(search, role, status, page);
    } catch {
      setError('Suppression impossible');
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  }

  function exportCSV() {
    const rows = data?.data ?? [];
    const header = 'ID,Nom,Email,Rôle,Ville,Inscrit le,Statut';
    const lines = rows.map(
      (u) => `${u.id},"${u.name}","${u.email}",${u.role},${u.city ?? ''},"${u.created_at}",${u.suspended_at ? 'suspendu' : 'actif'}`
    );
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `utilisateurs_${Date.now()}.csv`;
    a.click();
  }

  if (forbidden) return <PermissionDenied />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-neutral-900 dark:text-neutral-50">Utilisateurs</h1>
          {data && <p className="text-[13px] text-neutral-400 mt-0.5">{data.total.toLocaleString('fr')} utilisateurs</p>}
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-[13px] font-semibold hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors"
        >
          <Download size={14} /> Export CSV (page actuelle)
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="flex flex-wrap gap-3">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Rechercher par nom ou email…"
          className="flex-1 min-w-[220px]"
        />
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          className={selectCls}
        >
          <option value="">Tous les rôles</option>
          <option value="client">Client</option>
          <option value="hairdresser">Coiffeur</option>
          <option value="salon_owner">Gérant</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className={selectCls}
        >
          <option value="">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="suspended">Suspendu</option>
        </select>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                <Th>ID</Th>
                <Th>Utilisateur</Th>
                <Th>Email</Th>
                <Th>Rôle</Th>
                <Th>Ville</Th>
                <Th>Inscrit</Th>
                <Th>Statut</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className={i % 2 === 1 ? 'bg-neutral-50/30 dark:bg-neutral-900/30' : ''}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-5 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : data?.data?.length === 0
                ? (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState text="Aucun utilisateur trouvé" />
                    </td>
                  </tr>
                )
                : data?.data?.map((u, i) => (
                    <tr key={u.id} className={`hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors ${i % 2 === 1 ? 'bg-neutral-50/30 dark:bg-neutral-900/30' : ''}`}>
                      <td className="px-4 py-3 text-[12px] text-neutral-400">#{u.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {u.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[12px] font-bold text-neutral-600 dark:text-neutral-300">
                              {u.name?.[0]?.toUpperCase() ?? '?'}
                            </div>
                          )}
                          <span className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-neutral-500 dark:text-neutral-400">{u.email}</td>
                      <td className="px-4 py-3">
                        <RolePill role={u.role} />
                      </td>
                      <td className="px-4 py-3 text-[13px] text-neutral-500 dark:text-neutral-400">{u.city ?? '—'}</td>
                      <td className="px-4 py-3 text-[12px] text-neutral-400">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3">
                        <StatusPill status={u.suspended_at ? 'suspended' : 'active'} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Link
                            href={`/admin/utilisateurs/${u.id}`}
                            className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                            title="Voir la fiche"
                          >
                            <Eye size={15} />
                          </Link>
                          {canSuspend && (
                            <button
                              onClick={() => setConfirm({ type: 'suspend', row: u })}
                              className="p-1.5 rounded-lg text-neutral-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600 transition-colors"
                              title={u.suspended_at ? 'Réactiver' : 'Suspendre'}
                            >
                              {u.suspended_at ? <UserCheck size={15} /> : <UserX size={15} />}
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setConfirm({ type: 'delete', row: u })}
                              className="p-1.5 rounded-lg text-neutral-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {data && data.last_page > 1 && (
          <div className="px-4 py-3 border-t border-neutral-100 dark:border-neutral-800">
            <Pagination page={page} totalPages={data.last_page} onChange={setPage} />
          </div>
        )}
      </Card>

      <ConfirmModal
        open={!!confirm}
        title={confirm?.type === 'delete' ? "Supprimer l'utilisateur" : confirm?.row?.suspended_at ? "Réactiver l'utilisateur" : "Suspendre l'utilisateur"}
        message={
          confirm?.type === 'delete' ? (
            <>
              Supprimer définitivement <strong>{confirm.row.name}</strong> ? Cette action est <strong>irréversible</strong> (droit à l&apos;oubli
              RGPD) — toutes ses données seront effacées de la base.
            </>
          ) : confirm?.row?.suspended_at ? (
            <>Réactiver le compte de <strong>{confirm?.row.name}</strong> ?</>
          ) : (
            <>
              Suspendre le compte de <strong>{confirm?.row?.name}</strong> ? L&apos;utilisateur ne pourra plus se connecter tant que le compte
              n&apos;est pas réactivé.
            </>
          )
        }
        confirmLabel={confirm?.type === 'delete' ? 'Supprimer définitivement' : 'Confirmer'}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.type === 'delete') handleDelete(confirm.row);
          else handleSuspend(confirm.row);
        }}
        loading={actionLoading}
      />
    </div>
  );
}
