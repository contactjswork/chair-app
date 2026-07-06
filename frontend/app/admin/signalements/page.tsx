'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CheckCheck, Trash2, UserX } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('chair_admin_token') : null;

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    post: 'bg-blue-100 text-blue-700',
    review: 'bg-amber-100 text-amber-700',
    user: 'bg-violet-100 text-violet-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${map[type] ?? 'bg-neutral-100 text-neutral-500'}`}>
      {type === 'post' ? 'Post' : type === 'review' ? 'Avis' : 'Utilisateur'}
    </span>
  );
}

function ConfirmModal({ open, title, message, onCancel, onConfirm, loading }: {
  open: boolean; title: string; message: string;
  onCancel: () => void; onConfirm: () => void; loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 flex flex-col gap-4">
        <h3 className="text-[16px] font-bold text-neutral-900">{title}</h3>
        <p className="text-[13px] text-neutral-500">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-[13px] font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors">Annuler</button>
          <button onClick={onConfirm} disabled={loading} className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50">
            {loading ? 'En cours…' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-neutral-100 rounded-xl ${className ?? ''}`} />;
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-1 justify-center mt-4">
      <button onClick={() => onChange(page - 1)} disabled={page === 1} className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"><ChevronLeft size={16} /></button>
      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
        <button key={p} onClick={() => onChange(p)} className={`w-8 h-8 rounded-lg text-[13px] font-medium ${p === page ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}>{p}</button>
      ))}
      <button onClick={() => onChange(page + 1)} disabled={page === totalPages} className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"><ChevronRight size={16} /></button>
    </div>
  );
}

interface Report {
  id: number;
  type: string;
  reported_user_name: string;
  reported_user_id: number;
  reason: string;
  reporter_name: string;
  created_at: string;
  content_id?: number;
}

interface ReportsResponse {
  data: Report[];
  total: number;
  last_page: number;
}

export default function SignalementsPage() {
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<{ type: 'ignore' | 'delete_content' | 'suspend_author'; report: Report } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`${API_URL}/admin/reports?page=${page}`, { headers: { Authorization: `Bearer ${token}` } });
      setData(await res.json());
    } catch { setError('Erreur de chargement'); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleAction() {
    if (!confirm) return;
    setActionLoading(true);
    const token = getToken();
    try {
      if (confirm.type === 'ignore') {
        await fetch(`${API_URL}/admin/reports/${confirm.report.id}/ignore`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      } else if (confirm.type === 'delete_content') {
        await fetch(`${API_URL}/admin/reports/${confirm.report.id}/delete-content`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      } else {
        await fetch(`${API_URL}/admin/users/${confirm.report.reported_user_id}/suspend`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      }
      fetchData();
    } catch { setError('Action impossible'); }
    finally { setActionLoading(false); setConfirm(null); }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const modalTitles: Record<string, string> = {
    ignore: 'Ignorer le signalement',
    delete_content: 'Supprimer le contenu',
    suspend_author: 'Suspendre l'auteur',
  };
  const modalMessages: Record<string, string> = {
    ignore: 'Marquer ce signalement comme traité (ignoré) ?',
    delete_content: 'Supprimer définitivement le contenu signalé ?',
    suspend_author: `Suspendre le compte de ${confirm?.report?.reported_user_name ?? 'cet utilisateur'} ?`,
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold text-neutral-900">Signalements</h1>
        {data && <p className="text-[13px] text-neutral-400 mt-0.5">{data.total} signalements en attente</p>}
      </div>

      {error && <div className="px-4 py-3 bg-red-50 rounded-xl text-[13px] text-red-600">{error}</div>}

      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/50">
                {['Type', 'Auteur signalé', 'Raison', 'Signalé par', 'Date', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className={i % 2 === 1 ? 'bg-neutral-50/30' : ''}>
                    {Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>)}
                  </tr>
                ))
                : !data?.data?.length
                ? <tr><td colSpan={6} className="px-4 py-12 text-center text-[13px] text-neutral-400">Aucun signalement en attente</td></tr>
                : data.data.map((r, i) => (
                  <tr key={r.id} className={`hover:bg-neutral-50 transition-colors ${i % 2 === 1 ? 'bg-neutral-50/30' : ''}`}>
                    <td className="px-4 py-3"><TypeBadge type={r.type} /></td>
                    <td className="px-4 py-3 text-[13px] font-medium text-neutral-900">{r.reported_user_name}</td>
                    <td className="px-4 py-3 text-[13px] text-neutral-600 max-w-[180px]">
                      <span className="block truncate" title={r.reason}>{r.reason}</span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-neutral-500">{r.reporter_name}</td>
                    <td className="px-4 py-3 text-[12px] text-neutral-400">{formatDate(r.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setConfirm({ type: 'ignore', report: r })}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-neutral-500 hover:bg-neutral-100 transition-colors"
                          title="Ignorer"
                        >
                          <CheckCheck size={13} /> Ignorer
                        </button>
                        <button
                          onClick={() => setConfirm({ type: 'delete_content', report: r })}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-red-500 hover:bg-red-50 transition-colors"
                          title="Supprimer le contenu"
                        >
                          <Trash2 size={13} /> Supprimer
                        </button>
                        <button
                          onClick={() => setConfirm({ type: 'suspend_author', report: r })}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Suspendre l'auteur"
                        >
                          <UserX size={13} /> Suspendre
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {data && data.last_page > 1 && (
          <div className="px-4 py-3 border-t border-neutral-100">
            <Pagination page={page} totalPages={data.last_page} onChange={setPage} />
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!confirm}
        title={confirm ? modalTitles[confirm.type] : ''}
        message={confirm ? modalMessages[confirm.type] : ''}
        onCancel={() => setConfirm(null)}
        onConfirm={handleAction}
        loading={actionLoading}
      />
    </div>
  );
}
