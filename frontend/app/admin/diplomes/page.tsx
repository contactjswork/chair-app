'use client';

import { useCallback, useEffect, useState } from 'react';
import { GraduationCap, Check, X } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('chair_admin_token') : null;

interface PendingDiploma {
  id: number;
  name: string | null;
  email: string | null;
  city: string | null;
  diploma: string | null;
  diploma_document_url: string | null;
  submitted_at: string;
}

export default function DiplomesPage() {
  const [items, setItems] = useState<PendingDiploma[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`${API_URL}/admin/diplomas/pending`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setItems(data.data ?? []);
    } catch {
      setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleDecision(id: number, decision: 'approve' | 'reject') {
    setActingId(id);
    const token = getToken();
    try {
      await fetch(`${API_URL}/admin/diplomas/${id}/${decision}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      setError('Action impossible');
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold text-neutral-900">Diplômes à vérifier</h1>
        <p className="text-[13px] text-neutral-400 mt-0.5">{items.length} en attente</p>
      </div>

      {error && <div className="px-4 py-3 bg-red-50 rounded-xl text-[13px] text-red-600">{error}</div>}

      {loading ? (
        <div className="text-[13px] text-neutral-400">Chargement...</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-10 flex flex-col items-center gap-2 text-center">
          <GraduationCap size={28} className="text-neutral-300" />
          <p className="text-[13px] text-neutral-400">Aucun diplôme en attente de vérification.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
              {item.diploma_document_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.diploma_document_url} alt="Diplôme" className="w-full h-48 object-cover bg-neutral-100" />
              )}
              <div className="p-4">
                <p className="text-[14px] font-bold text-neutral-900">{item.name ?? 'Sans nom'}</p>
                <p className="text-[12px] text-neutral-400">{item.email}{item.city ? ` — ${item.city}` : ''}</p>
                <p className="text-[13px] font-semibold text-neutral-700 mt-2">{item.diploma}</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Envoyé le {new Date(item.submitted_at).toLocaleDateString('fr-FR')}
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleDecision(item.id, 'approve')}
                    disabled={actingId === item.id}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    <Check size={14} /> Valider
                  </button>
                  <button
                    onClick={() => handleDecision(item.id, 'reject')}
                    disabled={actingId === item.id}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <X size={14} /> Refuser
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
