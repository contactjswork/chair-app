'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import DashboardNav from '@/components/layout/DashboardNav';
import { Building2, Check, X, MapPin, ExternalLink } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:8000';

interface Invitation {
  id: number;
  message?: string | null;
  status: 'pending' | 'accepted' | 'declined';
  salon?: {
    id: number;
    name: string;
    city?: string;
    slug?: string;
    logo?: string | null;
  };
  created_at: string;
}

export default function InvitationsPage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [toast,       setToast]       = useState<string | null>(null);
  const [acting,      setActing]      = useState<number | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    if (!user) return;
    api.get<Invitation[]>('/my-invitations')
      .then((res) => { if (Array.isArray(res)) setInvitations(res); })
      .finally(() => setLoading(false));
  }, [user]);

  async function handleAction(id: number, action: 'accept' | 'decline') {
    setActing(id);
    try {
      await api.post(`/my-invitations/${id}/${action}`, {});
      setInvitations((prev) => prev.map((i) => i.id === id ? { ...i, status: action === 'accept' ? 'accepted' : 'declined' } : i));
      showToast(action === 'accept' ? 'Invitation acceptée ! Vous faites maintenant partie du salon.' : 'Invitation refusée.');
    } catch {
      showToast('Erreur.');
    } finally {
      setActing(null);
    }
  }

  if (isLoading || loading) {
    return <div className="min-h-screen bg-neutral-50 flex items-center justify-center"><div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" /></div>;
  }

  const pending  = invitations.filter((i) => i.status === 'pending');
  const archived = invitations.filter((i) => i.status !== 'pending');

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      <DashboardNav />
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl">{toast}</div>}

      <div className="md:ml-60 max-w-xl mx-auto px-4 pt-4 pb-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-neutral-900">Invitations de salons</h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            {pending.length === 0 ? 'Aucune invitation en attente' : `${pending.length} invitation${pending.length > 1 ? 's' : ''} en attente`}
          </p>
        </div>

        {invitations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-100 p-12 text-center">
            <Building2 size={32} className="text-neutral-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-neutral-700">Aucune invitation reçue</p>
            <p className="text-xs text-neutral-400 mt-1">Les salons pourront vous inviter à rejoindre leur équipe.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...pending, ...archived].map((inv) => (
              <div key={inv.id} className={`bg-white rounded-2xl border p-4 ${inv.status === 'pending' ? 'border-neutral-200' : 'border-neutral-100 opacity-70'}`}>
                {/* Header salon */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-neutral-100 flex-shrink-0 relative flex items-center justify-center overflow-hidden">
                    {inv.salon?.logo
                      ? <Image src={`${API_BASE}${inv.salon.logo}`} alt="" fill className="object-cover" sizes="48px" />
                      : <Building2 size={18} className="text-neutral-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-neutral-900">{inv.salon?.name ?? 'Salon'}</p>
                      {inv.salon?.slug && (
                        <Link href={`/app/salon/${inv.salon.slug}`} target="_blank" className="text-neutral-400 hover:text-neutral-600">
                          <ExternalLink size={11} />
                        </Link>
                      )}
                    </div>
                    {inv.salon?.city && (
                      <p className="text-xs text-neutral-400 flex items-center gap-0.5 mt-0.5">
                        <MapPin size={9} />{inv.salon.city}
                      </p>
                    )}
                  </div>
                  {inv.status !== 'pending' && (
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${inv.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-400'}`}>
                      {inv.status === 'accepted' ? 'Acceptée' : 'Refusée'}
                    </span>
                  )}
                </div>

                {/* Message du gérant */}
                {inv.message && (
                  <div className="bg-neutral-50 rounded-xl px-3 py-2.5 mb-3">
                    <p className="text-xs text-neutral-600 italic">"{inv.message}"</p>
                  </div>
                )}

                {/* Actions */}
                {inv.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(inv.id, 'decline')}
                      disabled={acting === inv.id}
                      className="flex-1 py-2.5 text-xs font-semibold text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                      <X size={12} />Décliner
                    </button>
                    <button
                      onClick={() => handleAction(inv.id, 'accept')}
                      disabled={acting === inv.id}
                      className="flex-1 py-2.5 text-xs font-bold bg-neutral-900 text-white rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                      <Check size={12} />{acting === inv.id ? '...' : 'Rejoindre le salon'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
