'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, Eye, CheckCircle, UserX, ChevronLeft, ChevronRight } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('chair_admin_token') : null;

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    suspended: 'bg-red-100 text-red-700',
    pending: 'bg-amber-100 text-amber-700',
  };
  const labels: Record<string, string> = { active: 'Actif', suspended: 'Suspendu', pending: 'En attente' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${map[status] ?? 'bg-neutral-100 text-neutral-500'}`}>
      {labels[status] ?? status}
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
  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1);
  return (
    <div className="flex items-center gap-1 justify-center mt-4">
      <button onClick={() => onChange(page - 1)} disabled={page === 1} className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 transition-colors"><ChevronLeft size={16} /></button>
      {pages.map((p) => (
        <button key={p} onClick={() => onChange(p)} className={`w-8 h-8 rounded-lg text-[13px] font-medium transition-colors ${p === page ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}>{p}</button>
      ))}
      <button onClick={() => onChange(page + 1)} disabled={page === totalPages} className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 transition-colors"><ChevronRight size={16} /></button>
    </div>
  );
}

interface Hairdresser {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  city?: string;
  type: 'independent' | 'salon';
  chair_score: number;
  avg_rating: number;
  reviews_count: number;
  appointments_count: number;
  status: string;
  is_pro: boolean;
}

interface HairdressersResponse {
  data: Hairdresser[];
  total: number;
  last_page: number;
}

export default function CoiffeursPage() {
  const [data, setData] = useState<HairdressersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [proFilter, setProFilter] = useState('');
  const [city, setCity] = useState('');
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<{ type: 'validate' | 'suspend'; h: Hairdresser } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const token = getToken();
    const params = new URLSearchParams({ search, type: typeFilter, status: statusFilter, is_pro: proFilter, city, page: String(page) });
    try {
      const res = await fetch(`${API_URL}/admin/hairdressers?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      setData(await res.json());
    } catch { setError('Erreur de chargement'); }
    finally { setLoading(false); }
  }, [search, typeFilter, statusFilter, proFilter, city, page]);

  useEffect(() => {
    const t = setTimeout(fetchData, search || city ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchData]);

  async function handleAction() {
    if (!confirm) return;
    setActionLoading(true);
    const token = getToken();
    try {
      const action = confirm.type === 'validate' ? 'validate' : confirm.h.status === 'suspended' ? 'reactivate' : 'suspend';
      await fetch(`${API_URL}/admin/hairdressers/${confirm.h.id}/${action}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch { setError('Action impossible'); }
    finally { setActionLoading(false); setConfirm(null); }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold text-neutral-900">Coiffeurs</h1>
        {data && <p className="text-[13px] text-neutral-400 mt-0.5">{data.total.toLocaleString('fr')} coiffeurs</p>}
      </div>

      {error && <div className="px-4 py-3 bg-red-50 rounded-xl text-[13px] text-red-600">{error}</div>}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher…"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300"
          />
        </div>
        <input
          type="text" value={city} onChange={(e) => { setCity(e.target.value); setPage(1); }}
          placeholder="Ville…"
          className="px-3 py-2.5 bg-white border border-neutral-200 rounded-xl text-[13px] text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-300 w-32"
        />
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="px-3 py-2.5 bg-white border border-neutral-200 rounded-xl text-[13px] text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-300">
          <option value="">Tous types</option>
          <option value="independent">Indépendant</option>
          <option value="salon">Salon</option>
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2.5 bg-white border border-neutral-200 rounded-xl text-[13px] text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-300">
          <option value="">Tous statuts</option>
          <option value="active">Actif</option>
          <option value="pending">En attente</option>
          <option value="suspended">Suspendu</option>
        </select>
        <select value={proFilter} onChange={(e) => { setProFilter(e.target.value); setPage(1); }} className="px-3 py-2.5 bg-white border border-neutral-200 rounded-xl text-[13px] text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-300">
          <option value="">PRO+</option>
          <option value="1">PRO+ actif</option>
          <option value="0">Sans PRO+</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/50">
                {['Coiffeur', 'Ville', 'Type', 'Score', 'Note', 'Avis', 'RDV', 'Statut', 'PRO+', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className={i % 2 === 1 ? 'bg-neutral-50/30' : ''}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>
                    ))}
                  </tr>
                ))
                : !data?.data?.length
                ? <tr><td colSpan={10} className="px-4 py-12 text-center text-[13px] text-neutral-400">Aucun coiffeur trouvé</td></tr>
                : data.data.map((h, i) => (
                  <tr key={h.id} className={`hover:bg-neutral-50 transition-colors ${i % 2 === 1 ? 'bg-neutral-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {h.avatar
                          ? <img src={h.avatar} alt={h.name} className="w-8 h-8 rounded-full object-cover" />
                          : <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-[12px] font-bold text-neutral-600">{h.name?.[0]?.toUpperCase()}</div>
                        }
                        <span className="text-[13px] font-medium text-neutral-900">{h.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-neutral-500">{h.city ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-medium text-neutral-600">
                        {h.type === 'salon' ? 'Salon' : 'Indép.'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] font-medium text-neutral-900">{h.chair_score ?? 0}<span className="text-neutral-300">/100</span></td>
                    <td className="px-4 py-3 text-[13px] text-amber-500 font-medium">★ {h.avg_rating?.toFixed(1) ?? '—'}</td>
                    <td className="px-4 py-3 text-[13px] text-neutral-600">{h.reviews_count}</td>
                    <td className="px-4 py-3 text-[13px] text-neutral-600">{h.appointments_count}</td>
                    <td className="px-4 py-3"><StatusBadge status={h.status} /></td>
                    <td className="px-4 py-3">
                      {h.is_pro
                        ? <span className="text-[11px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">PRO+</span>
                        : <span className="text-[11px] text-neutral-300">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Link href={`/admin/utilisateurs/${h.id}`} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"><Eye size={15} /></Link>
                        {h.status === 'pending' && (
                          <button onClick={() => setConfirm({ type: 'validate', h })} className="p-1.5 rounded-lg text-neutral-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors" title="Valider">
                            <CheckCircle size={15} />
                          </button>
                        )}
                        <button onClick={() => setConfirm({ type: 'suspend', h })} className="p-1.5 rounded-lg text-neutral-400 hover:bg-amber-50 hover:text-amber-600 transition-colors" title={h.status === 'suspended' ? 'Réactiver' : 'Suspendre'}>
                          <UserX size={15} />
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
        title={confirm?.type === 'validate' ? 'Valider le coiffeur' : confirm?.h?.status === 'suspended' ? 'Réactiver' : 'Suspendre'}
        message={`${confirm?.type === 'validate' ? 'Valider' : confirm?.h?.status === 'suspended' ? 'Réactiver' : 'Suspendre'} le compte de ${confirm?.h?.name} ?`}
        onCancel={() => setConfirm(null)}
        onConfirm={handleAction}
        loading={actionLoading}
      />
    </div>
  );
}
