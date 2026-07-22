'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuth } from '@/contexts/AuthContext';
import { api, salons } from '@/lib/api';
import { resolveMediaUrl, type ApiSalonFull, type ApiSalonJoinRequest } from '@/lib/types';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import {
  Building2, Users, Check, X, MapPin, ExternalLink, Edit2,
  CheckCircle, AlertCircle, UserMinus, LogOut, Search, Clock, ChevronRight, Mail,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:8000';

interface SalonInvitation {
  id: number;
  message?: string | null;
  status: 'pending' | 'accepted' | 'declined';
  salon?: { id: number; name: string; city?: string; slug?: string; logo?: string | null };
  created_at: string;
}

// ── Rejoindre un salon (recherche + demandes + invitations reçues) ──────────
// Fusion de deux anciennes pages séparées (rejoindre-salon, invitations) :
// même sujet ("ma relation à un salon quand je n'en ai pas") vu sous deux angles.
function JoinSalonPanel() {
  const [tab, setTab] = useState<'search' | 'invitations'>('search');
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState<ApiSalonFull[]>([]);
  const [searching, setSearching]   = useState(false);
  const [myRequests, setMyRequests] = useState<ApiSalonJoinRequest[]>([]);
  const [invitations, setInvitations] = useState<SalonInvitation[]>([]);
  const [toast, setToast]           = useState<string | null>(null);
  const [joinMsg, setJoinMsg]       = useState('');
  const [joiningId, setJoiningId]   = useState<number | null>(null);
  const [acting, setActing]         = useState<number | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  useEffect(() => {
    salons.myJoinRequests().then(setMyRequests).catch(() => {});
    api.get<SalonInvitation[]>('/my-invitations').then((res) => { if (Array.isArray(res)) setInvitations(res); }).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await salons.list({ q: query.trim() || undefined });
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
      showToast('Demande envoyée ! Le gérant du salon recevra une notification.');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erreur lors de l\'envoi.');
    }
    setJoiningId(null);
    setJoinMsg('');
  }

  async function handleInvitation(id: number, action: 'accept' | 'decline') {
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

  const requestStatusForSalon = useCallback((salonId: number) => myRequests.find((r) => r.salon_id === salonId), [myRequests]);
  const pendingInvitations = invitations.filter((i) => i.status === 'pending');

  return (
    <div className="max-w-lg mx-auto py-6">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl transition-all ${
          toast.includes('Erreur') ? 'bg-red-600 text-white' : 'bg-neutral-900 text-white'
        }`}>
          {toast}
        </div>
      )}

      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
          <Building2 size={28} className="text-neutral-400" />
        </div>
        <h2 className="text-lg font-bold text-neutral-900">Rejoindre un salon</h2>
        <p className="text-sm text-neutral-500 mt-1">Vous n&apos;êtes pas encore rattaché à un salon</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-neutral-100 rounded-2xl p-1 mb-5 gap-1">
        {[
          { key: 'search',      label: 'Rechercher',  icon: Search },
          { key: 'invitations', label: 'Invitations', icon: Mail },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as 'search' | 'invitations')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors ${tab === key ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
            <Icon size={12} />{label}
            {key === 'invitations' && pendingInvitations.length > 0 && (
              <span className="w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {pendingInvitations.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'search' && (
        <>
          {myRequests.filter((r) => r.status === 'pending').length > 0 && (
            <div className="bg-white rounded-2xl border border-neutral-100 p-4 mb-4">
              <h3 className="text-xs font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">Demandes envoyées</h3>
              <div className="space-y-2">
                {myRequests.filter((r) => r.status === 'pending').map((req) => (
                  <div key={req.id} className="flex items-center gap-3 py-2">
                    <Clock size={14} className="text-amber-500 flex-shrink-0" />
                    <p className="flex-1 min-w-0 text-sm text-neutral-700 truncate">Demande au salon #{req.salon_id} — en attente</p>
                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">En attente</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-neutral-100 p-4">
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

            {searching ? (
              <div className="text-center py-6 text-neutral-400 text-sm">Recherche...</div>
            ) : results.length === 0 ? (
              <div className="text-center py-6 text-neutral-400 text-sm">Aucun salon trouvé.</div>
            ) : (
              <div className="space-y-3">
                {results.map((salon) => {
                  const existingRequest = requestStatusForSalon(salon.id);
                  return (
                    <div key={salon.id} className="border border-neutral-100 rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-neutral-900 truncate">{salon.name}</h3>
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
                          {salon.description && <p className="text-xs text-neutral-400 mt-1.5 line-clamp-2">{salon.description}</p>}
                        </div>
                        <Link href={`/salon/${salon.slug}`} target="_blank" className="flex-shrink-0 text-xs text-neutral-400 hover:text-neutral-700 transition-colors">
                          <ChevronRight size={16} />
                        </Link>
                      </div>

                      {existingRequest ? (
                        <div className={`mt-3 flex items-center gap-2 text-xs font-semibold ${
                          existingRequest.status === 'accepted' ? 'text-green-600' :
                          existingRequest.status === 'declined' ? 'text-red-500' : 'text-amber-600'
                        }`}>
                          {existingRequest.status === 'accepted' && <Check size={13} />}
                          {existingRequest.status === 'declined' && <X size={13} />}
                          {existingRequest.status === 'pending' && <Clock size={13} />}
                          {{ accepted: 'Accepté', declined: 'Refusé', pending: 'Demande en attente' }[existingRequest.status]}
                        </div>
                      ) : (
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
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'invitations' && (
        invitations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-100 p-10 text-center">
            <Mail size={32} className="text-neutral-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-neutral-700">Aucune invitation reçue</p>
            <p className="text-xs text-neutral-400 mt-1">Les salons pourront vous inviter à rejoindre leur équipe.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...pendingInvitations, ...invitations.filter((i) => i.status !== 'pending')].map((inv) => (
              <div key={inv.id} className={`bg-white rounded-2xl border p-4 ${inv.status === 'pending' ? 'border-neutral-200' : 'border-neutral-100 opacity-70'}`}>
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
                    {inv.salon?.city && <p className="text-xs text-neutral-400 flex items-center gap-0.5 mt-0.5"><MapPin size={9} />{inv.salon.city}</p>}
                  </div>
                  {inv.status !== 'pending' && (
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${inv.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-400'}`}>
                      {inv.status === 'accepted' ? 'Acceptée' : 'Refusée'}
                    </span>
                  )}
                </div>

                {inv.message && (
                  <div className="bg-neutral-50 rounded-xl px-3 py-2.5 mb-3">
                    <p className="text-xs text-neutral-600 italic">&quot;{inv.message}&quot;</p>
                  </div>
                )}

                {inv.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleInvitation(inv.id, 'decline')}
                      disabled={acting === inv.id}
                      className="flex-1 py-2.5 text-xs font-semibold text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                      <X size={12} />Décliner
                    </button>
                    <button
                      onClick={() => handleInvitation(inv.id, 'accept')}
                      disabled={acting === inv.id}
                      className="flex-1 py-2.5 text-xs font-bold bg-neutral-900 text-white rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                      <Check size={12} />{acting === inv.id ? '...' : 'Rejoindre le salon'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ── Formulaire de création de salon ──────────────────────────────────────────

function CreateSalonForm({ onCreated }: { onCreated: (salon: ApiSalonFull) => void }) {
  const [salonName, setSalonName] = useState('');
  const [city, setCity]           = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const inputCls = 'w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!salonName.trim()) return;
    setSaving(true);
    setError('');
    try {
      const salon = await salons.createMySalon({ name: salonName.trim(), city: city.trim() || undefined });
      onCreated(salon);
    } catch {
      setError('Impossible de créer le salon. Réessayez.');
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto py-8">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
          <Building2 size={28} className="text-neutral-400" />
        </div>
        <h2 className="text-lg font-bold text-neutral-900">Créez la page de votre salon</h2>
        <p className="text-sm text-neutral-500 mt-1">Visible publiquement sur CHAIR</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-neutral-100 p-5 space-y-3">
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>
        )}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Nom du salon</label>
          <input type="text" value={salonName} onChange={(e) => setSalonName(e.target.value)}
            placeholder="Koehler Coiffeur" required className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
            Ville <span className="font-normal text-neutral-400">(optionnelle)</span>
          </label>
          <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
            placeholder="Strasbourg" className={inputCls} />
        </div>
        <button type="submit" disabled={saving || !salonName.trim()}
          className="w-full bg-neutral-900 text-white font-semibold py-3 rounded-xl hover:bg-neutral-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? 'Création...' : 'Créer mon salon'}
        </button>
      </form>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function DashboardSalonPage() {
  const { user, isLoading } = useRequireAuth(['hairdresser', 'salon_owner']);
  const { logout } = useAuth();
  const searchParams = useSearchParams();
  const autoEdit = searchParams.get('edit') === '1';

  const [salonData, setSalonData] = useState<{ salon: ApiSalonFull; pending_requests: ApiSalonJoinRequest[] } | null>(null);
  const [loading, setLoading]     = useState(true);
  const [noSalon, setNoSalon]     = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const [editing, setEditing]   = useState(false);
  const [editData, setEditData] = useState<Partial<ApiSalonFull>>({});
  const [saving, setSaving]     = useState(false);

  const isSalonOwner = user?.role === 'salon_owner';

  useEffect(() => {
    if (!user) return;
    salons.mySalon()
      .then((data) => {
        setSalonData(data);
        setNoSalon(false);
      })
      .catch(() => setNoSalon(true))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (salonData?.salon) {
      setEditData({
        name:          salonData.salon.name,
        description:   salonData.salon.description ?? '',
        address:       salonData.salon.address ?? '',
        city:          salonData.salon.city ?? '',
        postal_code:   salonData.salon.postal_code ?? '',
        phone:         salonData.salon.phone ?? '',
        website:       salonData.salon.website ?? '',
        instagram_url: salonData.salon.instagram_url ?? '',
      });
      if (autoEdit && isSalonOwner) setEditing(true);
    }
  }, [salonData, autoEdit, isSalonOwner]);

  function toast(msg: string) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 3000);
  }

  async function handleAccept(requestId: number) {
    try {
      await salons.acceptRequest(requestId);
      toast('Coiffeur ajouté à l\'équipe.');
      const fresh = await salons.mySalon();
      setSalonData(fresh);
    } catch {
      toast('Erreur lors de l\'acceptation.');
    }
  }

  async function handleDecline(requestId: number) {
    try {
      await salons.declineRequest(requestId);
      toast('Demande refusée.');
      setSalonData((prev) => prev ? {
        ...prev,
        pending_requests: prev.pending_requests.filter((r) => r.id !== requestId),
      } : prev);
    } catch {
      toast('Erreur lors du refus.');
    }
  }

  async function handleRemoveHairdresser(profileId: number, name: string) {
    if (!confirm(`Retirer ${name} de l'équipe ?`)) return;
    try {
      await salons.removeHairdresser(profileId);
      toast(`${name} a été retiré de l'équipe.`);
      const fresh = await salons.mySalon();
      setSalonData(fresh);
    } catch {
      toast('Erreur lors du retrait.');
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await salons.updateMySalon(editData);
      const fresh = await salons.mySalon();
      setSalonData(fresh);
      setEditing(false);
      toast('Salon mis à jour.');
    } catch {
      toast('Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  }

  const mainCls = 'flex-1 px-4 py-6 max-w-3xl';

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  // Gérant sans salon → formulaire de création
  if (noSalon && isSalonOwner) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className={mainCls}>
          <DashboardPageHeader title="Mon salon" />
          <CreateSalonForm onCreated={(salon) => {
            setSalonData({ salon, pending_requests: [] });
            setNoSalon(false);
          }} />
        </div>
      </div>
    );
  }

  // Coiffeur non-owner sans salon → recherche + demandes + invitations reçues
  if (noSalon || !salonData) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className={mainCls}>
          <DashboardPageHeader title="Mon salon" />
          <JoinSalonPanel />
        </div>
      </div>
    );
  }

  const { salon, pending_requests } = salonData;
  const coverUrl = resolveMediaUrl(salon.cover_image);

  const verificationBadge = () => {
    if (salon.is_verified) {
      return (
        <span className="flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-lg">
          <CheckCircle size={10} />Vérifié
        </span>
      );
    }
    const vs = salon.verification_status;
    if (vs === 'pending_review') {
      return (
        <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
          <AlertCircle size={10} />Vérification en cours
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-neutral-500 bg-neutral-100 px-2 py-1 rounded-lg">
        <AlertCircle size={10} />Non vérifié
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className={mainCls}>
        <DashboardPageHeader title="Mon salon" />

        {/* Toast */}
        {actionMsg && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl">
            {actionMsg}
          </div>
        )}

        {/* Header salon */}
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden mb-4">
          <div className="relative h-28 bg-neutral-200">
            {coverUrl && <Image src={coverUrl} alt={salon.name} fill className="object-cover" sizes="600px" />}
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-bold text-neutral-900">{salon.name}</h1>
                  {verificationBadge()}
                </div>
                {salon.city && (
                  <div className="flex items-center gap-1 mt-0.5 text-sm text-neutral-500">
                    <MapPin size={12} />
                    {salon.city}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={`/salon/${salon.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 border border-neutral-200 px-3 py-1.5 rounded-xl hover:bg-neutral-50 transition-colors"
                >
                  <ExternalLink size={12} />
                  Voir
                </a>
                {isSalonOwner && (
                  <button
                    onClick={() => setEditing((v) => !v)}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-neutral-900 text-white px-3 py-1.5 rounded-xl hover:bg-neutral-700 transition-colors"
                  >
                    <Edit2 size={12} />
                    Modifier
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire édition */}
        {editing && isSalonOwner && (
          <div className="bg-white rounded-2xl border border-neutral-100 p-4 mb-4 space-y-3">
            <h2 className="text-sm font-bold text-neutral-900 mb-3">Modifier les informations</h2>
            {[
              { key: 'description', label: 'Description', type: 'textarea' },
              { key: 'address',     label: 'Adresse',     type: 'text' },
              { key: 'city',        label: 'Ville',       type: 'text' },
              { key: 'phone',       label: 'Téléphone',   type: 'text' },
              { key: 'website',     label: 'Site web',    type: 'url' },
              { key: 'instagram_url', label: 'Instagram', type: 'url' },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">{label}</label>
                {type === 'textarea' ? (
                  <textarea
                    value={(editData as Record<string,string>)[key] ?? ''}
                    onChange={(e) => setEditData((p) => ({ ...p, [key]: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 resize-none"
                  />
                ) : (
                  <input
                    type={type}
                    value={(editData as Record<string,string>)[key] ?? ''}
                    onChange={(e) => setEditData((p) => ({ ...p, [key]: e.target.value }))}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400"
                  />
                )}
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditing(false)}
                className="flex-1 py-2.5 text-sm font-semibold text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 text-sm font-semibold bg-neutral-900 text-white rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-50">
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}

        {/* Demandes en attente */}
        {isSalonOwner && pending_requests.length > 0 && (
          <div className="bg-white rounded-2xl border border-neutral-100 p-4 mb-4">
            <h2 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
              Demandes en attente
              <span className="bg-neutral-900 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {pending_requests.length}
              </span>
            </h2>
            <div className="space-y-3">
              {pending_requests.map((req) => {
                const avatarUrl = resolveMediaUrl(req.hairdresser?.user?.avatar ?? null);
                return (
                  <div key={req.id} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-neutral-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {avatarUrl ? (
                        <Image src={avatarUrl} alt="" width={40} height={40} className="object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-neutral-400">
                          {req.hairdresser?.user?.name?.[0] ?? '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 truncate">
                        {req.hairdresser?.user?.name ?? 'Coiffeur'}
                      </p>
                      {req.message && (
                        <p className="text-xs text-neutral-500 truncate mt-0.5">&quot;{req.message}&quot;</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleAccept(req.id)}
                        className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors"
                      >
                        <Check size={14} className="text-white" />
                      </button>
                      <button
                        onClick={() => handleDecline(req.id)}
                        className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-colors"
                      >
                        <X size={14} className="text-neutral-600" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Équipe actuelle */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-4 mb-4">
          <h2 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
            <Users size={15} className="text-neutral-400" />
            L&apos;équipe ({salon.hairdressers?.length ?? 0} coiffeur{(salon.hairdressers?.length ?? 0) > 1 ? 's' : ''})
          </h2>
          {(salon.hairdressers?.length ?? 0) === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-6">
              Aucun coiffeur dans l&apos;équipe. Les coiffeurs peuvent demander à rejoindre votre salon.
            </p>
          ) : (
            <div className="space-y-2">
              {salon.hairdressers?.map((h) => {
                const avatarUrl = resolveMediaUrl(h.user?.avatar ?? null);
                return (
                  <div key={h.id} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl group hover:bg-neutral-100 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-neutral-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {avatarUrl ? (
                        <Image src={avatarUrl} alt="" width={36} height={36} className="object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-neutral-400">{h.user?.name?.[0] ?? '?'}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 truncate">{h.user?.name}</p>
                      <p className="text-xs text-neutral-400">{h.reviews_count} avis · {parseFloat(h.avg_rating ?? '0').toFixed(1)}</p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <Link href={`/app/coiffeur/${h.slug}`} target="_blank"
                        className="text-neutral-400 hover:text-neutral-700">
                        <ExternalLink size={13} />
                      </Link>
                      {isSalonOwner && (
                        <button
                          onClick={() => handleRemoveHairdresser(h.id, h.user?.name ?? 'ce coiffeur')}
                          className="text-neutral-400 hover:text-red-500 transition-colors"
                          title="Retirer de l'équipe"
                        >
                          <UserMinus size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Déconnexion (salon_owner) */}
        {isSalonOwner && (
          <div className="bg-white rounded-2xl border border-neutral-100 p-4">
            <button
              onClick={logout}
              className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              <LogOut size={15} />
              Se déconnecter
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
