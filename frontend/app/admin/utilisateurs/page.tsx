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
  type BulkAction,
  type BulkExportResponse,
  type Paginated,
} from '@/lib/adminApi';
import { Card, ConfirmModal, ErrorBanner, PermissionDenied, RolePill, SearchInput, Skeleton, StatusPill, Th, Pagination, selectCls, EmptyState } from '../_components/ui';
import { BulkActionModal, BulkSelectionBar, downloadUsersCsv, type BulkSelection } from '@/components/admin/BulkActions';

export default function UtilisateursPage() {
  const params = useSearchParams();
  const admin = getStoredAdminUser();
  const canSuspend = hasPermission(admin, PERMISSIONS.USERS_SUSPEND);
  const canDelete = hasPermission(admin, PERMISSIONS.USERS_DELETE);
  const canHide = hasPermission(admin, PERMISSIONS.HAIRDRESSERS_VISIBILITY);

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

  // ─── Sélection multiple (motif Gmail) ────────────────────────────────────
  // `selected` = ids cochés explicitement ; `allFiltered` = mode « tous les
  // utilisateurs correspondant à cette recherche » — le backend reçoit alors
  // les FILTRES (jamais 5000 ids dans une requête), résout le lot côté
  // serveur au dry run, puis le front exécute les ids résolus lot par lot.
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [allFiltered, setAllFiltered] = useState(false);
  const [bulkAction, setBulkAction] = useState<Exclude<BulkAction, 'export_csv'> | null>(null);
  const [exporting, setExporting] = useState(false);

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

  const clearSelection = () => {
    setSelected(new Set());
    setAllFiltered(false);
  };

  const pageIds = (data?.data ?? []).map((u) => u.id);
  const pageAllSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const selectionCount = allFiltered ? data?.total ?? 0 : selected.size;

  const toggleRow = (id: number) => {
    setAllFiltered(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePage = () => {
    setAllFiltered(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (pageAllSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const bulkSelection: BulkSelection = allFiltered
    ? { filters: { search: search || undefined, role: role || undefined, status: status || undefined } }
    : { ids: Array.from(selected) };

  async function exportSelection(selection: BulkSelection) {
    setExporting(true);
    setError('');
    try {
      const res = await adminApi.post<BulkExportResponse>('/admin/users/bulk', { action: 'export_csv', ...selection });
      downloadUsersCsv(res.rows);
    } catch {
      setError('Export impossible');
    } finally {
      setExporting(false);
    }
  }

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

  if (forbidden) return <PermissionDenied />;

  const checkboxCls =
    'w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-neutral-900 accent-neutral-900 dark:accent-white cursor-pointer';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-neutral-900 dark:text-neutral-50">Utilisateurs</h1>
          {data && <p className="text-[13px] text-neutral-400 mt-0.5">{data.total.toLocaleString('fr')} utilisateurs</p>}
        </div>
        <button
          onClick={() => exportSelection({ filters: { search: search || undefined, role: role || undefined, status: status || undefined } })}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-[13px] font-semibold hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
        >
          <Download size={14} /> {exporting ? 'Export…' : 'Export CSV (recherche actuelle)'}
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      {selectionCount > 0 && (
        <BulkSelectionBar
          count={selectionCount}
          canSuspend={canSuspend}
          canHide={canHide}
          canDelete={canDelete}
          onAction={(a) => setBulkAction(a)}
          onExport={() => exportSelection(bulkSelection)}
          onClear={clearSelection}
          exporting={exporting}
        />
      )}

      {/* Motif Gmail : la page est cochée, mais la recherche matche plus large */}
      {pageAllSelected && !allFiltered && data && data.total > data.data.length && (
        <div className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-[13px] text-neutral-600 dark:text-neutral-300 flex items-center gap-2 flex-wrap">
          <span>Les {data.data.length} utilisateurs de cette page sont sélectionnés.</span>
          <button onClick={() => setAllFiltered(true)} className="font-semibold underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-50 transition-colors min-h-[32px]">
            Sélectionner les {data.total.toLocaleString('fr')} utilisateurs correspondant à cette recherche
          </button>
        </div>
      )}
      {allFiltered && data && (
        <div className="px-4 py-2.5 bg-neutral-900 dark:bg-neutral-800 rounded-xl text-[13px] text-white flex items-center gap-2 flex-wrap">
          <span>
            Les <strong>{data.total.toLocaleString('fr')}</strong> utilisateurs correspondant à cette recherche sont sélectionnés.
          </span>
          <button onClick={clearSelection} className="font-semibold underline underline-offset-2 hover:text-neutral-300 transition-colors min-h-[32px]">
            Effacer la sélection
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {/* Tout changement de recherche/filtre invalide la sélection en cours —
            sinon un « tous les filtrés » confirmé sur d'anciens filtres
            agirait sur un lot que l'admin ne voit plus à l'écran. */}
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
            clearSelection();
          }}
          placeholder="Rechercher par nom ou email…"
          className="flex-1 min-w-[220px]"
        />
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
            clearSelection();
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
            clearSelection();
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
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={pageAllSelected}
                    onChange={togglePage}
                    className={checkboxCls}
                    aria-label="Sélectionner la page"
                  />
                </th>
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
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-5 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : data?.data?.length === 0
                ? (
                  <tr>
                    <td colSpan={9}>
                      <EmptyState text="Aucun utilisateur trouvé" />
                    </td>
                  </tr>
                )
                : data?.data?.map((u, i) => (
                    <tr
                      key={u.id}
                      className={`hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors ${
                        selected.has(u.id) || allFiltered ? 'bg-neutral-100/60 dark:bg-neutral-800/60' : i % 2 === 1 ? 'bg-neutral-50/30 dark:bg-neutral-900/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={allFiltered || selected.has(u.id)}
                          onChange={() => toggleRow(u.id)}
                          className={checkboxCls}
                          aria-label={`Sélectionner ${u.name}`}
                        />
                      </td>
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

      {bulkAction && (
        <BulkActionModal
          action={bulkAction}
          selection={bulkSelection}
          onClose={() => setBulkAction(null)}
          onDone={() => {
            setBulkAction(null);
            clearSelection();
            fetchUsers(search, role, status, page);
          }}
        />
      )}

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
