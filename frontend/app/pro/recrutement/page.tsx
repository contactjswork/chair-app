'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { jobOffers, api } from '@/lib/api';
import type { ApiJobOffer } from '@/lib/types';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { Plus, Edit2, Trash2, MapPin, ExternalLink, Briefcase, Check, X, ChevronDown, ChevronUp, GraduationCap } from 'lucide-react';

const JOB_TYPE_OPTIONS = [
  { value: 'hairdresser', label: 'Coiffeur(se)' },
  { value: 'colorist',    label: 'Coloriste' },
  { value: 'barber',      label: 'Barbier' },
  { value: 'stylist',     label: 'Styliste' },
  { value: 'apprentice',  label: 'Apprenti(e)' },
  { value: 'other',       label: 'Autre' },
];
const CONTRACT_OPTIONS = [
  { value: 'cdi',          label: 'CDI' },
  { value: 'cdd',          label: 'CDD' },
  { value: 'alternance',   label: 'Alternance' },
  { value: 'apprentissage',label: 'Apprentissage' },
  { value: 'freelance',    label: 'Freelance' },
];
const LEVEL_OPTIONS = [
  { value: '',        label: '— Non défini —' },
  { value: 'cap1',    label: 'CAP 1' },
  { value: 'cap2',    label: 'CAP 2' },
  { value: 'bp1',     label: 'BP 1' },
  { value: 'bp2',     label: 'BP 2' },
  { value: 'bm_bts1', label: 'BM/BTS 1' },
  { value: 'bm_bts2', label: 'BM/BTS 2' },
];
const LEVEL_LABELS: Record<string, string> = {
  cap1: 'CAP 1', cap2: 'CAP 2', bp1: 'BP 1', bp2: 'BP 2', bm_bts1: 'BM/BTS 1', bm_bts2: 'BM/BTS 2',
};
const CONTRACT_LABELS: Record<string, string> = Object.fromEntries(CONTRACT_OPTIONS.map((o) => [o.value, o.label]));
const JOB_LABELS:      Record<string, string> = Object.fromEntries(JOB_TYPE_OPTIONS.map((o) => [o.value, o.label]));

type FormData = {
  title: string;
  job_type: ApiJobOffer['job_type'];
  level: ApiJobOffer['level'] | '';
  contract_type: ApiJobOffer['contract_type'];
  description: string;
  city: string;
};
const EMPTY_FORM: FormData = { title: '', job_type: 'hairdresser', level: '', contract_type: 'cdi', description: '', city: '' };

interface JobApplication {
  id: number;
  status: 'pending' | 'viewed' | 'accepted' | 'declined';
  message?: string;
  created_at: string;
  hairdresser?: { user?: { name?: string } };
  job_offer?: { title?: string; id?: number };
}

const APP_STATUS_STYLES: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700',
  viewed:   'bg-neutral-100 text-neutral-600',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-600',
};
const APP_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', viewed: 'Vue', accepted: 'Acceptée', declined: 'Refusée',
};

const inputCls  = 'w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 transition-colors';

export default function RecrutementPage() {
  const { user, isLoading } = useRequireAuth(['salon_owner']);

  const [offers,      setOffers]      = useState<ApiJobOffer[]>([]);
  const [applications,setApplications]= useState<JobApplication[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [editOffer,   setEditOffer]   = useState<ApiJobOffer | null>(null);
  const [form,        setForm]        = useState<FormData>(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState<string | null>(null);
  const [tab,         setTab]         = useState<'offres' | 'candidatures'>('offres');
  const [expandedApp, setExpandedApp] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.allSettled([
      jobOffers.myOffers(),
      api.get<JobApplication[]>('/my-salon/applications'),
    ]).then(([offersRes, appsRes]) => {
      if (offersRes.status === 'fulfilled')  setOffers(offersRes.value);
      if (appsRes.status === 'fulfilled')    setApplications(appsRes.value);
    }).finally(() => setLoading(false));
  }, [user]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function openCreate() { setEditOffer(null); setForm(EMPTY_FORM); setShowForm(true); }

  function openEdit(offer: ApiJobOffer) {
    setEditOffer(offer);
    setForm({ title: offer.title, job_type: offer.job_type, level: offer.level ?? '', contract_type: offer.contract_type, description: offer.description ?? '', city: offer.city ?? '' });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, level: form.level || null };
      if (editOffer) {
        const updated = await jobOffers.update(editOffer.id, payload);
        setOffers((prev) => prev.map((o) => o.id === updated.id ? updated : o));
        showToast('Offre mise à jour.');
      } else {
        const created = await jobOffers.create(payload);
        setOffers((prev) => [created, ...prev]);
        showToast('Offre publiée.');
      }
      setShowForm(false);
    } catch { showToast('Erreur lors de la sauvegarde.'); }
    finally { setSaving(false); }
  }

  async function handleToggleStatus(offer: ApiJobOffer) {
    const newStatus = offer.status === 'open' ? 'closed' : 'open';
    try {
      const updated = await jobOffers.update(offer.id, { status: newStatus });
      setOffers((prev) => prev.map((o) => o.id === updated.id ? updated : o));
    } catch { showToast('Erreur.'); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer cette offre ?')) return;
    try {
      await jobOffers.remove(id);
      setOffers((prev) => prev.filter((o) => o.id !== id));
      showToast('Offre supprimée.');
    } catch { showToast('Erreur.'); }
  }

  async function handleAppStatus(appId: number, status: 'viewed' | 'accepted' | 'declined') {
    try {
      const updated = await api.put<JobApplication>(`/my-salon/applications/${appId}`, { status });
      setApplications((prev) => prev.map((a) => a.id === updated.id ? updated : a));
      showToast(status === 'accepted' ? 'Candidature acceptée.' : status === 'declined' ? 'Candidature refusée.' : 'Marquée comme vue.');
    } catch { showToast('Erreur.'); }
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  const pendingCount = applications.filter((a) => a.status === 'pending').length;

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <div className="flex-1">

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl">
          {toast}
        </div>
      )}

      <div className="max-w-xl mx-auto px-4 pt-4 pb-6">
        <DashboardPageHeader title="Recrutement" />

        {/* Tabs */}
        <div className="flex gap-1 bg-neutral-100 rounded-xl p-1 mb-4">
          {([['offres', 'Offres'], ['candidatures', 'Candidatures']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === key ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}>
              {label}
              {key === 'candidatures' && pendingCount > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-1 leading-none">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── OFFRES ── */}
        {tab === 'offres' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-neutral-500">{offers.filter((o) => o.status === 'open').length} active(s)</p>
              <div className="flex items-center gap-2">
                <Link href="/recrutement" target="_blank"
                  className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 border border-neutral-200 px-3 py-2 rounded-xl hover:bg-neutral-50 transition-colors">
                  <ExternalLink size={12} />Page publique
                </Link>
                <button onClick={openCreate}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-neutral-900 text-white px-3 py-2 rounded-xl hover:bg-neutral-700 transition-colors">
                  <Plus size={13} />Nouvelle offre
                </button>
              </div>
            </div>

            {showForm && (
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-neutral-100 p-4 mb-4 space-y-3">
                <h2 className="text-sm font-bold text-neutral-900">{editOffer ? "Modifier l'offre" : 'Nouvelle offre'}</h2>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Titre du poste</label>
                  <input type="text" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Recherche coloriste expérimenté(e)" required className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Type de poste</label>
                    <select value={form.job_type} onChange={(e) => setForm((p) => ({ ...p, job_type: e.target.value as ApiJobOffer['job_type'] }))} className={inputCls}>
                      {JOB_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Contrat</label>
                    <select value={form.contract_type} onChange={(e) => setForm((p) => ({ ...p, contract_type: e.target.value as ApiJobOffer['contract_type'] }))} className={inputCls}>
                      {CONTRACT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Niveau requis <span className="font-normal text-neutral-400">(optionnel)</span>
                  </label>
                  <select value={form.level ?? ''} onChange={(e) => setForm((p) => ({ ...p, level: e.target.value as ApiJobOffer['level'] | '' }))} className={inputCls}>
                    {LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Ville <span className="font-normal text-neutral-400">(optionnelle)</span></label>
                  <input type="text" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} placeholder="Strasbourg" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Description <span className="font-normal text-neutral-400">(optionnelle)</span></label>
                  <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    rows={3} placeholder="Expérience souhaitée, ambiance du salon, avantages..." className={`${inputCls} resize-none`} />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="flex-1 py-2.5 text-sm font-semibold text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors">
                    Annuler
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-2.5 text-sm font-semibold bg-neutral-900 text-white rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-50">
                    {saving ? 'Enregistrement...' : (editOffer ? 'Mettre à jour' : 'Publier')}
                  </button>
                </div>
              </form>
            )}

            {offers.length === 0 && !showForm ? (
              <div className="bg-white rounded-2xl border border-neutral-100 p-10 text-center">
                <Briefcase size={32} className="text-neutral-300 mx-auto mb-3" />
                <p className="text-sm text-neutral-500 mb-1">Aucune offre publiée.</p>
                <p className="text-xs text-neutral-400">Créez votre première offre pour attirer des coiffeurs.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {offers.map((offer) => (
                  <div key={offer.id} className={`bg-white rounded-2xl border border-neutral-100 p-4 ${offer.status !== 'open' ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-bold text-neutral-900 truncate">{offer.title}</h3>
                          <span className={`flex-shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${offer.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>
                            {offer.status === 'open' ? 'Active' : 'Clôturée'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <span className="text-[10px] font-semibold bg-neutral-900 text-white px-2 py-0.5 rounded-full">{CONTRACT_LABELS[offer.contract_type]}</span>
                          <span className="text-[10px] font-semibold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">{JOB_LABELS[offer.job_type]}</span>
                          {offer.level && (
                            <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                              <GraduationCap size={9} />{LEVEL_LABELS[offer.level]}
                            </span>
                          )}
                          {offer.city && <span className="text-[10px] text-neutral-400 flex items-center gap-0.5"><MapPin size={9} />{offer.city}</span>}
                        </div>
                        {offer.description && <p className="text-xs text-neutral-500 mt-1.5 line-clamp-2">{offer.description}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => handleToggleStatus(offer)}
                          className="text-xs text-neutral-500 border border-neutral-200 px-2.5 py-1.5 rounded-xl hover:bg-neutral-50 transition-colors whitespace-nowrap">
                          {offer.status === 'open' ? 'Clôturer' : 'Réouvrir'}
                        </button>
                        <button onClick={() => openEdit(offer)}
                          className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDelete(offer.id)}
                          className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── CANDIDATURES ── */}
        {tab === 'candidatures' && (
          <>
            {applications.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-100 p-10 text-center">
                <Briefcase size={32} className="text-neutral-300 mx-auto mb-3" />
                <p className="text-sm text-neutral-500 mb-1">Aucune candidature reçue.</p>
                <p className="text-xs text-neutral-400">Les candidatures apparaîtront ici dès qu&apos;un coiffeur postule.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => (
                  <div key={app.id} className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
                    <div className="flex items-start gap-3 p-4">
                      <div className="w-9 h-9 rounded-full bg-neutral-200 flex-shrink-0 flex items-center justify-center">
                        <span className="text-sm font-bold text-neutral-500">
                          {app.hairdresser?.user?.name?.[0] ?? '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-neutral-900">{app.hairdresser?.user?.name ?? 'Coiffeur'}</p>
                          <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${APP_STATUS_STYLES[app.status]}`}>
                            {APP_STATUS_LABELS[app.status]}
                          </span>
                        </div>
                        {app.job_offer?.title && (
                          <p className="text-xs text-neutral-500 mt-0.5">Pour : {app.job_offer.title}</p>
                        )}
                        <p className="text-[10px] text-neutral-400 mt-0.5">
                          {new Date(app.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {(app.status === 'pending' || app.status === 'viewed') && (
                          <>
                            <button onClick={() => handleAppStatus(app.id, 'accepted')}
                              className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors">
                              <Check size={14} className="text-white" />
                            </button>
                            <button onClick={() => handleAppStatus(app.id, 'declined')}
                              className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-colors">
                              <X size={14} />
                            </button>
                          </>
                        )}
                        {app.message && (
                          <button onClick={() => setExpandedApp((v) => v === app.id ? null : app.id)}
                            className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors">
                            {expandedApp === app.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        )}
                      </div>
                    </div>
                    {expandedApp === app.id && app.message && (
                      <div className="px-4 pb-4 pt-0 border-t border-neutral-100">
                        <p className="text-xs text-neutral-600 pt-3 italic">&quot;{app.message}&quot;</p>
                        {app.status === 'pending' && (
                          <button onClick={() => handleAppStatus(app.id, 'viewed')}
                            className="mt-2 text-[11px] text-neutral-400 hover:text-neutral-600 underline">
                            Marquer comme vue
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  );
}
