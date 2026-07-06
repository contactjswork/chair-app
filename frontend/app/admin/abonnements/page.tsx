'use client';

import { useEffect, useState } from 'react';
import { CreditCard, TrendingUp, Users, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('chair_admin_token') : null;

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-neutral-100 text-neutral-500',
    past_due: 'bg-red-100 text-red-600',
    trialing: 'bg-blue-100 text-blue-700',
  };
  const labels: Record<string, string> = { active: 'Actif', cancelled: 'Annulé', past_due: 'Paiement en retard', trialing: 'Essai' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${map[status] ?? 'bg-neutral-100 text-neutral-500'}`}>
      {labels[status] ?? status}
    </span>
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

interface Subscription {
  id: number;
  hairdresser_name: string;
  hairdresser_avatar?: string;
  plan: string;
  started_at: string;
  ends_at: string;
  payment_status: string;
  amount: number;
}

interface SubscriptionsResponse {
  data: Subscription[];
  total: number;
  last_page: number;
  mrr?: number;
  active_count?: number;
  churned_this_month?: number;
}

export default function AbonnementsPage() {
  const [data, setData] = useState<SubscriptionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getToken();
    setLoading(true);
    fetch(`${API_URL}/admin/subscriptions?page=${page}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError('Erreur de chargement'); setLoading(false); });
  }, [page]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold text-neutral-900">Abonnements PRO+</h1>
        {data && <p className="text-[13px] text-neutral-400 mt-0.5">{data.total.toLocaleString('fr')} abonnements</p>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-emerald-500" />
            <span className="text-[12px] font-semibold text-neutral-400 uppercase tracking-wider">MRR</span>
          </div>
          {loading ? <Skeleton className="h-8 w-24" /> : (
            <div className="text-[26px] font-bold text-neutral-900">{data?.mrr != null ? `${data.mrr.toLocaleString('fr')} €` : '—'}</div>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-violet-500" />
            <span className="text-[12px] font-semibold text-neutral-400 uppercase tracking-wider">Abonnés actifs</span>
          </div>
          {loading ? <Skeleton className="h-8 w-16" /> : (
            <div className="text-[26px] font-bold text-neutral-900">{data?.active_count ?? '—'}</div>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={16} className="text-red-400" />
            <span className="text-[12px] font-semibold text-neutral-400 uppercase tracking-wider">Churn ce mois</span>
          </div>
          {loading ? <Skeleton className="h-8 w-16" /> : (
            <div className="text-[26px] font-bold text-neutral-900">{data?.churned_this_month ?? '—'}</div>
          )}
        </div>
      </div>

      {error && <div className="px-4 py-3 bg-red-50 rounded-xl text-[13px] text-red-600">{error}</div>}

      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/50">
                {['Coiffeur', 'Plan', 'Montant', 'Début', 'Fin', 'Statut paiement'].map((h) => (
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
                ? <tr><td colSpan={6} className="px-4 py-12 text-center text-[13px] text-neutral-400">Aucun abonnement</td></tr>
                : data.data.map((s, i) => (
                  <tr key={s.id} className={`hover:bg-neutral-50 transition-colors ${i % 2 === 1 ? 'bg-neutral-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {s.hairdresser_avatar
                          ? <img src={s.hairdresser_avatar} alt={s.hairdresser_name} className="w-7 h-7 rounded-full object-cover" />
                          : <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center text-[11px] font-bold text-neutral-600">{s.hairdresser_name?.[0]?.toUpperCase()}</div>
                        }
                        <span className="text-[13px] font-medium text-neutral-900">{s.hairdresser_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">{s.plan}</span>
                    </td>
                    <td className="px-4 py-3 text-[13px] font-medium text-neutral-900">{s.amount} €/mois</td>
                    <td className="px-4 py-3 text-[12px] text-neutral-500">{formatDate(s.started_at)}</td>
                    <td className="px-4 py-3 text-[12px] text-neutral-500">{formatDate(s.ends_at)}</td>
                    <td className="px-4 py-3"><PaymentBadge status={s.payment_status} /></td>
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
    </div>
  );
}
