'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, ShieldCheck, ShieldOff, EyeOff, Check, X as XIcon } from 'lucide-react';
import {
  adminApi,
  AdminApiError,
  formatDate,
  hasPermission,
  getStoredAdminUser,
  PERMISSIONS,
  type AdminHairdresserRow,
  type PendingDiploma,
  type Paginated,
} from '@/lib/adminApi';
import { Card, ConfirmModal, EmptyState, ErrorBanner, PermissionDenied, SearchInput, Skeleton, StatusPill, Th, Pagination } from '../_components/ui';

type ConfirmAction =
  | { type: 'verify' | 'unverify' | 'hide' | 'unhide'; row: AdminHairdresserRow }
  | { type: 'diploma_approve' | 'diploma_reject'; diploma: PendingDiploma };

function CoiffeursPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = params.get('tab') === 'diplomes' ? 'diplomes' : 'liste';
  const admin = getStoredAdminUser();
  const canVerify = hasPermission(admin, PERMISSIONS.HAIRDRESSERS_VERIFY);
  const canVisibility = hasPermission(admin, PERMISSIONS.HAIRDRESSERS_VISIBILITY);

  const [data, setData] = useState<Paginated<AdminHairdresserRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);

  const [diplomas, setDiplomas] = useState<PendingDiploma[] | null>(null);
  const [diplomasLoading, setDiplomasLoading] = useState(true);

  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const json = await adminApi.get<Paginated<AdminHairdresserRow>>('/admin/hairdressers', { search, city, page });
      setData(json);
    } catch (e) {
      if (e instanceof AdminApiError && e.isForbidden) setForbidden(true);
      else setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [search, city, page]);

  const fetchDiplomas = useCallback(async () => {
    setDiplomasLoading(true);
    try {
      const json = await adminApi.get<{ data: PendingDiploma[] }>('/admin/diplomas/pending');
      setDiplomas(json.data);
    } catch {
      setDiplomas([]);
    } finally {
      setDiplomasLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchList, search || city ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchList, search, city]);

  useEffect(() => {
    // Chargement initial de la file de diplômes en attente — fetch au montage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDiplomas();
  }, [fetchDiplomas]);

  async function runConfirm() {
    if (!confirm) return;
    setActionLoading(true);
    try {
      if (confirm.type === 'verify') await adminApi.post(`/admin/hairdressers/${confirm.row.profile_id}/verify`);
      else if (confirm.type === 'unverify') await adminApi.post(`/admin/hairdressers/${confirm.row.profile_id}/unverify`);
      else if (confirm.type === 'hide') await adminApi.post(`/admin/hairdressers/${confirm.row.profile_id}/hide`);
      else if (confirm.type === 'unhide') await adminApi.post(`/admin/hairdressers/${confirm.row.profile_id}/unhide`);
      else if (confirm.type === 'diploma_approve') await adminApi.post(`/admin/diplomas/${confirm.diploma.id}/approve`);
      else if (confirm.type === 'diploma_reject') await adminApi.post(`/admin/diplomas/${confirm.diploma.id}/reject`);

      if (confirm.type.startsWith('diploma')) fetchDiplomas();
      else fetchList();
    } catch {
      setError('Action impossible');
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  }

  if (forbidden) return <PermissionDenied />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-neutral-900 dark:text-neutral-50">Professionnels</h1>
          {tab === 'liste' && data && <p className="text-[13px] text-neutral-400 mt-0.5">{data.total.toLocaleString('fr')} coiffeurs</p>}
        </div>
        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1">
          <TabButton active={tab === 'liste'} onClick={() => router.push('/admin/coiffeurs')}>
            Liste
          </TabButton>
          <TabButton active={tab === 'diplomes'} onClick={() => router.push('/admin/coiffeurs?tab=diplomes')} badge={diplomas?.length}>
            Diplômes en attente
          </TabButton>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {tab === 'liste' ? (
        <>
          <div className="flex flex-wrap gap-3">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Rechercher un coiffeur…"
              className="flex-1 min-w-[200px]"
            />
            <input
              type="text"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setPage(1);
              }}
              placeholder="Ville…"
              className="px-3 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-[13px] text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-300 w-36"
            />
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px]">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                    <Th>Coiffeur</Th>
                    <Th>Ville</Th>
                    <Th>Type</Th>
                    <Th align="right">Score</Th>
                    <Th align="right">Note</Th>
                    <Th align="right">Avis</Th>
                    <Th align="right">RDV</Th>
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
                    : !data?.data?.length
                    ? (
                      <tr>
                        <td colSpan={9}>
                          <EmptyState text="Aucun coiffeur trouvé" />
                        </td>
                      </tr>
                    )
                    : data.data.map((h, i) => (
                        <tr key={h.profile_id} className={`hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors ${i % 2 === 1 ? 'bg-neutral-50/30 dark:bg-neutral-900/30' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[12px] font-bold text-neutral-600 dark:text-neutral-300 flex-shrink-0">
                                {h.name?.[0]?.toUpperCase() ?? '?'}
                              </div>
                              <span className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">{h.name}</span>
                              {h.is_verified && <ShieldCheck size={13} className="text-blue-500" />}
                              {h.is_hidden && <EyeOff size={13} className="text-neutral-400" />}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[13px] text-neutral-500 dark:text-neutral-400">{h.city ?? '—'}</td>
                          <td className="px-4 py-3 text-[11px] font-medium text-neutral-600 dark:text-neutral-400">{h.type === 'salon' ? 'Salon' : 'Indép.'}</td>
                          <td className="px-4 py-3 text-[13px] text-right font-medium text-neutral-900 dark:text-neutral-100">{h.score ?? 0}</td>
                          <td className="px-4 py-3 text-[13px] text-right text-amber-500 font-medium">★ {h.rating?.toFixed(1) ?? '—'}</td>
                          <td className="px-4 py-3 text-[13px] text-right text-neutral-600 dark:text-neutral-400">{h.reviews_count}</td>
                          <td className="px-4 py-3 text-[13px] text-right text-neutral-600 dark:text-neutral-400">{h.appointments}</td>
                          <td className="px-4 py-3">
                            <StatusPill status={h.status} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              <Link href={`/admin/coiffeurs/${h.profile_id}`} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 transition-colors" title="Voir la fiche">
                                <Eye size={15} />
                              </Link>
                              {canVerify && (
                                <button
                                  onClick={() => setConfirm({ type: h.is_verified ? 'unverify' : 'verify', row: h })}
                                  className="p-1.5 rounded-lg text-neutral-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 transition-colors"
                                  title={h.is_verified ? "Retirer l'identité vérifiée" : 'Vérifier identité'}
                                >
                                  {h.is_verified ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
                                </button>
                              )}
                              {canVisibility && (
                                <button
                                  onClick={() => setConfirm({ type: h.is_hidden ? 'unhide' : 'hide', row: h })}
                                  className="p-1.5 rounded-lg text-neutral-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600 transition-colors"
                                  title={h.is_hidden ? 'Rendre visible' : 'Masquer le profil'}
                                >
                                  {h.is_hidden ? <Eye size={15} /> : <EyeOff size={15} />}
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
        </>
      ) : (
        <Card className="overflow-hidden">
          {diplomasLoading ? (
            <div className="p-5 flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : !diplomas?.length ? (
            <EmptyState text="Aucun diplôme en attente de vérification" />
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {diplomas.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-4 px-5 py-4 flex-wrap">
                  <div>
                    <p className="text-[13px] font-semibold text-neutral-900 dark:text-neutral-100">{d.name}</p>
                    <p className="text-[12px] text-neutral-400">
                      {d.email} · {d.city ?? '—'} · soumis le {formatDate(d.submitted_at)}
                    </p>
                    {d.diploma && <p className="text-[12px] text-neutral-500 mt-1">Diplôme déclaré : {d.diploma}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {d.diploma_document_url && (
                      <a
                        href={d.diploma_document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                      >
                        Voir le document
                      </a>
                    )}
                    {canVerify && (
                      <>
                        <button
                          onClick={() => setConfirm({ type: 'diploma_reject', diploma: d })}
                          className="p-2 rounded-lg text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                          title="Rejeter"
                        >
                          <XIcon size={15} />
                        </button>
                        <button
                          onClick={() => setConfirm({ type: 'diploma_approve', diploma: d })}
                          className="p-2 rounded-lg text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                          title="Approuver"
                        >
                          <Check size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <ConfirmModal
        open={!!confirm}
        title={confirmTitle(confirm)}
        message={confirmMessage(confirm)}
        danger={confirm?.type === 'hide' || confirm?.type === 'unverify' || confirm?.type === 'diploma_reject'}
        confirmLabel={confirm?.type === 'diploma_approve' ? 'Approuver' : confirm?.type === 'diploma_reject' ? 'Rejeter' : 'Confirmer'}
        onCancel={() => setConfirm(null)}
        onConfirm={runConfirm}
        loading={actionLoading}
      />
    </div>
  );
}

function confirmTitle(c: ConfirmAction | null): string {
  if (!c) return '';
  switch (c.type) {
    case 'verify':
      return "Vérifier l'identité";
    case 'unverify':
      return "Retirer l'identité vérifiée";
    case 'hide':
      return 'Masquer le profil';
    case 'unhide':
      return 'Rendre le profil visible';
    case 'diploma_approve':
      return 'Approuver le diplôme';
    case 'diploma_reject':
      return 'Rejeter le diplôme';
  }
}

function confirmMessage(c: ConfirmAction | null): React.ReactNode {
  if (!c) return '';
  switch (c.type) {
    case 'diploma_approve':
      return <>Approuver le diplôme de <strong>{c.diploma.name}</strong> ?</>;
    case 'diploma_reject':
      return <>Rejeter le diplôme de <strong>{c.diploma.name}</strong> ?</>;
    case 'verify':
      return <>Marquer l&apos;identité de <strong>{c.row.name}</strong> comme vérifiée (badge de confiance) ?</>;
    case 'unverify':
      return <>Retirer le badge d&apos;identité vérifiée de <strong>{c.row.name}</strong> ?</>;
    case 'hide':
      return <>Masquer le profil de <strong>{c.row.name}</strong> des listings publics ? Son espace pro reste accessible, seule sa visibilité change.</>;
    case 'unhide':
      return <>Rendre le profil de <strong>{c.row.name}</strong> à nouveau visible publiquement ?</>;
  }
}

function TabButton({ active, onClick, children, badge }: { active: boolean; onClick: () => void; children: React.ReactNode; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${
        active ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700'
      }`}
    >
      {children}
      {!!badge && (
        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold">
          {badge}
        </span>
      )}
    </button>
  );
}

export default function CoiffeursPage() {
  return (
    <Suspense fallback={<Skeleton className="h-40" />}>
      <CoiffeursPageInner />
    </Suspense>
  );
}
