'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Flag, EyeOff, Eye, CheckCircle2, Trash2, ShieldAlert } from 'lucide-react';
import {
  adminApi,
  AdminApiError,
  formatDate,
  hasPermission,
  getStoredAdminUser,
  PERMISSIONS,
  type ModerationSummary,
  type AdminReviewRow,
  type AdminReportRow,
  type Paginated,
} from '@/lib/adminApi';
import { Card, ConfirmModal, EmptyState, ErrorBanner, PermissionDenied, Skeleton, StatTile, Th, Pagination, selectCls } from '../_components/ui';

type Tab = 'resume' | 'avis' | 'signalements';

type ReviewConfirm = { type: 'hide' | 'show' | 'mark_reviewed' | 'delete'; row: AdminReviewRow };
type ReportConfirm = { type: 'ignore' | 'delete_content'; row: AdminReportRow };

function ModerationPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const tab: Tab = params.get('tab') === 'avis' ? 'avis' : params.get('tab') === 'signalements' ? 'signalements' : 'resume';
  const admin = getStoredAdminUser();
  const canModerate = hasPermission(admin, PERMISSIONS.CONTENT_MODERATE);
  const canManageReports = hasPermission(admin, PERMISSIONS.REPORTS_MANAGE);

  const [summary, setSummary] = useState<ModerationSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .get<ModerationSummary>('/admin/moderation/summary')
      .then(setSummary)
      .catch((e) => {
        if (e instanceof AdminApiError && e.isForbidden) setForbidden(true);
      })
      .finally(() => setSummaryLoading(false));
  }, []);

  if (forbidden) return <PermissionDenied />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-neutral-900 dark:text-neutral-50">Modération</h1>
          <p className="text-[13px] text-neutral-400 mt-0.5">Signalements et avis à faible note, files réelles unifiées</p>
        </div>
        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1">
          <TabButton active={tab === 'resume'} onClick={() => router.push('/admin/moderation')}>
            Résumé
          </TabButton>
          <TabButton active={tab === 'avis'} onClick={() => router.push('/admin/moderation?tab=avis')}>
            Avis
          </TabButton>
          <TabButton active={tab === 'signalements'} onClick={() => router.push('/admin/moderation?tab=signalements')}>
            Signalements
          </TabButton>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {tab === 'resume' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {summaryLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)
          ) : summary ? (
            <>
              <div onClick={() => router.push('/admin/moderation?tab=signalements')} className="cursor-pointer">
                <StatTile icon={Flag} value={summary.pending_reports} label="Signalements en attente" tone="red" />
              </div>
              <div onClick={() => router.push('/admin/moderation?tab=avis')} className="cursor-pointer">
                <StatTile icon={ShieldAlert} value={summary.low_rating_needs_attention} label="Avis ≤2★ non traités" tone="amber" />
              </div>
              <StatTile icon={EyeOff} value={summary.hidden_reviews} label="Avis masqués" tone="neutral" />
            </>
          ) : null}
        </div>
      )}

      {tab === 'avis' && <ReviewsQueue canModerate={canModerate} onError={setError} />}
      {tab === 'signalements' && <ReportsQueue canManage={canManageReports} onError={setError} />}
    </div>
  );
}

function ReviewsQueue({ canModerate, onError }: { canModerate: boolean; onError: (m: string) => void }) {
  const [data, setData] = useState<Paginated<AdminReviewRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<ReviewConfirm | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const json = await adminApi.get<Paginated<AdminReviewRow>>('/admin/reviews', { rating, status, page, per_page: 20 });
      setData(json);
    } catch {
      onError('Erreur de chargement des avis');
    } finally {
      setLoading(false);
    }
  }, [rating, status, page, onError]);

  useEffect(() => {
    // Chargement initial de la file — fetch au montage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  async function run() {
    if (!confirm) return;
    setActionLoading(true);
    try {
      const { type, row } = confirm;
      if (type === 'hide') await adminApi.post(`/admin/reviews/${row.id}/hide`);
      else if (type === 'show') await adminApi.post(`/admin/reviews/${row.id}/show`);
      else if (type === 'mark_reviewed') await adminApi.post(`/admin/reviews/${row.id}/mark-reviewed`);
      else if (type === 'delete') await adminApi.delete(`/admin/reviews/${row.id}`);
      fetchData();
    } catch {
      onError('Action impossible');
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <select value={rating} onChange={(e) => { setRating(e.target.value); setPage(1); }} className={selectCls}>
          <option value="">Toutes les notes</option>
          <option value="lte2">≤ 2 étoiles (signalés)</option>
          <option value="1">1 étoile</option>
          <option value="2">2 étoiles</option>
          <option value="3">3 étoiles</option>
          <option value="4">4 étoiles</option>
          <option value="5">5 étoiles</option>
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={selectCls}>
          <option value="">Tous statuts</option>
          <option value="visible">Visible</option>
          <option value="hidden">Masqué</option>
        </select>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                <Th>Auteur</Th>
                <Th>Coiffeur</Th>
                <Th>Note</Th>
                <Th>Commentaire</Th>
                <Th>Date</Th>
                <Th>Statut</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-5 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : !data?.data?.length
                ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState text="Aucun avis trouvé" />
                    </td>
                  </tr>
                )
                : data.data.map((r, i) => (
                    <tr key={r.id} className={`${i % 2 === 1 ? 'bg-neutral-50/30 dark:bg-neutral-900/30' : ''} ${r.needs_attention ? 'bg-amber-50/50 dark:bg-amber-500/5' : ''}`}>
                      <td className="px-4 py-3 text-[13px] text-neutral-900 dark:text-neutral-100">{r.author_name}</td>
                      <td className="px-4 py-3 text-[13px] text-neutral-500 dark:text-neutral-400">{r.hairdresser_name}</td>
                      <td className="px-4 py-3 text-[13px] text-amber-500 font-medium">{'★'.repeat(r.rating)}</td>
                      <td className="px-4 py-3 text-[13px] text-neutral-600 dark:text-neutral-400 max-w-[280px] truncate" title={r.comment}>
                        {r.comment}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-neutral-400">{formatDate(r.created_at)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            r.status === 'hidden' ? 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                          }`}
                        >
                          {r.status === 'hidden' ? 'Masqué' : r.needs_attention ? 'À traiter' : 'Visible'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {canModerate && r.needs_attention && (
                            <button onClick={() => setConfirm({ type: 'mark_reviewed', row: r })} className="p-1.5 rounded-lg text-neutral-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 transition-colors" title="Marquer comme traité">
                              <CheckCircle2 size={15} />
                            </button>
                          )}
                          {canModerate && (
                            <button
                              onClick={() => setConfirm({ type: r.status === 'hidden' ? 'show' : 'hide', row: r })}
                              className="p-1.5 rounded-lg text-neutral-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600 transition-colors"
                              title={r.status === 'hidden' ? 'Réafficher' : 'Masquer'}
                            >
                              {r.status === 'hidden' ? <Eye size={15} /> : <EyeOff size={15} />}
                            </button>
                          )}
                          {canModerate && (
                            <button onClick={() => setConfirm({ type: 'delete', row: r })} className="p-1.5 rounded-lg text-neutral-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors" title="Supprimer">
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
        title={
          confirm?.type === 'delete' ? "Supprimer l'avis" : confirm?.type === 'hide' ? "Masquer l'avis" : confirm?.type === 'show' ? "Réafficher l'avis" : 'Marquer comme traité'
        }
        danger={confirm?.type === 'delete' || confirm?.type === 'hide'}
        message={
          confirm?.type === 'delete' ? (
            <>Supprimer définitivement cet avis de <strong>{confirm.row.author_name}</strong> ? Irréversible.</>
          ) : confirm?.type === 'hide' ? (
            'Masquer cet avis des listings publics ?'
          ) : confirm?.type === 'show' ? (
            'Réafficher cet avis publiquement ?'
          ) : (
            "Marquer cet avis sévère comme traité sans le masquer (avis légitime) ?"
          )
        }
        onCancel={() => setConfirm(null)}
        onConfirm={run}
        loading={actionLoading}
      />
    </>
  );
}

function ReportsQueue({ canManage, onError }: { canManage: boolean; onError: (m: string) => void }) {
  const [data, setData] = useState<Paginated<AdminReportRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<ReportConfirm | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const json = await adminApi.get<Paginated<AdminReportRow>>('/admin/reports', { page, per_page: 20 });
      setData(json);
    } catch {
      onError('Erreur de chargement des signalements');
    } finally {
      setLoading(false);
    }
  }, [page, onError]);

  useEffect(() => {
    // Chargement initial de la file — fetch au montage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  async function run() {
    if (!confirm) return;
    setActionLoading(true);
    try {
      if (confirm.type === 'ignore') await adminApi.post(`/admin/reports/${confirm.row.id}/ignore`);
      else await adminApi.post(`/admin/reports/${confirm.row.id}/delete-content`);
      fetchData();
    } catch {
      onError('Action impossible');
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  }

  return (
    <>
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-5 flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : !data?.data?.length ? (
          <EmptyState text="Aucun signalement en attente" />
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {data.data.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 px-5 py-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">{r.type}</span>
                    <span className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">Contenu de {r.reported_user_name}</span>
                  </div>
                  <p className="text-[13px] text-neutral-500 dark:text-neutral-400">{r.reason}</p>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Signalé par {r.reporter_name} · {formatDate(r.created_at)}
                  </p>
                </div>
                {canManage && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConfirm({ type: 'ignore', row: r })}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                    >
                      Ignorer
                    </button>
                    <button
                      onClick={() => setConfirm({ type: 'delete_content', row: r })}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                    >
                      Supprimer le contenu
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {data && data.last_page > 1 && (
          <div className="px-4 py-3 border-t border-neutral-100 dark:border-neutral-800">
            <Pagination page={page} totalPages={data.last_page} onChange={setPage} />
          </div>
        )}
      </Card>

      <ConfirmModal
        open={!!confirm}
        title={confirm?.type === 'ignore' ? 'Ignorer le signalement' : 'Supprimer le contenu signalé'}
        danger={confirm?.type === 'delete_content'}
        message={
          confirm?.type === 'ignore' ? (
            'Marquer ce signalement comme résolu sans action sur le contenu ?'
          ) : (
            <>Supprimer définitivement le contenu signalé (avis ou publication) de <strong>{confirm?.row.reported_user_name}</strong> ? Irréversible.</>
          )
        }
        onCancel={() => setConfirm(null)}
        onConfirm={run}
        loading={actionLoading}
      />
    </>
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

export default function ModerationPage() {
  return (
    <Suspense fallback={<Skeleton className="h-40" />}>
      <ModerationPageInner />
    </Suspense>
  );
}
