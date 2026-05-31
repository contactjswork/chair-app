'use client';

import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import DashboardNav from '@/components/layout/DashboardNav';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { appointments as apptApi } from '@/lib/api';
import type { ApiAppointment, AppointmentStatus } from '@/lib/types';
import { formatDate } from '@/lib/types';
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle, Copy, Check } from 'lucide-react';

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string }> = {
  pending:   { label: 'En attente',  color: 'text-amber-600 bg-amber-50 border-amber-200' },
  confirmed: { label: 'Confirmé',    color: 'text-green-700 bg-green-50 border-green-200' },
  completed: { label: 'Terminé',     color: 'text-neutral-600 bg-neutral-100 border-neutral-200' },
  declined:  { label: 'Refusé',      color: 'text-red-600 bg-red-50 border-red-200' },
  cancelled: { label: 'Annulé',      color: 'text-neutral-400 bg-neutral-50 border-neutral-200' },
};

const ACTIVE_STATUSES: AppointmentStatus[] = ['pending', 'confirmed'];
const PAST_STATUSES: AppointmentStatus[]   = ['completed', 'declined', 'cancelled'];

function CopyButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/avis/${token}`;

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700 border border-neutral-200 bg-white px-3 py-1.5 rounded-lg hover:border-neutral-400 transition-all"
    >
      {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
      {copied ? 'Copié !' : "Lien d'avis"}
    </button>
  );
}

function AppointmentCard({
  appt,
  onStatusChange,
}: {
  appt: ApiAppointment;
  onStatusChange: (id: number, status: AppointmentStatus) => void;
}) {
  const cfg    = STATUS_CONFIG[appt.status];
  const isPending   = appt.status === 'pending';
  const isConfirmed = appt.status === 'confirmed';

  const dateFormatted = new Date(appt.desired_date).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="bg-white border border-neutral-100 rounded-2xl p-4 space-y-3">
      {/* En-tête : client + statut */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-neutral-900">{appt.client_name}</p>
          <p className="text-xs text-neutral-400">{appt.client_email}</p>
          {appt.client_phone && <p className="text-xs text-neutral-400">{appt.client_phone}</p>}
        </div>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      {/* Détails prestation */}
      <div className="bg-neutral-50 rounded-xl px-3 py-2.5 space-y-1.5">
        <p className="text-sm font-medium text-neutral-900">{appt.service}</p>
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {dateFormatted}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {appt.desired_slot}
          </span>
        </div>
        {appt.message && (
          <p className="text-xs text-neutral-500 italic border-t border-neutral-200 pt-1.5 mt-1.5">
            "{appt.message}"
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {isPending && (
          <>
            <button
              onClick={() => onStatusChange(appt.id, 'confirmed')}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-neutral-900 px-3 py-2 rounded-lg hover:bg-neutral-700 transition-colors"
            >
              <CheckCircle2 size={13} />
              Confirmer
            </button>
            <button
              onClick={() => onStatusChange(appt.id, 'declined')}
              className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 border border-neutral-200 bg-white px-3 py-2 rounded-lg hover:border-neutral-400 transition-all"
            >
              <XCircle size={13} />
              Refuser
            </button>
          </>
        )}
        {isConfirmed && (
          <>
            <button
              onClick={() => onStatusChange(appt.id, 'completed')}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-neutral-900 px-3 py-2 rounded-lg hover:bg-neutral-700 transition-colors"
            >
              <CheckCircle2 size={13} />
              Marquer terminé
            </button>
            <button
              onClick={() => onStatusChange(appt.id, 'cancelled')}
              className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 border border-neutral-200 bg-white px-3 py-2 rounded-lg hover:border-neutral-400 transition-all"
            >
              Annuler
            </button>
          </>
        )}
        {appt.status === 'completed' && appt.review_token && (
          <CopyButton token={appt.review_token} />
        )}
        <span className="text-[10px] text-neutral-400 ml-auto">{formatDate(appt.created_at)}</span>
      </div>
    </div>
  );
}

export default function ReservationsPage() {
  const { user, isLoading: authLoading } = useRequireAuth(['hairdresser']);
  const [appts, setAppts]   = useState<ApiAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState<'active' | 'past'>('active');

  const loadAppts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apptApi.list() as ApiAppointment[];
      setAppts(data);
    } catch { setAppts([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) loadAppts();
  }, [user, loadAppts]);

  async function handleStatusChange(id: number, status: AppointmentStatus) {
    try {
      const updated = await apptApi.updateStatus(id, status) as ApiAppointment;
      setAppts((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch { /* silently ignore */ }
  }

  if (authLoading) return null;

  const activeAppts = appts.filter((a) => ACTIVE_STATUSES.includes(a.status));
  const pastAppts   = appts.filter((a) => PAST_STATUSES.includes(a.status));
  const displayed   = tab === 'active' ? activeAppts : pastAppts;

  // Cas coiffeur non-indépendant
  const isIndependent = user?.hairdresser_profile?.is_independent !== false;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto pb-28 md:pb-8">
        <div className="px-4 pt-6 pb-4 border-b border-neutral-100">
          <h1 className="text-xl font-bold text-neutral-900">Rendez-vous</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Gérez vos demandes de rendez-vous</p>
        </div>

        {!isIndependent ? (
          /* Coiffeur en salon */
          <div className="px-4 py-16 text-center">
            <AlertCircle size={40} className="text-neutral-300 mx-auto mb-4" strokeWidth={1.5} />
            <h2 className="text-base font-semibold text-neutral-900 mb-2">Réservation via votre salon</h2>
            <p className="text-sm text-neutral-400 max-w-xs mx-auto leading-relaxed">
              Les rendez-vous sont gérés par votre salon. Si vous souhaitez gérer vos propres réservations, passez en mode indépendant dans votre profil.
            </p>
          </div>
        ) : (
          <div className="px-4 pt-4">
            {/* Tabs */}
            <div className="flex bg-neutral-100 rounded-xl p-1 mb-5">
              {(['active', 'past'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 text-sm font-medium py-2 rounded-lg transition-all ${
                    tab === t ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  {t === 'active'
                    ? `En cours${activeAppts.length > 0 ? ` (${activeAppts.length})` : ''}`
                    : 'Historique'}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-36 rounded-2xl bg-neutral-100 animate-pulse" />
                ))}
              </div>
            ) : displayed.length > 0 ? (
              <div className="space-y-3">
                {displayed.map((appt) => (
                  <AppointmentCard key={appt.id} appt={appt} onStatusChange={handleStatusChange} />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <Calendar size={36} className="text-neutral-300 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-sm font-semibold text-neutral-900 mb-1">
                  {tab === 'active' ? 'Aucune demande en cours' : 'Aucun historique'}
                </p>
                <p className="text-xs text-neutral-400">
                  {tab === 'active' ? 'Les nouvelles demandes apparaîtront ici.' : 'Les rendez-vous terminés ou refusés apparaîtront ici.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      <DashboardNav />
    </AppShell>
  );
}
