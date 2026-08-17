'use client';

import { Fragment, useEffect, useState, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { adminApi, AdminApiError, formatDateTime, type AdminAuditLogRow, type Paginated } from '@/lib/adminApi';
import { Card, EmptyState, ErrorBanner, PermissionDenied, SearchInput, Skeleton, Th, Pagination, inputCls } from '../_components/ui';

export default function AuditLogsPage() {
  const [data, setData] = useState<Paginated<AdminAuditLogRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [action, setAction] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const json = await adminApi.get<Paginated<AdminAuditLogRow>>('/admin/audit-logs', { action, resource_type: resourceType, page, per_page: 30 });
      setData(json);
    } catch (e) {
      if (e instanceof AdminApiError && e.isForbidden) setForbidden(true);
      else setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [action, resourceType, page]);

  useEffect(() => {
    const t = setTimeout(load, action ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, action]);

  if (forbidden) return <PermissionDenied />;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold text-neutral-900 dark:text-neutral-50">Audit Logs</h1>
        <p className="text-[13px] text-neutral-400 mt-0.5">Journal immuable de toutes les actions admin — qui, quoi, quand, avant/après</p>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="flex flex-wrap gap-3">
        <SearchInput
          value={action}
          onChange={(v) => {
            setAction(v);
            setPage(1);
          }}
          placeholder="Filtrer par action (ex: users.suspend)…"
          className="flex-1 min-w-[220px]"
        />
        <input
          value={resourceType}
          onChange={(e) => {
            setResourceType(e.target.value);
            setPage(1);
          }}
          placeholder="Type de ressource (ex: user, review, badge)…"
          className={`${inputCls} w-64`}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                <Th></Th>
                <Th>Admin</Th>
                <Th>Action</Th>
                <Th>Ressource</Th>
                <Th>Quand</Th>
                <Th>IP</Th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
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
                      <EmptyState text="Aucune entrée" />
                    </td>
                  </tr>
                )
                : data.data.map((log, i) => (
                    <Fragment key={log.id}>
                      <tr
                        onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                        className={`cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors ${i % 2 === 1 ? 'bg-neutral-50/30 dark:bg-neutral-900/30' : ''}`}
                      >
                        <td className="px-4 py-3 text-neutral-300">{expanded === log.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                        <td className="px-4 py-3 text-[13px] text-neutral-900 dark:text-neutral-100">{log.admin?.name ?? `#${log.admin_id}`}</td>
                        <td className="px-4 py-3">
                          <code className="text-[11.5px] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">{log.action}</code>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-neutral-500 dark:text-neutral-400">
                          {log.resource_type}
                          {log.resource_id ? ` #${log.resource_id}` : ''}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-neutral-400">{formatDateTime(log.created_at)}</td>
                        <td className="px-4 py-3 text-[11px] text-neutral-300">{log.ip ?? '—'}</td>
                      </tr>
                      {expanded === log.id && (
                        <tr className="bg-neutral-50 dark:bg-neutral-900/60">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1">Avant</p>
                                <pre className="text-[11px] bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-lg p-3 overflow-x-auto text-neutral-600 dark:text-neutral-400">
                                  {log.old_value ? JSON.stringify(log.old_value, null, 2) : '—'}
                                </pre>
                              </div>
                              <div>
                                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1">Après</p>
                                <pre className="text-[11px] bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-lg p-3 overflow-x-auto text-neutral-600 dark:text-neutral-400">
                                  {log.new_value ? JSON.stringify(log.new_value, null, 2) : '—'}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
    </div>
  );
}
