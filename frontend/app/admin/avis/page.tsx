'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, EyeOff, Eye, Trash2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('chair_admin_token') : null;

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400 text-[13px]">
      {'★'.repeat(rating)}
      <span className="text-neutral-200">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return status === 'visible'
    ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">Visible</span>
    : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-500">Masqué</span>;
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

interface Review {
  id: number;
  author_name: string;
  hairdresser_name: string;
  rating: number;
  comment: string;
  created_at: string;
  status: 'visible' | 'hidden';
}

interface ReviewsResponse {
  data: Review[];
  total: number;
  last_page: number;
}

export default function AvisPage() {
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<{ type: 'toggle' | 'delete'; review: Review } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const token = getToken();
    const params = new URLSearchParams({ rating: ratingFilter, status: statusFilter, page: String(page) });
    try {
      const res = await fetch(`${API_URL}/admin/reviews?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      setData(await res.json());
    } catch { setError('Erreur de chargement'); }
    finally { setLoading(false); }
  }, [ratingFilter, statusFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleAction() {
    if (!confirm) return;
    setActionLoading(true);
    const token = getToken();
    try {
      if (confirm.type === 'delete') {
        await fetch(`${API_URL}/admin/reviews/${confirm.review.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      } else {
        const action = confirm.review.status === 'visible' ? 'hide' : 'show';
        await fetch(`${API_URL}/admin/reviews/${confirm.review.id}/${action}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      }
      fetchData();
    } catch { setError('Action impossible'); }
    finally { setActionLoading(false); setConfirm(null); }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold text-neutral-900">Avis</h1>
        {data && <p className="text-[13px] text-neutral-400 mt-0.5">{data.total.toLocaleString('fr')} avis</p>}
      </div>

      {error && <div className="px-4 py-3 bg-red-50 rounded-xl text-[13px] text-red-600">{error}</div>}

      <div className="flex flex-wrap gap-3">
        <select value={ratingFilter} onChange={(e) => { setRatingFilter(e.target.value); setPage(1); }} className="px-3 py-2.5 bg-white border border-neutral-200 rounded-xl text-[13px] text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-300">
          <option value="">Toutes les notes</option>
          <option value="lte2">≤ 2 étoiles (signalés)</option>
          <option value="1">1 étoile</option>
          <option value="2">2 étoiles</option>
          <option value="3">3 étoiles</option>
          <option value="4">4 étoiles</option>
          <option value="5">5 étoiles</option>
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2.5 bg-white border border-neutral-200 rounded-xl text-[13px] text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-300">
          <option value="">Tous statuts</option>
          <option value="visible">Visible</option>
          <option value="hidden">Masqué</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/50">
                {['Auteur', 'Coiffeur', 'Note', 'Commentaire', 'Date', 'Statut', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className={i % 2 === 1 ? 'bg-neutral-50/30' : ''}>
                    {Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>)}
                  </tr>
                ))
                : !data?.data?.length
                ? <tr><td colSpan={7} className="px-4 py-12 text-center text-[13px] text-neutral-400">Aucun avis trouvé</td></tr>
                : data.data.map((r, i) => (
                  <tr key={r.id} className={`hover:bg-neutral-50 transition-colors ${i % 2 === 1 ? 'bg-neutral-50/30' : ''}`}>
                    <td className="px-4 py-3 text-[13px] font-medium text-neutral-900">{r.author_name}</td>
                    <td className="px-4 py-3 text-[13px] text-neutral-600">{r.hairdresser_name}</td>
                    <td className="px-4 py-3"><Stars rating={r.rating} /></td>
                    <td className="px-4 py-3 text-[13px] text-neutral-600 max-w-[200px]">
                      <span className="block truncate" title={r.comment}>{r.comment}</span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-neutral-400">{formatDate(r.created_at)}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setConfirm({ type: 'toggle', review: r })}
                          className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
                          title={r.status === 'visible' ? 'Masquer' : 'Afficher'}
                        >
                          {r.status === 'visible' ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <button
                          onClick={() => setConfirm({ type: 'delete', review: r })}
                          className="p-1.5 rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={15} />
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
        title={confirm?.type === 'delete' ? "Supprimer l'avis" : confirm?.review.status === 'visible' ? "Masquer l'avis" : "Afficher l'avis"}
        message={confirm?.type === 'delete' ? 'Supprimer définitivement cet avis ?' : confirm?.review.status === 'visible' ? 'Masquer cet avis aux utilisateurs ?' : 'Rendre cet avis visible ?'}
        onCancel={() => setConfirm(null)}
        onConfirm={handleAction}
        loading={actionLoading}
      />
    </div>
  );
}
