'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import { resolveMediaUrl, formatDate } from '@/lib/types';
import { CARTE, MICRO_TITRE } from '@/lib/proStyle';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import BottomSheet from '@/components/ui/BottomSheet';
import EmptyState from '@/components/ui/EmptyState';
import { NotebookPen, Search, Users, QrCode, CalendarDays } from 'lucide-react';

/**
 * Le carnet de clients — le CRM minimal qui fait pro.
 *
 * Ce que le coiffeur veut savoir quand un client rappelle : quand est-il
 * venu, qu'est-ce qu'il prend d'habitude, et qu'est-ce que je m'étais noté
 * (« sensible du cuir chevelu », « toujours 10 min en retard »).
 *
 * La note est STRICTEMENT privée — le client ne la verra jamais, et la
 * fiche le dit en toutes lettres pour que le coiffeur écrive sans se
 * censurer ni déraper : ce qu'on écrit se relit.
 */

interface LigneClient {
  user_id: number;
  name: string;
  avatar: string | null;
  last_seen: string | null;
  rdv_count: number;
  scan_count: number;
  has_note: boolean;
}

interface FicheClient {
  client: { id: number; name: string; avatar: string | null };
  usual: string | null;
  appointments: { id: number; service: string; appointment_date: string | null; appointment_time: string | null; price: string | null; status: string }[];
  scans: { id: number; service_type: string | null; scanned_at: string }[];
  note: string | null;
}

export default function ProClientsPage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);

  const [clients, setClients] = useState<LigneClient[]>([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [fiche, setFiche] = useState<FicheClient | null>(null);
  const [ficheOuverte, setFicheOuverte] = useState(false);

  const [note, setNote] = useState('');
  const [noteEtat, setNoteEtat] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    if (!user) return;
    let annule = false;
    api
      .get<{ clients: LigneClient[] }>('/my-clients')
      .then((d) => { if (!annule) setClients(d.clients); })
      .catch(() => {})
      .finally(() => { if (!annule) setChargement(false); });
    return () => { annule = true; };
  }, [user]);

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, recherche]);

  function ouvrir(userId: number) {
    setFicheOuverte(true);
    setFiche(null);
    setNoteEtat('idle');
    api
      .get<FicheClient>(`/my-clients/${userId}`)
      .then((d) => { setFiche(d); setNote(d.note ?? ''); })
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
              <button
                key={c.user_id}
                onClick={() => ouvrir(c.user_id)}
                className="w-full flex items-center gap-3 px-4 py-3 min-h-[64px] text-left active:bg-neutral-50 transition-colors"
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
            ))}
            {filtres.length === 0 && (
              <p className="px-4 py-6 text-[13px] text-neutral-500 text-center">
                Aucun client ne correspond à « {recherche} ».
              </p>
            )}
          </div>
        )}
      </div>

      {ficheOuverte && (
        <BottomSheet onClose={() => setFicheOuverte(false)} maxHeight="max-h-[88vh]">
          {!fiche ? (
            <div className="h-40 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="px-5 pb-8">
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
                  rows={3}
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

              <div className="mt-5">
                <p className={MICRO_TITRE}>Historique chez vous</p>
                <ul className="mt-2 divide-y divide-neutral-50 max-h-[32vh] overflow-y-auto">
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
