'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api, salons, invitations as invitationsApi } from '@/lib/api';
import { resolveMediaUrl, type ApiSalonInvitation } from '@/lib/types';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import OwnerEmptyState from '@/components/owner/OwnerEmptyState';
import OwnerTeamMember from '@/components/owner/OwnerTeamMember';
import OwnerBottomSheet from '@/components/owner/OwnerBottomSheet';
import {
  Users, Search, Send, X, UserMinus, Check, Clock, UserPlus, ChevronRight,
  MessageSquarePlus, Copy, Link2, RotateCw, Mail, Ban, XCircle,
} from 'lucide-react';

interface HairdresserResult {
  id: number;
  user?: { name?: string };
  specialty?: string;
  city?: string;
  avatar?: string | null;
}

type Invitation = ApiSalonInvitation;

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
  const [inviteMode,   setInviteMode]   = useState<'search' | 'email'>('search');
  const [inviteEmail,  setInviteEmail]  = useState('');
  const [sentShareLink,setSentShareLink]= useState<{ id: number; link: string } | null>(null);
  const [resendingId,  setResendingId]  = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [inviteFor,    setInviteFor]    = useState<TeamMember | null>(null);
  const [inviteSpecialtyId, setInviteSpecialtyId] = useState<number | null>(null);
  const [inviteLink,   setInviteLink]   = useState<string | null>(null);
  const [inviteLoading,setInviteLoading]= useState(false);
  const [linkCopied,   setLinkCopied]   = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    if (!user) return;
    Promise.allSettled([
      // /my-salon renvoie { salon: { hairdressers: [...] } } — l'équipe est
      // nichée sous `salon`, jamais à la racine de la réponse. Lire
      // `s.value?.hairdressers` (racine) rendait cette page éternellement
      // vide, quelle que soit la taille réelle de l'équipe.
      api.get<{ salon?: { hairdressers?: TeamMember[] } }>('/my-salon'),
      invitationsApi.sent(),
    ]).then(([s, inv]) => {
      if (s.status   === 'fulfilled' && s.value?.salon?.hairdressers) setTeam(s.value.salon.hairdressers);
      if (inv.status === 'fulfilled' && Array.isArray(inv.value)) setInvitations(inv.value);
    }).finally(() => setLoading(false));
  }, [user]);

  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      // /hairdressers renvoie un paginateur Laravel ({data:[...],...}), jamais
      // un tableau brut — Array.isArray(res) était toujours faux ici, la
      // recherche ne remontait donc jamais aucun résultat (bug racine de tout
      // le flow d'invitation : impossible de sélectionner qui inviter).
      const res = await api.get<{ data: HairdresserResult[] }>(`/hairdressers?q=${encodeURIComponent(q)}`);
      setResults(Array.isArray(res?.data) ? res.data : []);
    } catch { setResults([]); }
    finally { setSearching(false); }
  }

  async function handleInvite() {
    if (inviteMode === 'search' && !selected) return;
    if (inviteMode === 'email' && !inviteEmail.trim()) return;
    setSending(true);
    try {
      const inv = await invitationsApi.invite(
        inviteMode === 'search'
          ? { hairdresser_id: selected!.id, message: invMsg.trim() || null }
          : { email: inviteEmail.trim(), message: invMsg.trim() || null }
      );
      setInvitations((prev) => [inv, ...prev.filter((i) => i.id !== inv.id)]);
      if (inv.share_link) setSentShareLink({ id: inv.id, link: inv.share_link });
      setSelected(null);
      setSearchQuery('');
      setResults([]);
      setInvMsg('');
      setInviteEmail('');
      showToast(inv.hairdresser_id ? 'Invitation envoyée !' : 'Lien d\'invitation créé — copiez-le pour le transmettre.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'envoi.';
      showToast(msg);
    } finally {
      setSending(false);
    }
  }

  async function handleCancelInvitation(id: number) {
    setCancellingId(id);
    try {
      await invitationsApi.cancel(id);
      setInvitations((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'cancelled', effective_status: 'cancelled' } : i)));
      showToast('Invitation annulée.');
    } catch { showToast('Erreur.'); }
    finally { setCancellingId(null); }
  }

  async function handleResendInvitation(id: number) {
    setResendingId(id);
    try {
      const inv = await invitationsApi.resend(id);
      setInvitations((prev) => prev.map((i) => (i.id === id ? inv : i)));
      if (inv.share_link) setSentShareLink({ id: inv.id, link: inv.share_link });
      showToast('Invitation renvoyée.');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erreur lors du renvoi.');
    } finally {
      setResendingId(null);
    }
  }

  async function copyShareLink(link: string) {
    await navigator.clipboard.writeText(link);
    showToast('Lien copié !');
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

  const pendingInvitations = invitations.filter((i) => i.effective_status === 'pending');

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl">{toast}</div>}

      <div className="flex-1">
      <div className="max-w-xl mx-auto px-4 pt-4 pb-6">
        <DashboardPageHeader title="Équipe" backHref="/pro/salon-owner" />
        <div className="mb-5 hidden md:block">
          <h1 className="text-xl font-bold text-neutral-900">Équipe</h1>
          <p className="text-xs text-neutral-400 mt-0.5">{team.length} coiffeur{team.length !== 1 ? 's' : ''} dans votre salon</p>
        </div>
        <p className="text-xs text-neutral-400 mb-5 md:hidden">{team.length} coiffeur{team.length !== 1 ? 's' : ''} dans votre salon</p>

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
              <OwnerEmptyState
                icon={Users}
                title="Aucun coiffeur dans votre salon"
                subtitle="Invitez des coiffeurs à rejoindre votre équipe."
                action={{ label: 'Inviter un coiffeur', onClick: () => setTab('invite'), icon: UserPlus }}
              />
            ) : (
              <div className="space-y-2">
                {team.map((m) => (
                  <OwnerTeamMember
                    key={m.id}
                    avatarUrl={resolveMediaUrl(m.avatar)}
                    name={m.user?.name ?? 'Coiffeur'}
                    subtitle={m.specialty}
                    actions={
                      <>
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
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Onglet Inviter ── */}
        {tab === 'invite' && (
          <div className="space-y-4">
            <div className="bg-white rounded-[24px] shadow-[0_4px_18px_-8px_rgba(10,10,10,0.12)] ring-1 ring-neutral-50 p-4">
              <div className="flex bg-neutral-100 rounded-xl p-1 mb-3.5 gap-1">
                <button onClick={() => { setInviteMode('search'); setInviteEmail(''); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${inviteMode === 'search' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
                  <Search size={11} />Déjà sur CHAIR
                </button>
                <button onClick={() => { setInviteMode('email'); setSelected(null); setSearchQuery(''); setResults([]); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${inviteMode === 'email' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
                  <Mail size={11} />Par email
                </button>
              </div>

              {inviteMode === 'search' ? (
                <>
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
                            {resolveMediaUrl(r.avatar)
                              ? <Image src={resolveMediaUrl(r.avatar)!} alt="" fill className="object-cover" sizes="32px" />
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
                          {resolveMediaUrl(selected.avatar)
                            ? <Image src={resolveMediaUrl(selected.avatar)!} alt="" fill className="object-cover" sizes="32px" />
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
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Un lien d&apos;invitation sera créé — à vous de le transmettre (SMS, WhatsApp, email...).
                  </p>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="email@exemple.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-800 transition-colors"
                    />
                  </div>
                  <textarea
                    value={invMsg}
                    onChange={(e) => setInvMsg(e.target.value)}
                    rows={3}
                    placeholder="Message accompagnant l'invitation (optionnel)..."
                    className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm resize-none focus:outline-none focus:border-neutral-800 transition-colors"
                  />
                  <button onClick={handleInvite} disabled={sending || !inviteEmail.trim()}
                    className="w-full py-3 bg-neutral-900 text-white text-sm font-bold rounded-2xl hover:bg-neutral-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    <Send size={13} />{sending ? 'Envoi...' : 'Créer l\'invitation'}
                  </button>
                </div>
              )}

              {/* Lien à copier — apparaît juste après la création (email
                  sans compte, ou renvoi d'une invitation existante) */}
              {sentShareLink && (
                <div className="mt-3 space-y-2 p-3 bg-neutral-50 rounded-[18px] ring-1 ring-neutral-100">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Lien à transmettre</p>
                    <button onClick={() => setSentShareLink(null)} className="text-neutral-400 hover:text-neutral-600"><X size={13} /></button>
                  </div>
                  <p className="text-xs text-neutral-600 break-all">{sentShareLink.link}</p>
                  <button onClick={() => copyShareLink(sentShareLink.link)}
                    className="w-full flex items-center justify-center gap-1.5 bg-neutral-900 text-white font-semibold py-2 rounded-lg text-xs hover:bg-neutral-700 transition-colors">
                    <Copy size={12} />Copier le lien
                  </button>
                </div>
              )}
            </div>

            {/* Invitations envoyées */}
            {invitations.length > 0 && (
              <div className="bg-white rounded-[24px] shadow-[0_4px_18px_-8px_rgba(10,10,10,0.12)] ring-1 ring-neutral-50 p-4">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">Invitations envoyées</h3>
                <div className="space-y-2">
                  {invitations.map((inv) => {
                    const st = inv.effective_status;
                    const canAct = st === 'pending' || st === 'expired';
                    return (
                      <div key={inv.id} className="flex items-center gap-3 py-2 border-b border-neutral-50 last:border-0">
                        <div className="w-8 h-8 rounded-full bg-neutral-200 flex-shrink-0 relative flex items-center justify-center overflow-hidden">
                          {resolveMediaUrl(inv.hairdresser?.user?.avatar)
                            ? <Image src={resolveMediaUrl(inv.hairdresser!.user!.avatar)!} alt="" fill className="object-cover" sizes="32px" />
                            : <span className="text-xs font-bold text-neutral-500">{(inv.hairdresser?.user?.name ?? inv.email)?.[0]?.toUpperCase() ?? '?'}</span>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-neutral-900 truncate">{inv.hairdresser?.user?.name ?? inv.email ?? 'Coiffeur'}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {st === 'pending'   && <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-semibold"><Clock size={9} />En attente</span>}
                            {st === 'accepted'  && <span className="flex items-center gap-0.5 text-[10px] text-green-600 font-semibold"><Check size={9} />Acceptée</span>}
                            {st === 'declined'  && <span className="flex items-center gap-0.5 text-[10px] text-red-500 font-semibold"><X size={9} />Refusée</span>}
                            {st === 'cancelled' && <span className="flex items-center gap-0.5 text-[10px] text-neutral-400 font-semibold"><Ban size={9} />Annulée</span>}
                            {st === 'expired'   && <span className="flex items-center gap-0.5 text-[10px] text-neutral-400 font-semibold"><XCircle size={9} />Expirée</span>}
                          </div>
                        </div>
                        {canAct && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={() => handleResendInvitation(inv.id)} disabled={resendingId === inv.id}
                              title="Renvoyer"
                              className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center hover:bg-neutral-900 hover:text-white transition-colors disabled:opacity-50">
                              {resendingId === inv.id ? <div className="w-3 h-3 border border-neutral-400 border-t-neutral-700 rounded-full animate-spin" /> : <RotateCw size={11} />}
                            </button>
                            {st === 'pending' && (
                              <button onClick={() => handleCancelInvitation(inv.id)} disabled={cancellingId === inv.id}
                                className="text-[10px] text-neutral-400 hover:text-red-500 font-medium transition-colors disabled:opacity-50">
                                Annuler
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
      <OwnerBottomSheet
        open={!!inviteFor}
        onClose={() => setInviteFor(null)}
        title="Demander un avis"
        subtitle={inviteFor ? `pour ${inviteFor.user?.name ?? 'ce coiffeur'}` : undefined}
      >
        {!inviteLink ? (
          <>
            {inviteFor?.specialties && inviteFor.specialties.length > 0 && (
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
              Lien valable 48h, à envoyer au client (SMS, WhatsApp...). Il confirme sa visite et rédige lui-même son avis.
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
            <div className="bg-neutral-50 ring-1 ring-neutral-100 rounded-[16px] px-3 py-3 text-xs text-neutral-600 break-all">
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
      </OwnerBottomSheet>
    </div>
  );
}
