'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('chair_admin_token') : null;

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-neutral-100 text-neutral-500',
    completed: 'bg-blue-100 text-blue-700',
  };
  const labels: Record<string, string> = { pending: 'En attente', confirmed: 'Confirmé', cancelled: 'Annulé', completed: 'Terminé' };
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
      <button onClick={() => onChange(page - 1)} disabled={page === 1} className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 transition-colors"><ChevronLeft size={16} /></button>
      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
        <button key={p} onClick={() => onChange(p)} className={`w-8 h-8 rounded-lg text-[13px] font-medium transition-colors ${p === page ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}>{p}</button>
      ))}
      <button onClick={() => onChange(page + 1)} disabled={page === totalPages} className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 transition-colors"><ChevronRight size={16} /></button>
    </div>
  );
}

interface Appointment {
  id: number;
  client_name: string;
  hairdresser_name: string;
  service: string;
  date: string;
  time?: string;
  price: number;
  status: string;
  created_at: string;
}

interface AppointmentsResponse {
  data: Appointment[];
  total: number;
  last_page: number;
  confirmation_rate?: number;
  cancellation_rate?: number;
}

export default function ReservationsPage() {
  const [data, setData] = useState<AppointmentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const token = getToken();
    const params = new URLSearchParams({ status, date_from: dateFrom, date_to: dateTo, page: String(page) });
    try {
      const res = await fetch(`${API_URL}/admin/appointments?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      setData(await res.json());
    } catch { setError('Erreur de chargement'); }
    finally { setLoading(false); }
  }, [status, dateFrom, dateTo, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const confirmRate = data?.confirmation_rate ?? null;
  const cancelRate = data?.cancellation_rate ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold text-neutral-900">Réservations</h1>
        {data && <p className="text-[13px] text-neutral-400 mt-0.5">{data.total.toLocaleString('fr')} réservations</p>}
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-4 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-emerald-500" />
          <div>
            <div className="text-[18px] font-bold text-neutral-900">{confirmRate !== null ? `${confirmRate}%` : '—'}</div>
            <div className="text-[12px] text-neutral-400">Taux de confirmation</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-4 flex items-center gap-3">
          <XCircle size={20} className="text-red-400" />
          <div>
            <div className="text-[18px] font-bold text-neutral-900">{cancelRate !== null ? `${cancelRate}%` : '—'}</div>
            <div className="text-[12px] text-neutral-400">Taux d'annulation</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-4 flex items-center gap-3">
          <Clock size={20} className="text-amber-500" />
          <div>
            <div className="text-[18px] font-bold text-neutral-900">{data?.total?.toLocaleString('fr') ?? '—'}</div>
            <div className="text-[12px] text-neutral-400">Total RDV</div>
          </div>
        </div>
      </div>

      {error && <div className="px-4 py-3 bg-red-50 rounded-xl text-[13px] text-red-600">{error}</div>}

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="px-3 py-2.5 bg-white border border-neutral-200 rounded-xl text-[13px] text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-300">
          <option value="">Tous statuts</option>
          <option value="pending">En attente</option>
          <option value="confirmed">Confirmé</option>
          <option value="cancelled">Annulé</option>
          <option value="completed">Terminé</option>
        </select>
        <div className="flex items-center gap-2">
          <label className="text-[12px] text-neutral-400">Du</label>
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="px-3 py-2.5 bg-white border border-neutral-200 rounded-xl text-[13px] text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-300" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[12px] text-neutral-400">Au</label>
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="px-3 py-2.5 bg-white border border-neutral-200 rounded-xl text-[13px] text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-300" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px]">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/50">
                {['ID', 'Client', 'Coiffeur', 'Service', 'Date', 'Heure', 'Prix', 'Statut', 'Créée le'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className={i % 2 === 1 ? 'bg-neutral-50/30' : ''}>
                    {Array.from({ length: 9 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>)}
                  </tr>
                ))
                : !data?.data?.length
                ? <tr><td colSpan={9} className="px-4 py-12 text-center text-[13px] text-neutral-400">Aucune réservation trouvée</td></tr>
                : data.data.map((a, i) => (
                  <tr key={a.id} className={`hover:bg-neutral-50 transition-colors ${i % 2 === 1 ? 'bg-neutral-50/30' : ''}`}>
                    <td className="px-4 py-3 text-[12px] text-neutral-400">#{a.id}</td>
                    <td className="px-4 py-3 text-[13px] font-medium text-neutral-900">{a.client_name}</td>
                    <td className="px-4 py-3 text-[13px] text-neutral-600">{a.hairdresser_name}</td>
                    <td className="px-4 py-3 text-[13px] text-neutral-600">{a.service}</td>
                    <td className="px-4 py-3 text-[12px] text-neutral-500">{formatDate(a.date)}</td>
                    <td className="px-4 py-3 text-[12px] text-neutral-500">{a.time ?? '—'}</td>
                    <td className="px-4 py-3 text-[13px] font-medium text-neutral-900">{a.price} €</td>
                    <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-3 text-[12px] text-neutral-400">{formatDate(a.created_at)}</td>
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
