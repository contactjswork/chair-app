'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api, salons } from '@/lib/api';
import {
  Users, Search, Send, X, UserMinus, Check, Clock, UserPlus, ChevronRight,
  MessageSquarePlus, Copy, Link2,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:8000';

interface HairdresserResult {
  id: number;
  user?: { name?: string };
  specialty?: string;
  city?: string;
  avatar?: string | null;
}

interface Invitation {
  id: number;
  status: 'pending' | 'accepted' | 'declined';
  message?: string | null;
  hairdresser?: HairdresserResult;
  created_at: string;
}

interface TeamMember {
  id: number;
  user?: { name?: string };
  specialty?: string;
  specialties?: { id: number; name: string }[];
  avatar?: string | null;
}

export default function EquipePage() {
  const { user, isLoading } = useRequireAuth(['salon_owner']);
  const [tab,          setTab]          = useState<'team' | 'invite'>('team');
  const [team,         setTeam]         = useState<TeamMember[]>([]);
  const [invitations,  setInvitations]  = useState<Invitation[]>([]);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [results,      setResults]      = useState<HairdresserResult[]>([]);
  const [searching,    setSearching]    = useState(false);
  const [selected,     setSelected]     = useState<HairdresserResult | null>(null);
  const [invMsg,       setInvMsg]       = useState('');
  const [sending,      setSending]      = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [toast,        setToast]        = useState<string | null>(null);
  const [removeId,     setRemoveId]     = useState<number | null>(null);
  const [inviteFor,    setInviteFor]    = useState<TeamMember | null>(null);
  const [inviteSpecialtyId, setInviteSpecialtyId] = useState<number | null>(null);
  const [inviteLink,   setInviteLink]   = useState<string | null>(null);
  const [inviteLoading,setInviteLoading]= useState(false);
  const [linkCopied,   setLinkCopied]   = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    if (!user) return;
    Promise.allSettled([
      api.get<{ hairdressers?: TeamMember[] }>('/my-salon'),
      api.get<Invitation[]>('/my-salon/invitations'),
    ]).then(([s, inv]) => {
      if (s.status   === 'fulfilled' && s.value?.hairdressers) setTeam(s.value.hairdressers);
      if (inv.status === 'fulfilled' && Array.isArray(inv.value)) setInvitations(inv.value);
    }).finally(() => setLoading(false));
  }, [user]);

  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await api.get<HairdresserResult[]>(`/hairdressers?q=${encodeURIComponent(q)}`);
      if (Array.isArray(res)) setResults(res);
    } catch { setResults([]); }
    finally { setSearching(false); }
  }

  async function handleInvite() {
    if (!selected) return;
    setSending(true);
    try {
      const inv = await api.post<Invitation>('/my-salon/invite', {
        hairdresser_id: selected.id,
        message: invMsg.trim() || null,
      });
      setInvitations((prev) => [inv, ...prev]);
      setSelected(null);
      setSearchQuery('');
      setResults([]);
      setInvMsg('');
      showToast('Invitation envoyée !');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'envoi.';
      showToast(msg);
    } finally {
      setSending(false);
    }
  }

  async function handleCancelInvitation(id: number) {
    try {
      await api.delete(`/my-salon/invitations/${id}`);
      setInvitations((prev) => prev.filter((i) => i.id !== id));
      showToast('Invitation annulée.');
    } catch { showToast('Erreur.'); }
  }

  function openInviteReview(member: TeamMember) {
    setInviteFor(member);
    setInviteSpecialtyId(member.specialties?.[0]?.id ?? null);
    setInviteLink(null);
    setLinkCopied(false);
  }

  async function generateInviteLink() {
    if (!inviteFor) return;
    setInviteLoading(true);
    try {
      const res = await salons.inviteReview(inviteFor.id, inviteSpecialtyId);
      setInviteLink(res.scan_url);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erreur lors de la génération du lien.');
    } finally {
      setInviteLoading(false);
    }
  }

  async function copyInviteLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  async function handleRemoveMember(id: number) {
    setRemoveId(id);
    try {
      await api.delete(`/my-salon/hairdressers/${id}`);
      setTeam((prev) => prev.filter((m) => m.id !== id));
      showToast('Membre retiré du salon.');
    } catch { showToast('Erreur lors de la suppression.'); }
    finally { setRemoveId(null); }
  }

  if (isLoading || loading) {
    return <div className="min-h-screen bg-neutral-50 flex items-center justify-center"><div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" /></div>;
  }

  const pendingInvitations = invitations.filter((i) => i.status === 'pending');

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl">{toast}</div>}

      <div className="flex-1">
      <div className="max-w-xl mx-auto px-4 pt-4 pb-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-neutral-900">Équipe</h1>
          <p className="text-xs text-neutral-400 mt-0.5">{team.length} coiffeur{team.length !== 1 ? 's' : ''} dans votre salon</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-neutral-100 rounded-2xl p-1 mb-5 gap-1">
          {[
            { key: 'team',   label: 'Mon équipe', icon: Users },
            { key: 'invite', label: 'Inviter', icon: UserPlus },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key as 'team' | 'invite')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors ${tab === key ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
              <Icon size={12} />{label}
              {key === 'invite' && pendingInvitations.length > 0 && (
                <span className="w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {pendingInvitations.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Onglet Équipe ── */}
        {tab === 'team' && (
          <>
            {team.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-100 p-10 text-center">
                <Users size={32} className="text-neutral-200 mx-auto mb-3" />
                <p className="text-sm font-semibold text-neutral-700 mb-1">Aucun coiffeur dans votre salon</p>
                <p className="text-xs text-neutral-400 mb-4">Invitez des coiffeurs à rejoindre votre équipe.</p>
                <button onClick={() => setTab('invite')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-neutral-900 text-white px-4 py-2.5 rounded-xl hover:bg-neutral-700 transition-colors">
                  <UserPlus size={12} />Inviter un coiffeur
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {team.map((m) => (
                  <div key={m.id} className="bg-white rounded-2xl border border-neutral-100 p-3.5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neutral-200 flex-shrink-0 overflow-hidden relative">
                      {m.avatar
                        ? <Image src={`${API_BASE}${m.avatar}`} alt="" fill className="object-cover" sizes="40px" />
                        : <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-neutral-500">{m.user?.name?.[0] ?? '?'}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-neutral-900">{m.user?.name ?? 'Coiffeur'}</p>
                      {m.specialty && <p className="text-xs text-neutral-400">{m.specialty}</p>}
                    </div>
                    <button
                      onClick={() => openInviteReview(m)}
                      title="Demander un avis pour ce membre"
                      className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center hover:bg-neutral-900 hover:text-white transition-colors">
                      <MessageSquarePlus size={13} />
                    </button>
                    <button
                      onClick={() => { if (confirm(`Retirer ${m.user?.name ?? 'ce coiffeur'} du salon ?`)) handleRemoveMember(m.id); }}
                      disabled={removeId === m.id}
                      className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-colors disabled:opacity-50">
                      {removeId === m.id ? <div className="w-3 h-3 border border-neutral-400 border-t-neutral-700 rounded-full animate-spin" /> : <UserMinus size={13} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Onglet Inviter ── */}
        {tab === 'invite' && (
          <div className="space-y-4">
            {/* Recherche coiffeur */}
            <div className="bg-white rounded-2xl border border-neutral-100 p-4">
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">Rechercher un coiffeur</h3>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Nom du coiffeur, ville..."
                  className="w-full pl-9 pr-8 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-800 transition-colors"
                />
                {searchQuery && <button onClick={() => { setSearchQuery(''); setResults([]); setSelected(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"><X size={13} /></button>}
              </div>

              {/* Résultats */}
              {searching && (
                <div className="mt-2 flex justify-center py-4">
                  <div className="w-4 h-4 border-2 border-neutral-200 border-t-neutral-700 rounded-full animate-spin" />
                </div>
              )}
              {!searching && results.length > 0 && !selected && (
                <div className="mt-2 space-y-1">
                  {results.map((r) => (
                    <button key={r.id} onClick={() => { setSelected(r); setResults([]); }}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-neutral-50 transition-colors text-left">
                      <div className="w-8 h-8 rounded-full bg-neutral-200 flex-shrink-0 overflow-hidden relative flex items-center justify-center">
                        {r.avatar
                          ? <Image src={`${API_BASE}${r.avatar}`} alt="" fill className="object-cover" sizes="32px" />
                          : <span className="text-xs font-bold text-neutral-500">{r.user?.name?.[0] ?? '?'}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-neutral-900">{r.user?.name ?? 'Coiffeur'}</p>
                        <p className="text-xs text-neutral-400">{r.specialty ?? ''}{r.city ? ` · ${r.city}` : ''}</p>
                      </div>
                      <ChevronRight size={13} className="text-neutral-300" />
                    </button>
                  ))}
                </div>
              )}

              {/* Coiffeur sélectionné + message */}
              {selected && (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-2.5 p-2.5 bg-neutral-50 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-neutral-200 flex-shrink-0 relative flex items-center justify-center overflow-hidden">
                      {selected.avatar
                        ? <Image src={`${API_BASE}${selected.avatar}`} alt="" fill className="object-cover" sizes="32px" />
                        : <span className="text-xs font-bold text-neutral-500">{selected.user?.name?.[0] ?? '?'}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900">{selected.user?.name ?? 'Coiffeur'}</p>
                      {selected.specialty && <p className="text-xs text-neutral-400">{selected.specialty}</p>}
                    </div>
                    <button onClick={() => setSelected(null)} className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-neutral-300 transition-colors">
                      <X size={10} />
                    </button>
                  </div>
                  <textarea
                    value={invMsg}
                    onChange={(e) => setInvMsg(e.target.value)}
                    rows={3}
                    placeholder="Message accompagnant l'invitation (optionnel)..."
                    className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm resize-none focus:outline-none focus:border-neutral-800 transition-colors"
                  />
                  <button onClick={handleInvite} disabled={sending}
                    className="w-full py-3 bg-neutral-900 text-white text-sm font-bold rounded-2xl hover:bg-neutral-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    <Send size={13} />{sending ? 'Envoi...' : 'Envoyer l\'invitation'}
                  </button>
                </div>
              )}
            </div>

            {/* Invitations envoyées */}
            {invitations.length > 0 && (
              <div className="bg-white rounded-2xl border border-neutral-100 p-4">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">Invitations envoyées</h3>
                <div className="space-y-2">
                  {invitations.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-3 py-2 border-b border-neutral-50 last:border-0">
                      <div className="w-8 h-8 rounded-full bg-neutral-200 flex-shrink-0 relative flex items-center justify-center overflow-hidden">
                        {inv.hairdresser?.avatar
                          ? <Image src={`${API_BASE}${inv.hairdresser.avatar}`} alt="" fill className="object-cover" sizes="32px" />
                          : <span className="text-xs font-bold text-neutral-500">{inv.hairdresser?.user?.name?.[0] ?? '?'}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-neutral-900">{inv.hairdresser?.user?.name ?? 'Coiffeur'}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {inv.status === 'pending'  && <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-semibold"><Clock size={9} />En attente</span>}
                          {inv.status === 'accepted' && <span className="flex items-center gap-0.5 text-[10px] text-green-600 font-semibold"><Check size={9} />Acceptée</span>}
                          {inv.status === 'declined' && <span className="flex items-center gap-0.5 text-[10px] text-red-500 font-semibold"><X size={9} />Refusée</span>}
                        </div>
                      </div>
                      {inv.status === 'pending' && (
                        <button onClick={() => handleCancelInvitation(inv.id)}
                          className="text-[10px] text-neutral-400 hover:text-red-500 font-medium transition-colors">
                          Annuler
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      {/* Fallback gérant : attribuer une visite / déclencher une demande d'avis
          pour un salarié qui ne facture pas lui-même. Génère un lien QR — le
          gérant ne peut jamais écrire l'avis à la place du client. */}
      {inviteFor && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setInviteFor(null)} />
          <div className="relative bg-white rounded-t-3xl shadow-2xl px-5 pt-5 pb-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[16px] font-bold text-neutral-900">Demander un avis</p>
                <p className="text-xs text-neutral-400 mt-0.5">pour {inviteFor.user?.name ?? 'ce coiffeur'}</p>
              </div>
              <button onClick={() => setInviteFor(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors">
                <X size={15} />
              </button>
            </div>

            {!inviteLink ? (
              <>
                {inviteFor.specialties && inviteFor.specialties.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide mb-2">Quelle prestation ?</p>
                    <div className="flex flex-wrap gap-2">
                      {inviteFor.specialties.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setInviteSpecialtyId(s.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                            inviteSpecialtyId === s.id
                              ? 'bg-neutral-900 text-white border-neutral-900'
                              : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                          }`}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-[12px] text-neutral-400 leading-relaxed mb-4">
                  Génère un lien valable 48h à envoyer vous-même au client (SMS, WhatsApp...).
                  Il confirme sa visite et rédige lui-même son avis — vous ne pouvez pas le faire à sa place.
                </p>
                <button
                  onClick={generateInviteLink}
                  disabled={inviteLoading}
                  className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white font-bold py-3.5 rounded-2xl text-sm hover:bg-neutral-700 transition-colors disabled:opacity-50"
                >
                  <Link2 size={15} />
                  {inviteLoading ? 'Génération...' : 'Générer le lien'}
                </button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-3 text-xs text-neutral-600 break-all">
                  {inviteLink}
                </div>
                <button
                  onClick={copyInviteLink}
                  className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white font-bold py-3.5 rounded-2xl text-sm hover:bg-neutral-700 transition-colors"
                >
                  {linkCopied ? <Check size={15} /> : <Copy size={15} />}
                  {linkCopied ? 'Copié !' : 'Copier le lien'}
                </button>
                <p className="text-[11px] text-neutral-400 text-center">Valable 48h.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
