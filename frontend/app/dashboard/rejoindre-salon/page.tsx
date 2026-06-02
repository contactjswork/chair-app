'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { salons } from '@/lib/api';
import { type ApiSalonFull, type ApiSalonJoinRequest } from '@/lib/types';
import DashboardNav from '@/components/layout/DashboardNav';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { Search, Building2, MapPin, Users, Check, X, Clock, ChevronRight } from 'lucide-react';

export default function RejoindreUnSalonPage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);

  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState<ApiSalonFull[]>([]);
  const [searching, setSearching]   = useState(false);
  const [myRequests, setMyRequests] = useState<ApiSalonJoinRequest[]>([]);
  const [requestMsg, setRequestMsg] = useState<string | null>(null);
  const [joinMsg, setJoinMsg]       = useState('');
  const [joiningId, setJoiningId]   = useState<number | null>(null);

  const currentSalonId = user?.hairdresser_profile
    ? (user.hairdresser_profile as unknown as Record<string,unknown>)['salon_id'] as number | null
    : null;

  useEffect(() => {
    if (!user) return;
    salons.myJoinRequests().then(setMyRequests).catch(() => {});
  }, [user]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (query.trim().length < 2) {
        // Charger tous les salons si pas de query
        setSearching(true);
        try {
          const res = await salons.list({ q: query.trim() || undefined });
          setResults(res.data ?? []);
        } catch {
          setResults([]);
        }
        setSearching(false);
        return;
      }
      setSearching(true);
      try {
        const res = await salons.list({ q: query.trim() });
        setResults(res.data ?? []);
      } catch {
        setResults([]);
      }
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  async function handleJoin(salonId: number) {
    setJoiningId(salonId);
    try {
      await salons.requestJoin(salonId, joinMsg || undefined);
      setMyRequests((prev) => [
        ...prev,
        { id: Date.now(), hairdresser_id: 0, salon_id: salonId, status: 'pending', message: joinMsg || null, created_at: new Date().toISOString() },
      ]);
      setRequestMsg('Demande envoyée ! Le gérant du salon recevra une notification.');
    } catch (e) {
      setRequestMsg(e instanceof Error ? e.message : 'Erreur lors de l\'envoi.');
    }
    setJoiningId(null);
    setJoinMsg('');
    setTimeout(() => setRequestMsg(null), 4000);
  }

  const requestStatusForSalon = useCallback((salonId: number) => {
    return myRequests.find((r) => r.salon_id === salonId);
  }, [myRequests]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-sm text-neutral-400">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <DashboardNav />
      <main className="flex-1 md:ml-60 px-4 py-6 pb-24 md:pb-6 max-w-2xl">
        <DashboardPageHeader title="Rejoindre un salon" />

        {/* Toast */}
        {requestMsg && (
          <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl transition-all ${
            requestMsg.includes('Erreur') ? 'bg-red-600 text-white' : 'bg-neutral-900 text-white'
          }`}>
            {requestMsg}
          </div>
        )}

        {/* Si déjà dans un salon */}
        {currentSalonId && (
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 mb-5 flex items-start gap-3">
            <Building2 size={18} className="text-neutral-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-neutral-700">Vous faites déjà partie d'un salon.</p>
              <p className="text-xs text-neutral-400 mt-0.5">Quittez votre salon actuel avant d'en rejoindre un autre.</p>
            </div>
          </div>
        )}

        {/* Mes demandes en attente */}
        {myRequests.filter((r) => r.status === 'pending').length > 0 && (
          <div className="bg-white rounded-2xl border border-neutral-100 p-4 mb-5">
            <h2 className="text-xs font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">Demandes envoyées</h2>
            <div className="space-y-2">
              {myRequests.filter((r) => r.status === 'pending').map((req) => (
                <div key={req.id} className="flex items-center gap-3 py-2">
                  <Clock size={14} className="text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-700 truncate">
                      Demande au salon #{req.salon_id} — en attente
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">En attente</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recherche */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-4 mb-4">
          <div className="relative mb-4">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un salon par nom ou ville..."
              className="w-full pl-9 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 transition-all"
            />
          </div>

          {/* Résultats */}
          {searching ? (
            <div className="text-center py-6 text-neutral-400 text-sm">Recherche...</div>
          ) : results.length === 0 ? (
            <div className="text-center py-6 text-neutral-400 text-sm">Aucun salon trouvé.</div>
          ) : (
            <div className="space-y-3">
              {results.map((salon) => {
                const existingRequest = requestStatusForSalon(salon.id);
                const isCurrentSalon = salon.id === currentSalonId;

                return (
                  <div key={salon.id} className="border border-neutral-100 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-neutral-900 truncate">{salon.name}</h3>
                        </div>
                        {salon.city && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin size={11} className="text-neutral-400" />
                            <span className="text-xs text-neutral-500">{salon.city}</span>
                          </div>
                        )}
                        {salon.hairdressers_count != null && (
                          <div className="flex items-center gap-1 mt-1">
                            <Users size={11} className="text-neutral-400" />
                            <span className="text-xs text-neutral-500">{salon.hairdressers_count} coiffeur{salon.hairdressers_count > 1 ? 's' : ''}</span>
                          </div>
                        )}
                        {salon.description && (
                          <p className="text-xs text-neutral-400 mt-1.5 line-clamp-2">{salon.description}</p>
                        )}
                      </div>
                      <Link
                        href={`/salon/${salon.slug}`}
                        target="_blank"
                        className="flex-shrink-0 text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
                      >
                        <ChevronRight size={16} />
                      </Link>
                    </div>

                    {/* Action */}
                    {isCurrentSalon ? (
                      <div className="mt-3 flex items-center gap-2 text-xs text-green-600 font-semibold">
                        <Check size={13} />
                        Vous êtes membre de ce salon
                      </div>
                    ) : existingRequest ? (
                      <div className={`mt-3 flex items-center gap-2 text-xs font-semibold ${
                        existingRequest.status === 'accepted' ? 'text-green-600' :
                        existingRequest.status === 'declined' ? 'text-red-500' : 'text-amber-600'
                      }`}>
                        {existingRequest.status === 'accepted' && <Check size={13} />}
                        {existingRequest.status === 'declined' && <X size={13} />}
                        {existingRequest.status === 'pending' && <Clock size={13} />}
                        {{ accepted: 'Accepté', declined: 'Refusé', pending: 'Demande en attente' }[existingRequest.status]}
                      </div>
                    ) : !currentSalonId ? (
                      <div className="mt-3 space-y-2">
                        <input
                          type="text"
                          placeholder="Message optionnel (ex : 5 ans d'expérience...)"
                          className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-400 transition-all"
                          onChange={(e) => setJoinMsg(e.target.value)}
                        />
                        <button
                          onClick={() => handleJoin(salon.id)}
                          disabled={joiningId === salon.id}
                          className="w-full py-2.5 bg-neutral-900 text-white text-xs font-semibold rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-50"
                        >
                          {joiningId === salon.id ? 'Envoi...' : 'Demander à rejoindre'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
