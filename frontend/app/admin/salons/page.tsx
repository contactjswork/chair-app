'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Eye, ShieldCheck, ShieldOff, UserX, UserCheck } from 'lucide-react';
import {
  adminApi,
  AdminApiError,
  hasPermission,
  getStoredAdminUser,
  PERMISSIONS,
  type AdminSalonRow,
  type Paginated,
} from '@/lib/adminApi';
import { Card, ConfirmModal, EmptyState, ErrorBanner, PermissionDenied, SearchInput, Skeleton, StatusPill, Th, Pagination, selectCls, inputCls } from '../_components/ui';

type ConfirmAction = { type: 'verify' | 'unverify' | 'suspend' | 'unsuspend'; row: AdminSalonRow };

export default function SalonsPage() {
  const admin = getStoredAdminUser();
  const canManage = hasPermission(admin, PERMISSIONS.SALONS_MANAGE);

  const [data, setData] = useState<Paginated<AdminSalonRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const json = await adminApi.get<Paginated<AdminSalonRow>>('/admin/salons', { search, status, page });
      setData(json);
    } catch (e) {
      if (e instanceof AdminApiError && e.isForbidden) setForbidden(true);
      else setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => {
    const t = setTimeout(fetchData, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchData, search]);

  async function run() {
    if (!confirm) return;
    setActionLoading(true);
    try {
      const { type, row } = confirm;
      if (type === 'verify') await adminApi.post(`/admin/salons/${row.id}/verify`);
      else if (type === 'unverify') await adminApi.post(`/admin/salons/${row.id}/unverify`);
      else if (type === 'suspend') await adminApi.post(`/admin/salons/${row.id}/suspend`, { reason: suspendReason || undefined });
      else if (type === 'unsuspend') await adminApi.post(`/admin/salons/${row.id}/unsuspend`);
      fetchData();
    } catch {
      setError('Action impossible');
    } finally {
      setActionLoading(false);
      setConfirm(null);
      setSuspendReason('');
    }
  }

  if (forbidden) return <PermissionDenied />;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold text-neutral-900 dark:text-neutral-50">Salons</h1>
        {data && <p className="text-[13px] text-neutral-400 mt-0.5">{data.total.toLocaleString('fr')} salons</p>}
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="flex flex-wrap gap-3">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Nom, ville, gérant…"
          className="flex-1 min-w-[200px]"
        />
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
          <option value="verified">Vérifié</option>
          <option value="unverified">Non vérifié</option>
        </select>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                <Th>Salon</Th>
                <Th>Ville</Th>
                <Th>Gérant</Th>
                <Th align="right">Équipe</Th>
                <Th>Statut</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className={i % 2 === 1 ? 'bg-neutral-50/30 dark:bg-neutral-900/30' : ''}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-5 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : !data?.data?.length
                ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState text="Aucun salon trouvé" />
                    </td>
                  </tr>
                )
                : data.data.map((s, i) => (
                    <tr key={s.id} className={`hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors ${i % 2 === 1 ? 'bg-neutral-50/30 dark:bg-neutral-900/30' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">{s.name}</span>
                          {s.is_verified && <ShieldCheck size={13} className="text-blue-500" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-neutral-500 dark:text-neutral-400">{s.city ?? '—'}</td>
                      <td className="px-4 py-3 text-[13px] text-neutral-500 dark:text-neutral-400">{s.owner?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-[13px] text-right text-neutral-600 dark:text-neutral-400">{s.hairdressers_count}</td>
                      <td className="px-4 py-3">
                        <StatusPill status={s.suspended ? 'suspended' : 'active'} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Link href={`/admin/salons/${s.id}`} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 transition-colors" title="Voir la fiche">
                            <Eye size={15} />
                          </Link>
                          {canManage && (
                            <>
                              <button
                                onClick={() => setConfirm({ type: s.is_verified ? 'unverify' : 'verify', row: s })}
                                className="p-1.5 rounded-lg text-neutral-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 transition-colors"
                                title={s.is_verified ? 'Retirer la vérification' : 'Vérifier'}
                              >
                                {s.is_verified ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
                              </button>
                              <button
                                onClick={() => setConfirm({ type: s.suspended ? 'unsuspend' : 'suspend', row: s })}
                                className="p-1.5 rounded-lg text-neutral-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600 transition-colors"
                                title={s.suspended ? 'Réactiver' : 'Suspendre'}
                              >
                                {s.suspended ? <UserCheck size={15} /> : <UserX size={15} />}
                              </button>
                            </>
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
        title={
          confirm?.type === 'verify'
            ? 'Vérifier le salon'
            : confirm?.type === 'unverify'
            ? 'Retirer la vérification'
            : confirm?.type === 'suspend'
            ? 'Suspendre le salon'
            : 'Réactiver le salon'
        }
        danger={confirm?.type === 'suspend' || confirm?.type === 'unverify'}
        message={
          confirm?.type === 'suspend' ? (
            <div className="flex flex-col gap-2">
              <p>
                Suspendre <strong>{confirm.row.name}</strong> ? Le salon disparaît des listings publics, son équipe et son historique restent intacts.
              </p>
              <input value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} placeholder="Raison (optionnel)" className={inputCls} />
            </div>
          ) : confirm ? (
            <>
              {confirm.type === 'verify' && (
                <>
                  Marquer <strong>{confirm.row.name}</strong> comme vérifié (badge de confiance) ?
                </>
              )}
              {confirm.type === 'unverify' && (
                <>
                  Retirer le badge de vérification de <strong>{confirm.row.name}</strong> ?
                </>
              )}
              {confirm.type === 'unsuspend' && (
                <>
                  Réactiver <strong>{confirm.row.name}</strong> ?
                </>
              )}
            </>
          ) : (
            ''
          )
        }
        onCancel={() => setConfirm(null)}
        onConfirm={run}
        loading={actionLoading}
      />
    </div>
  );
}
