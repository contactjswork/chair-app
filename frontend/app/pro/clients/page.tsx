'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import { resolveMediaUrl, formatDate } from '@/lib/types';
import { CARTE, MICRO_TITRE } from '@/lib/proStyle';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import BottomSheet from '@/components/ui/BottomSheet';
import EmptyState from '@/components/ui/EmptyState';
import { NotebookPen, Search, Users, QrCode, CalendarDays, Send, MessageCircleHeart, RotateCcw } from 'lucide-react';

/**
 * Le carnet de clients — le CRM minimal qui fait pro.
 *
 * Lot du 01/09/2026, trois outils du coiffeur qui connaît ses clients :
 *  - « Pas revenus » : les clients sans passage depuis 8 semaines, avec la
 *    relance manuelle (une notification choisie PAR le coiffeur, 30 jours
 *    minimum entre deux — le contraire d'un spam automatique) ;
 *  - le conseil post-visite, VISIBLE par le client dans son app ;
 *  - le rythme de retour personnalisé (« ses racines : toutes les 6
 *    semaines ») qui pilote le rappel automatique à la place de la moyenne.
 *
 * La note reste STRICTEMENT privée, et la fiche le dit en toutes lettres.
 */

const SEMAINES_PERDU = 8;

interface LigneClient {
  user_id: number;
  name: string;
  avatar: string | null;
  last_seen: string | null;
  rdv_count: number;
  scan_count: number;
  has_note: boolean;
  relance_sent_at: string | null;
}

interface FicheClient {
  client: { id: number; name: string; avatar: string | null };
  usual: string | null;
  appointments: { id: number; service: string; appointment_date: string | null; appointment_time: string | null; price: string | null; status: string }[];
  scans: { id: number; service_type: string | null; scanned_at: string }[];
  note: string | null;
  advice: string | null;
  rebook_weeks: number | null;
  relance_sent_at: string | null;
}

const RYTHMES: { valeur: number | null; libelle: string }[] = [
  { valeur: null, libelle: 'Auto' },
  { valeur: 4,  libelle: '4 sem' },
  { valeur: 6,  libelle: '6 sem' },
  { valeur: 8,  libelle: '8 sem' },
  { valeur: 12, libelle: '12 sem' },
];

function perdu(c: LigneClient): boolean {
  if (!c.last_seen) return false;
  return Date.now() - new Date(c.last_seen).getTime() > SEMAINES_PERDU * 7 * 86400000;
}

function relancable(relanceSentAt: string | null): boolean {
  if (!relanceSentAt) return true;
  return Date.now() - new Date(relanceSentAt).getTime() > 30 * 86400000;
}

export default function ProClientsPage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);

  const [clients, setClients] = useState<LigneClient[]>([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState<'tous' | 'perdus'>('tous');
  const [fiche, setFiche] = useState<FicheClient | null>(null);
  const [ficheOuverte, setFicheOuverte] = useState(false);

  const [note, setNote] = useState('');
  const [noteEtat, setNoteEtat] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [conseil, setConseil] = useState('');
  const [conseilEtat, setConseilEtat] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [rythmeEtat, setRythmeEtat] = useState<'idle' | 'saving'>('idle');
  const [relanceEnCours, setRelanceEnCours] = useState<number | null>(null);
  const [relanceErreur, setRelanceErreur] = useState('');
  // Carnet limité sans CHAIR+ (25 derniers clients) : le serveur tronque et le
  // signale — on affiche combien de clients restent cachés + le lien CHAIR+.
  const [carnetLimite, setCarnetLimite] = useState<{ total: number; limit: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    let annule = false;
    api
      .get<{ clients: LigneClient[]; total?: number; limit?: number; limited?: boolean }>('/my-clients')
      .then((d) => {
        if (annule) return;
        setClients(d.clients);
        setCarnetLimite(d.limited && d.total != null && d.limit != null ? { total: d.total, limit: d.limit } : null);
      })
      .catch(() => {})
      .finally(() => { if (!annule) setChargement(false); });
    return () => { annule = true; };
  }, [user]);

  const perdus = useMemo(() => clients.filter(perdu), [clients]);

  const filtres = useMemo(() => {
    const base = filtre === 'perdus' ? perdus : clients;
    const q = recherche.trim().toLowerCase();
    if (!q) return base;
    return base.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, perdus, filtre, recherche]);

  function ouvrir(userId: number) {
    setFicheOuverte(true);
    setFiche(null);
    setNoteEtat('idle');
    setConseilEtat('idle');
    setRelanceErreur('');
    api
      .get<FicheClient>(`/my-clients/${userId}`)
      .then((d) => { setFiche(d); setNote(d.note ?? ''); setConseil(d.advice ?? ''); })
      .catch(() => setFicheOuverte(false));
  }

  function enregistrerNote() {
    if (!fiche) return;
    setNoteEtat('saving');
    api
      .put<{ note: string | null }>(`/my-clients/${fiche.client.id}/note`, { note })
      .then((d) => {
        setNoteEtat('saved');
        setClients((avant) =>
          avant.map((c) => (c.user_id === fiche.client.id ? { ...c, has_note: !!d.note } : c))
        );
      })
      .catch(() => setNoteEtat('idle'));
  }

  function enregistrerConseil() {
    if (!fiche) return;
    setConseilEtat('saving');
    api
      .put<{ advice: string | null }>(`/my-clients/${fiche.client.id}/advice`, { advice: conseil })
      .then(() => setConseilEtat('saved'))
      .catch(() => setConseilEtat('idle'));
  }

  function reglerRythme(semaines: number | null) {
    if (!fiche) return;
    setRythmeEtat('saving');
    setFiche({ ...fiche, rebook_weeks: semaines });
    api
      .put(`/my-clients/${fiche.client.id}/rhythm`, { rebook_weeks: semaines })
      .catch(() => {})
      .finally(() => setRythmeEtat('idle'));
  }

  function relancer(userId: number) {
    setRelanceEnCours(userId);
    setRelanceErreur('');
    api
      .post<{ relance_sent_at: string }>(`/my-clients/${userId}/relance`, {})
      .then((d) => {
        setClients((avant) =>
          avant.map((c) => (c.user_id === userId ? { ...c, relance_sent_at: d.relance_sent_at } : c))
        );
        setFiche((f) => (f && f.client.id === userId ? { ...f, relance_sent_at: d.relance_sent_at } : f));
      })
      .catch((e) => setRelanceErreur(e instanceof Error ? e.message : 'Relance impossible.'))
      .finally(() => setRelanceEnCours(null));
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 pt-2 md:pt-10 pb-12">
      <DashboardPageHeader title="Mes clients" backHref="/pro/plus" />

      {/* Tous / Pas revenus — le second est l'outil de reconquête. */}
      {!chargement && clients.length > 0 && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setFiltre('tous')}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${
              filtre === 'tous' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Tous · {clients.length}
          </button>
          <button
            onClick={() => setFiltre('perdus')}
            disabled={perdus.length === 0}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors disabled:opacity-40 ${
              filtre === 'perdus' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Pas revenus · {perdus.length}
          </button>
        </div>
      )}

      {filtre === 'perdus' && (
        <p className="mt-2 text-[12px] text-neutral-400 leading-relaxed">
          Sans passage depuis plus de {SEMAINES_PERDU} semaines. La relance envoie
          une notification en votre nom — 30 jours minimum entre deux.
        </p>
      )}

      {!chargement && clients.length > 3 && (
        <div className="relative mt-3">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un client…"
            className="w-full border border-neutral-200 rounded-xl pl-10 pr-4 h-12 text-[16px] text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:border-neutral-900 transition-colors"
          />
        </div>
      )}

      {/* Carnet limité sans CHAIR+ : le serveur ne sert que les {limit} plus
          récents — on dit combien restent masqués, avec le déblocage à un tap. */}
      {carnetLimite && (
        <Link
          href="/pro/chair-plus"
          className="mt-3 flex items-center gap-3 bg-neutral-900 rounded-[20px] px-4 py-3.5 hover:bg-neutral-800 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <Users size={15} className="text-[#f5b942]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white">
              {carnetLimite.total - carnetLimite.limit} client{carnetLimite.total - carnetLimite.limit > 1 ? 's' : ''} masqué{carnetLimite.total - carnetLimite.limit > 1 ? 's' : ''}
            </p>
            <p className="text-[11px] text-white/60">
              Carnet limité aux {carnetLimite.limit} derniers — CHAIR+ le débloque en illimité.
            </p>
          </div>
          <span className="text-[11px] font-bold text-[#f5b942] flex-shrink-0">Débloquer</span>
        </Link>
      )}

      <div className="mt-3">
        {chargement ? (
          <div className="h-64 bg-neutral-100 rounded-[28px] animate-pulse" />
        ) : clients.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Pas encore de client dans le carnet"
            subtitle="Vos clients apparaissent ici dès leur premier rendez-vous ou leur premier passage scanné."
          />
        ) : (
          <div className={`${CARTE} overflow-hidden divide-y divide-neutral-50`}>
            {filtres.map((c) => (
              <div key={c.user_id} className="flex items-center gap-3 px-4 py-3 min-h-[64px]">
                <button
                  onClick={() => ouvrir(c.user_id)}
                  className="flex-1 min-w-0 flex items-center gap-3 text-left active:opacity-70 transition-opacity"
                >
                  <Avatar nom={c.name} url={resolveMediaUrl(c.avatar)} />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[14.5px] font-semibold text-neutral-900 truncate">{c.name}</span>
                      {c.has_note && <NotebookPen size={13} className="text-neutral-400 shrink-0" />}
                    </span>
                    <span className="block text-[12.5px] text-neutral-500 mt-0.5 tabular-nums">
                      {c.last_seen ? `Vu ${formatDate(c.last_seen)}` : 'Jamais vu'}
                      {c.rdv_count > 0 && ` · ${c.rdv_count} RDV`}
                      {c.scan_count > 0 && ` · ${c.scan_count} passage${c.scan_count > 1 ? 's' : ''}`}
                    </span>
                  </span>
                </button>
                {filtre === 'perdus' && (
                  relancable(c.relance_sent_at) ? (
                    <button
                      onClick={() => relancer(c.user_id)}
                      disabled={relanceEnCours === c.user_id}
                      className="flex items-center gap-1.5 text-[12px] font-bold text-white bg-neutral-900 px-3 min-h-[36px] rounded-xl disabled:opacity-50 active:scale-[0.97] transition-transform shrink-0"
                    >
                      <Send size={11} />
                      {relanceEnCours === c.user_id ? '…' : 'Relancer'}
                    </button>
                  ) : (
                    <span className="text-[11px] text-neutral-400 shrink-0">
                      Relancé {formatDate(c.relance_sent_at!)}
                    </span>
                  )
                )}
              </div>
            ))}
            {filtres.length === 0 && (
              <p className="px-4 py-6 text-[13px] text-neutral-500 text-center">
                {recherche ? `Aucun client ne correspond à « ${recherche} ».` : 'Personne ici — vos clients reviennent.'}
              </p>
            )}
          </div>
        )}
        {relanceErreur && !ficheOuverte && (
          <p className="mt-2 text-[12px] font-semibold text-red-600">{relanceErreur}</p>
        )}
      </div>

      {ficheOuverte && (
        <BottomSheet onClose={() => setFicheOuverte(false)} maxHeight="max-h-[90vh]">
          {!fiche ? (
            <div className="h-40 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="px-5 pb-8 overflow-y-auto">
              <div className="flex items-center gap-3.5 pb-4 border-b border-neutral-100">
                <Avatar nom={fiche.client.name} url={resolveMediaUrl(fiche.client.avatar)} grande />
                <div className="min-w-0">
                  <p className="text-[17px] font-bold text-neutral-900 truncate">{fiche.client.name}</p>
                  {fiche.usual && (
                    <p className="text-[13px] text-neutral-500 mt-0.5">
                      Habitude : <span className="font-semibold text-neutral-700">{fiche.usual}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* La note privée d'abord : c'est ce qu'on vient chercher
                  quand le client est déjà dans le fauteuil. */}
              <div className="mt-4">
                <p className={MICRO_TITRE}>Note privée</p>
                <textarea
                  value={note}
                  onChange={(e) => { setNote(e.target.value); setNoteEtat('idle'); }}
                  placeholder="Sensible du cuir chevelu, préfère les ciseaux…"
                  rows={2}
                  maxLength={2000}
                  className="mt-2 w-full border border-neutral-200 rounded-xl px-3.5 py-2.5 text-[16px] text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:border-neutral-900 resize-none transition-colors"
                />
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[11px] text-neutral-400">Visible par vous seul, jamais par le client.</p>
                  <button
                    onClick={enregistrerNote}
                    disabled={noteEtat === 'saving'}
                    className="text-[12.5px] font-semibold text-white bg-neutral-900 px-3.5 min-h-[36px] rounded-xl disabled:opacity-50 active:scale-[0.97] transition-transform"
                  >
                    {noteEtat === 'saving' ? 'Enregistrement…' : noteEtat === 'saved' ? 'Enregistré ✓' : 'Enregistrer'}
                  </button>
                </div>
              </div>

              {/* Le conseil : l'ordonnance du coiffeur, VISIBLE par le client. */}
              <div className="mt-5 pt-4 border-t border-neutral-100">
                <p className={`${MICRO_TITRE} flex items-center gap-1.5`}>
                  <MessageCircleHeart size={12} className="text-neutral-400" />Conseil au client
                </p>
                <textarea
                  value={conseil}
                  onChange={(e) => { setConseil(e.target.value); setConseilEtat('idle'); }}
                  placeholder="Shampoing doux 2 fois par semaine, retouche des pointes dans 6 semaines…"
                  rows={2}
                  maxLength={1000}
                  className="mt-2 w-full border border-neutral-200 rounded-xl px-3.5 py-2.5 text-[16px] text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:border-neutral-900 resize-none transition-colors"
                />
                <div className="flex items-center justify-between mt-1.5 gap-3">
                  <p className="text-[11px] text-neutral-400 leading-snug">
                    Visible par {fiche.client.name.split(' ')[0]} dans son app — un
                    conseil enregistré le notifie.
                  </p>
                  <button
                    onClick={enregistrerConseil}
                    disabled={conseilEtat === 'saving'}
                    className="text-[12.5px] font-semibold text-white bg-neutral-900 px-3.5 min-h-[36px] rounded-xl disabled:opacity-50 active:scale-[0.97] transition-transform shrink-0"
                  >
                    {conseilEtat === 'saving' ? 'Envoi…' : conseilEtat === 'saved' ? 'Envoyé ✓' : 'Envoyer'}
                  </button>
                </div>
              </div>

              {/* Le rythme de retour — pilote le rappel automatique. */}
              <div className="mt-5 pt-4 border-t border-neutral-100">
                <p className={`${MICRO_TITRE} flex items-center gap-1.5`}>
                  <RotateCcw size={12} className="text-neutral-400" />Rappel de retour
                </p>
                <div className="flex gap-1.5 mt-2">
                  {RYTHMES.map((r) => (
                    <button
                      key={String(r.valeur)}
                      onClick={() => reglerRythme(r.valeur)}
                      disabled={rythmeEtat === 'saving'}
                      className={`flex-1 py-2 rounded-xl text-[12.5px] font-semibold border transition-all disabled:opacity-60 ${
                        fiche.rebook_weeks === r.valeur
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400'
                      }`}
                    >
                      {r.libelle}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug mt-1.5">
                  {fiche.rebook_weeks
                    ? `${fiche.client.name.split(' ')[0]} sera rappelé ${fiche.rebook_weeks} semaines après chaque passage.`
                    : 'Auto : le rappel suit son rythme réel constaté (par défaut 6 semaines).'}
                </p>
              </div>

              {/* Relance manuelle depuis la fiche aussi. */}
              <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-neutral-900">Relancer maintenant</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {fiche.relance_sent_at && !relancable(fiche.relance_sent_at)
                      ? `Relancé ${formatDate(fiche.relance_sent_at)} — 30 jours entre deux.`
                      : 'Une notification en votre nom, avec votre page de réservation.'}
                  </p>
                </div>
                <button
                  onClick={() => relancer(fiche.client.id)}
                  disabled={relanceEnCours === fiche.client.id || !relancable(fiche.relance_sent_at)}
                  className="flex items-center gap-1.5 text-[12.5px] font-bold text-white bg-neutral-900 px-3.5 min-h-[36px] rounded-xl disabled:opacity-40 active:scale-[0.97] transition-transform shrink-0"
                >
                  <Send size={12} />Relancer
                </button>
              </div>
              {relanceErreur && (
                <p className="mt-2 text-[12px] font-semibold text-red-600">{relanceErreur}</p>
              )}

              <div className="mt-5 pt-4 border-t border-neutral-100">
                <p className={MICRO_TITRE}>Historique chez vous</p>
                <ul className="mt-2 divide-y divide-neutral-50 max-h-[26vh] overflow-y-auto">
                  {fiche.appointments.map((a) => (
                    <li key={`rdv-${a.id}`} className="flex items-center gap-3 py-2.5">
                      <CalendarDays size={15} className="text-neutral-400 shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13.5px] text-neutral-900 truncate">{a.service}</span>
                        <span className="block text-[12px] text-neutral-500 tabular-nums">
                          {a.appointment_date ? formatDate(a.appointment_date) : '—'}
                          {a.appointment_time && ` · ${a.appointment_time.slice(0, 5)}`}
                          {a.status === 'no_show' && ' · absent'}
                        </span>
                      </span>
                      {a.price && (
                        <span className="text-[13px] font-semibold text-neutral-900 tabular-nums shrink-0">
                          {parseFloat(a.price).toFixed(0)} €
                        </span>
                      )}
                    </li>
                  ))}
                  {fiche.scans.map((v) => (
                    <li key={`scan-${v.id}`} className="flex items-center gap-3 py-2.5">
                      <QrCode size={15} className="text-neutral-400 shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13.5px] text-neutral-900 truncate">
                          {v.service_type ?? 'Passage vérifié'}
                        </span>
                        <span className="block text-[12px] text-neutral-500 tabular-nums">{formatDate(v.scanned_at)}</span>
                      </span>
                    </li>
                  ))}
                  {fiche.appointments.length === 0 && fiche.scans.length === 0 && (
                    <li className="py-3 text-[13px] text-neutral-500">Aucun passage enregistré.</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </BottomSheet>
      )}
    </div>
  );
}

function Avatar({ nom, url, grande = false }: { nom: string; url: string | null; grande?: boolean }) {
  const taille = grande ? 'w-12 h-12' : 'w-10 h-10';
  if (url) {
    return (
      <div className={`relative ${taille} rounded-full overflow-hidden bg-neutral-100 shrink-0`}>
        <Image src={url} alt={nom} fill className="object-cover" sizes="48px" />
      </div>
    );
  }
  return (
    <div className={`${taille} rounded-full bg-neutral-100 flex items-center justify-center shrink-0`}>
      <span className="text-[14px] font-bold text-neutral-500">{nom.charAt(0).toUpperCase()}</span>
    </div>
  );
}
