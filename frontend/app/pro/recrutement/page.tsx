'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { jobOffers, api } from '@/lib/api';
import type { ApiJobOffer } from '@/lib/types';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import OwnerEmptyState from '@/components/owner/OwnerEmptyState';
import OwnerOfferCard from '@/components/owner/OwnerOfferCard';
import OwnerApplicantCard, { type ApplicantStatus, APPLICANT_STATUS_LABELS } from '@/components/owner/OwnerApplicantCard';
import OwnerWizardShell from '@/components/owner/OwnerWizardShell';
import { Plus, ExternalLink, Briefcase } from 'lucide-react';

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

const WIZARD_STEPS = ['Poste', 'Niveau & lieu', 'Description', 'Aperçu'];

interface JobApplication {
  id: number;
  status: ApplicantStatus;
  message?: string;
  created_at: string;
  hairdresser?: { user?: { name?: string } };
  job_offer?: { title?: string; id?: number };
}

// Pipeline ATS à 4 étapes actives — 'declined' est une sortie possible depuis
// n'importe quelle étape, pas une étape de la progression normale.
const STAGE_ORDER: ApplicantStatus[] = ['pending', 'viewed', 'interview', 'accepted'];
const ADVANCE_LABELS: Partial<Record<ApplicantStatus, string>> = {
  pending:   'Contacter',
  viewed:    "Passer à l'entretien",
  interview: 'Accepter',
};

function nextStage(current: ApplicantStatus): ApplicantStatus | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx === -1 || idx === STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

const inputCls  = 'w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm focus:outline-none focus:border-neutral-400 transition-colors';

export default function RecrutementPage() {
  const { user, isLoading } = useRequireAuth(['salon_owner']);

  const [offers,      setOffers]      = useState<ApiJobOffer[]>([]);
  const [applications,setApplications]= useState<JobApplication[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showWizard,  setShowWizard]  = useState(false);
  const [wizardStep,  setWizardStep]  = useState(0);
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

  function openCreate() { setEditOffer(null); setForm(EMPTY_FORM); setWizardStep(0); setShowWizard(true); }

  function openEdit(offer: ApiJobOffer) {
    setEditOffer(offer);
    setForm({ title: offer.title, job_type: offer.job_type, level: offer.level ?? '', contract_type: offer.contract_type, description: offer.description ?? '', city: offer.city ?? '' });
    setWizardStep(0);
    setShowWizard(true);
  }

  async function handlePublish() {
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
      setShowWizard(false);
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

  async function handleAppStatus(appId: number, status: ApplicantStatus) {
    try {
      const updated = await api.put<JobApplication>(`/my-salon/applications/${appId}`, { status });
      setApplications((prev) => prev.map((a) => a.id === updated.id ? updated : a));
      showToast(`Candidature : ${APPLICANT_STATUS_LABELS[status]}.`);
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
  const isLastStep = wizardStep === WIZARD_STEPS.length - 1;

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

            {offers.length === 0 ? (
              <OwnerEmptyState
                icon={Briefcase}
                title="Aucune offre publiée."
                subtitle="Créez votre première offre pour attirer des coiffeurs."
                action={{ label: 'Créer une offre', onClick: openCreate, icon: Plus }}
              />
            ) : (
              <div className="space-y-3">
                {offers.map((offer) => (
                  <OwnerOfferCard
                    key={offer.id}
                    title={offer.title}
                    status={offer.status === 'open' ? 'open' : 'closed'}
                    contractLabel={CONTRACT_LABELS[offer.contract_type]}
                    jobTypeLabel={JOB_LABELS[offer.job_type]}
                    levelLabel={offer.level ? LEVEL_LABELS[offer.level] : undefined}
                    city={offer.city ?? undefined}
                    description={offer.description ?? undefined}
                    onToggleStatus={() => handleToggleStatus(offer)}
                    onEdit={() => openEdit(offer)}
                    onDelete={() => handleDelete(offer.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── CANDIDATURES ── */}
        {tab === 'candidatures' && (
          <>
            {applications.length === 0 ? (
              <OwnerEmptyState
                icon={Briefcase}
                title="Aucune candidature reçue."
                subtitle="Les candidatures apparaîtront ici dès qu'un coiffeur postule."
              />
            ) : (
              <div className="space-y-3">
                {applications.map((app) => {
                  const next = app.status === 'declined' ? null : nextStage(app.status);
                  return (
                    <OwnerApplicantCard
                      key={app.id}
                      name={app.hairdresser?.user?.name ?? 'Coiffeur'}
                      status={app.status}
                      subtitle={app.job_offer?.title ? `Pour : ${app.job_offer.title}` : undefined}
                      date={new Date(app.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      message={app.message}
                      expanded={expandedApp === app.id}
                      onToggleExpand={app.message ? () => setExpandedApp((v) => v === app.id ? null : app.id) : undefined}
                      onAdvance={next ? () => handleAppStatus(app.id, next) : undefined}
                      advanceLabel={next ? ADVANCE_LABELS[app.status] : undefined}
                      onDecline={app.status !== 'accepted' && app.status !== 'declined' ? () => handleAppStatus(app.id, 'declined') : undefined}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      </div>

      {showWizard && (
        <OwnerWizardShell
          title={editOffer ? "Modifier l'offre" : 'Nouvelle offre'}
          steps={WIZARD_STEPS}
          currentStep={wizardStep}
          onClose={() => setShowWizard(false)}
          onBack={wizardStep > 0 ? () => setWizardStep((s) => s - 1) : undefined}
          onNext={isLastStep ? handlePublish : () => setWizardStep((s) => s + 1)}
          nextDisabled={wizardStep === 0 && !form.title.trim()}
          saving={saving}
        >
          {wizardStep === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Titre du poste</label>
                <input type="text" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Recherche coloriste expérimenté(e)" autoFocus className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Type de poste</label>
                <select value={form.job_type} onChange={(e) => setForm((p) => ({ ...p, job_type: e.target.value as ApiJobOffer['job_type'] }))} className={inputCls}>
                  {JOB_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Contrat</label>
                <select value={form.contract_type} onChange={(e) => setForm((p) => ({ ...p, contract_type: e.target.value as ApiJobOffer['contract_type'] }))} className={inputCls}>
                  {CONTRACT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {wizardStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Niveau requis <span className="font-normal text-neutral-400">(optionnel)</span>
                </label>
                <select value={form.level ?? ''} onChange={(e) => setForm((p) => ({ ...p, level: e.target.value as ApiJobOffer['level'] | '' }))} className={inputCls}>
                  {LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Ville <span className="font-normal text-neutral-400">(optionnelle)</span></label>
                <input type="text" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} placeholder="Strasbourg" className={inputCls} />
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Description <span className="font-normal text-neutral-400">(optionnelle)</span></label>
              <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={8} placeholder="Expérience souhaitée, ambiance du salon, avantages..." className={`${inputCls} resize-none`} autoFocus />
            </div>
          )}

          {wizardStep === 3 && (
            <div className="bg-white rounded-[22px] shadow-[0_4px_16px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-100 p-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h3 className="text-base font-bold text-neutral-900">{form.title || 'Sans titre'}</h3>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="text-[10px] font-semibold bg-neutral-900 text-white px-2 py-0.5 rounded-full">{CONTRACT_LABELS[form.contract_type]}</span>
                <span className="text-[10px] font-semibold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">{JOB_LABELS[form.job_type]}</span>
                {form.level && <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{LEVEL_LABELS[form.level]}</span>}
                {form.city && <span className="text-[10px] text-neutral-400">{form.city}</span>}
              </div>
              {form.description && <p className="text-sm text-neutral-600 whitespace-pre-wrap">{form.description}</p>}
              <p className="text-xs text-neutral-400 mt-3">Cette offre sera visible publiquement dès sa publication.</p>
            </div>
          )}
        </OwnerWizardShell>
      )}
    </div>
  );
}
