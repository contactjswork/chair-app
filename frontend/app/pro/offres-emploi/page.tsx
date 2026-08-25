'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { api } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/types';
import {
  Briefcase, Clock, Search, X, Send, Check,
  ChevronLeft, ChevronRight, Building2, GraduationCap, Filter,
} from 'lucide-react';

const JOB_TYPE_LABELS: Record<string, string> = {
  hairdresser: 'Coiffeur(se)', colorist: 'Coloriste', barber: 'Barbier',
  stylist: 'Styliste', apprentice: 'Apprenti(e)', other: 'Autre',
};
const CONTRACT_LABELS: Record<string, string> = {
  cdi: 'CDI', cdd: 'CDD', alternance: 'Alternance', apprentissage: 'Apprentissage', freelance: 'Freelance',
};
const LEVEL_LABELS: Record<string, string> = {
  cap1: 'CAP 1ère année', cap2: 'CAP 2ème année', bp1: 'BP 1ère année',
  bp2: 'BP 2ème année', bm_bts1: 'BM/BTS 1ère année', bm_bts2: 'BM/BTS 2ème année',
};
const CONTRACT_COLORS: Record<string, string> = {
  cdi: 'bg-green-100 text-green-700', cdd: 'bg-blue-100 text-blue-700',
  alternance: 'bg-teal-100 text-teal-700', apprentissage: 'bg-amber-100 text-amber-700',
  freelance: 'bg-orange-100 text-orange-700',
};

type ContractFilter = '' | 'cdi' | 'cdd' | 'alternance' | 'apprentissage' | 'freelance';

interface JobOffer {
  id: number;
  title: string;
  job_type: string;
  contract_type: string;
  level?: string | null;
  description?: string | null;
  city?: string | null;
  status: 'open' | 'closed';
  created_at: string;
  salon?: {
    id: number;
    name: string;
    city?: string;
    slug?: string;
    logo?: string | null;
  };
}

interface Application {
  job_offer_id: number;
  status: 'pending' | 'accepted' | 'declined';
}

/** GET /job-offers renvoie un paginator Laravel, pas un tableau. */
interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
}

/** Le paginator plafonne à 20 offres par page : sans ça, la recherche et les
 *  filtres (appliqués côté client) mentaient dès la 21ᵉ offre publiée. */
const MAX_OFFER_PAGES = 10;

async function fetchAllOffers(): Promise<JobOffer[]> {
  const first = await api.get<Paginated<JobOffer>>('/job-offers');
  const all = [...first.data];
  const lastPage = Math.min(first.last_page ?? 1, MAX_OFFER_PAGES);

  for (let page = 2; page <= lastPage; page++) {
    const next = await api.get<Paginated<JobOffer>>(`/job-offers?page=${page}`);
    all.push(...next.data);
  }

  return all;
}

export default function OffresEmploiPage() {
  const { user, isLoading } = useRequireAuth(['hairdresser']);
  const [offers,   setOffers]   = useState<JobOffer[]>([]);
  const [myApps,   setMyApps]   = useState<Application[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [contract, setContract] = useState<ContractFilter>('');
  const [detail,   setDetail]   = useState<JobOffer | null>(null);
  const [message,  setMessage]  = useState('');
  const [sending,  setSending]  = useState(false);
  const [toast,    setToast]    = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    if (!user) return;
    Promise.allSettled([
      fetchAllOffers(),
      api.get<Application[]>('/my-applications'),
    ]).then(([r, a]) => {
      if (r.status === 'fulfilled') setOffers(r.value);
      if (a.status === 'fulfilled' && Array.isArray(a.value)) setMyApps(a.value);
    }).finally(() => setLoading(false));
  }, [user]);

  const getMyApp = (id: number) => myApps.find((a) => a.job_offer_id === id);

  const filtered = offers.filter((o) => {
    if (o.status !== 'open') return false;
    if (contract && o.contract_type !== contract) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        o.title.toLowerCase().includes(q) ||
        (o.salon?.name ?? '').toLowerCase().includes(q) ||
        (o.city ?? o.salon?.city ?? '').toLowerCase().includes(q) ||
        JOB_TYPE_LABELS[o.job_type]?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  async function handleApply() {
    if (!detail) return;
    setSending(true);
    try {
      const app = await api.post<Application>(`/job-offers/${detail.id}/apply`, { message: message.trim() || null });
      setMyApps((prev) => [...prev.filter((a) => a.job_offer_id !== detail.id), app]);
      showToast('Candidature envoyée !');
      setMessage('');
    } catch {
      showToast('Erreur lors de l\'envoi.');
    } finally {
      setSending(false);
    }
  }

  const daysAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (diff === 0) return 'Aujourd\'hui';
    if (diff === 1) return 'Hier';
    return `Il y a ${diff} jours`;
  };

  if (isLoading || loading) {
    return <div className="min-h-screen bg-neutral-50 flex items-center justify-center"><div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" /></div>;
  }

  // ── VUE DÉTAIL ───────────────────────────────────────────────────────────
  if (detail) {
    const myApp = getMyApp(detail.id);
    const city  = detail.city ?? detail.salon?.city ?? null;

    return (
      <div className="min-h-screen bg-neutral-50 pb-24">
        {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl">{toast}</div>}

        <div className="max-w-2xl mx-auto px-4 pt-4 pb-6">
          <button onClick={() => setDetail(null)} className="flex items-center text-neutral-500 font-medium mb-4 hover:text-neutral-900 transition-colors p-1 -ml-1 rounded-lg">
            <ChevronLeft size={18} />
          </button>

          {/* Entreprise header */}
          <div className="bg-white rounded-[24px] shadow-[0_4px_18px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-100 p-5 mb-4">
            <div className="flex items-start gap-4">
              {detail.salon?.logo ? (
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-100 relative border border-neutral-100">
                  <Image src={resolveMediaUrl(detail.salon.logo)!} alt="" fill className="object-cover" sizes="56px" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-xl flex-shrink-0 bg-neutral-100 flex items-center justify-center">
                  <Building2 size={22} className="text-neutral-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-neutral-900 mb-0.5">{detail.title}</h1>
                {detail.salon && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {detail.salon.slug ? (
                      /* Navigation interne : dans l'app Capacitor, target="_blank"
                         éjecte vers Safari où l'utilisateur n'est pas connecté. */
                      <Link href={`/app/salon/${detail.salon.slug}`}
                        className="text-sm font-semibold text-neutral-900 hover:underline flex items-center gap-1">
                        {detail.salon.name}<ChevronRight size={12} className="text-neutral-400" />
                      </Link>
                    ) : (
                      <span className="text-sm font-semibold text-neutral-700">{detail.salon.name}</span>
                    )}
                    {city && <span className="text-xs text-neutral-400">· {city}</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mt-4">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CONTRACT_COLORS[detail.contract_type] ?? 'bg-neutral-100 text-neutral-600'}`}>
                {CONTRACT_LABELS[detail.contract_type] ?? detail.contract_type}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600">
                {JOB_TYPE_LABELS[detail.job_type] ?? detail.job_type}
              </span>
              {detail.level && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 flex items-center gap-1">
                  <GraduationCap size={10} />{LEVEL_LABELS[detail.level] ?? detail.level}
                </span>
              )}
            </div>

            <p className="text-[11px] text-neutral-400 mt-3 flex items-center gap-1">
              <Clock size={10} />{daysAgo(detail.created_at)}
            </p>
          </div>

          {/* Description */}
          {detail.description && (
            <div className="bg-white rounded-[24px] shadow-[0_4px_18px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-100 p-5 mb-4">
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">Description du poste</h3>
              <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">{detail.description}</p>
            </div>
          )}

          {/* CTA candidature */}
          <div className="bg-white rounded-[24px] shadow-[0_4px_18px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-100 p-5">
            {myApp ? (
              <div className={`flex items-center gap-3 p-3 rounded-xl ${
                myApp.status === 'accepted' ? 'bg-green-50' :
                myApp.status === 'declined' ? 'bg-red-50' : 'bg-neutral-50'
              }`}>
                <Check size={15} className={myApp.status === 'accepted' ? 'text-green-600' : myApp.status === 'declined' ? 'text-red-500' : 'text-neutral-500'} />
                <div>
                  <p className={`text-sm font-bold ${myApp.status === 'accepted' ? 'text-green-700' : myApp.status === 'declined' ? 'text-red-600' : 'text-neutral-700'}`}>
                    {myApp.status === 'accepted' ? 'Candidature acceptée !' : myApp.status === 'declined' ? 'Candidature non retenue.' : 'Candidature envoyée'}
                  </p>
                  <p className={`text-xs ${myApp.status === 'accepted' ? 'text-green-600' : myApp.status === 'declined' ? 'text-red-500' : 'text-neutral-500'}`}>
                    {myApp.status === 'pending' && 'En attente de réponse du salon.'}
                    {myApp.status === 'accepted' && 'Le salon va vous contacter très prochainement.'}
                    {myApp.status === 'declined' && 'Ne vous découragez pas, continuez à postuler !'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-widest mb-3">Postuler à cette offre</h3>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Présentez-vous en quelques lignes : expérience, disponibilité..."
                  className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm resize-none focus:outline-none focus:border-neutral-800 transition-colors mb-3"
                />
                <button onClick={handleApply} disabled={sending}
                  className="w-full py-3.5 bg-neutral-900 text-white text-sm font-bold rounded-2xl hover:bg-neutral-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  <Send size={14} />{sending ? 'Envoi en cours...' : 'Envoyer ma candidature'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── VUE LISTE ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl">{toast}</div>}

      <div className="max-w-2xl mx-auto px-4 pt-4 pb-6">
        <DashboardPageHeader title="Offres d'emploi" />
        <div className="mb-4 hidden md:block">
          <h1 className="text-xl font-bold text-neutral-900">Offres d&apos;emploi</h1>
          <p className="text-xs text-neutral-400 mt-0.5">{filtered.length} offre{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <p className="text-xs text-neutral-400 mb-4 md:hidden">{filtered.length} offre{filtered.length !== 1 ? 's' : ''}</p>

        {/* Barre recherche + filtre */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Titre, salon, ville..."
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-neutral-200 rounded-2xl text-sm focus:outline-none focus:border-neutral-800 transition-colors" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"><X size={13} /></button>}
          </div>
          <button onClick={() => setShowFilters((p) => !p)}
            className={`w-10 h-10 flex items-center justify-center rounded-2xl border transition-colors ${showFilters || contract ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white border-neutral-200 text-neutral-600'}`}>
            <Filter size={14} />
          </button>
        </div>

        {/* Filtres contrat */}
        {showFilters && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(['', 'cdi', 'cdd', 'alternance', 'apprentissage', 'freelance'] as ContractFilter[]).map((c) => (
              <button key={c} onClick={() => setContract(c)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${contract === c ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'}`}>
                {c === '' ? 'Tous' : CONTRACT_LABELS[c]}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="bg-white rounded-[28px] shadow-[0_4px_18px_-8px_rgba(10,10,10,0.08)] ring-1 ring-neutral-100 p-12 text-center">
            <Briefcase size={36} className="text-neutral-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-neutral-700">Aucune offre disponible</p>
            <p className="text-xs text-neutral-400 mt-1">
              {search || contract ? 'Essayez une autre recherche ou un autre filtre.' : 'Revenez bientôt, de nouvelles offres arrivent régulièrement.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => {
              const myApp  = getMyApp(o.id);
              const city   = o.city ?? o.salon?.city ?? null;
              return (
                <button key={o.id} onClick={() => setDetail(o)}
                  className="w-full text-left bg-white rounded-[22px] shadow-[0_2px_12px_-6px_rgba(10,10,10,0.1)] ring-1 ring-neutral-100 p-4 hover:shadow-[0_8px_24px_-8px_rgba(10,10,10,0.18)] transition-all">
                  <div className="flex items-start gap-3">
                    {/* Logo */}
                    <div className="w-11 h-11 rounded-xl flex-shrink-0 bg-neutral-100 flex items-center justify-center overflow-hidden relative">
                      {o.salon?.logo
                        ? <Image src={resolveMediaUrl(o.salon.logo)!} alt="" fill className="object-cover" sizes="44px" />
                        : <Building2 size={16} className="text-neutral-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-neutral-900 line-clamp-1">{o.title}</p>
                        {myApp && (
                          <span className={`flex-shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                            myApp.status === 'accepted' ? 'bg-green-100 text-green-700' :
                            myApp.status === 'declined' ? 'bg-red-100 text-red-500' :
                            'bg-neutral-100 text-neutral-500'
                          }`}>
                            {myApp.status === 'accepted' ? 'Accepté' : myApp.status === 'declined' ? 'Refusé' : 'Postulé'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 mb-2">{o.salon?.name ?? 'Salon'}{city ? ` · ${city}` : ''}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CONTRACT_COLORS[o.contract_type] ?? 'bg-neutral-100 text-neutral-600'}`}>
                          {CONTRACT_LABELS[o.contract_type] ?? o.contract_type}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                          {JOB_TYPE_LABELS[o.job_type] ?? o.job_type}
                        </span>
                        {o.level && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                            {LEVEL_LABELS[o.level] ?? o.level}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-2 flex items-center gap-0.5">
                    <Clock size={9} />{daysAgo(o.created_at)}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
