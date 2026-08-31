'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { appointments as apptApi } from '@/lib/api';
import type { ApiAppointment, AppointmentStatus } from '@/lib/types';
import { formatDate, getAfterImage } from '@/lib/types';
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle, Copy, Check } from 'lucide-react';

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string }> = {
  pending:         { label: 'En attente',           color: 'text-amber-600 bg-amber-50' },
  pending_payment: { label: 'Paiement en attente',  color: 'text-blue-700 bg-blue-50' },
  confirmed:       { label: 'Confirme',             color: 'text-green-700 bg-green-50' },
  completed:       { label: 'Termine',              color: 'text-neutral-600 bg-neutral-100' },
  declined:        { label: 'Refuse',               color: 'text-red-600 bg-red-50' },
  cancelled:       { label: 'Annule',               color: 'text-neutral-400 bg-neutral-50' },
  no_show:         { label: 'Absent',               color: 'text-orange-600 bg-orange-50' },
};

const ACTIVE_STATUSES: AppointmentStatus[] = ['pending', 'pending_payment', 'confirmed'];
const PAST_STATUSES: AppointmentStatus[]   = ['completed', 'declined', 'cancelled', 'no_show'];

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
      className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 px-3 py-1.5 rounded-xl hover:bg-neutral-200 transition-colors"
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

  const displayDate = appt.appointment_date || appt.desired_date;
  const dateFormatted = displayDate
    ? new Date(displayDate + 'T00:00:00').toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';
  const timeFormatted = appt.appointment_time
    ? appt.appointment_time.slice(0, 5)
    : appt.desired_slot;
  const referenceImage = appt.reference_post ? getAfterImage(appt.reference_post) : null;
  const referenceAuthor = appt.reference_post?.hairdresser?.user?.name ?? null;

  return (
    <div className="bg-white rounded-[22px] shadow-[0_4px_16px_-8px_rgba(10,10,10,0.12)] ring-1 ring-neutral-50 p-4 space-y-3">
      {/* En-tête : client + statut */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-neutral-900">{appt.client_name}</p>
          <p className="text-xs text-neutral-400">{appt.client_email}</p>
          {appt.client_phone && <p className="text-xs text-neutral-400">{appt.client_phone}</p>}
        </div>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      {/* Détails prestation */}
      <div className="bg-neutral-50 rounded-2xl px-3 py-2.5 space-y-1.5">
        <p className="text-sm font-medium text-neutral-900">{appt.service}</p>
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {dateFormatted}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {timeFormatted}
            {appt.duration_minutes && ` · ${appt.duration_minutes} min`}
          </span>
          {appt.price && (
            <span className="font-semibold text-neutral-900">{parseFloat(appt.price).toFixed(0)} €</span>
          )}
        </div>
        {/* La réalisation que le client a montrée en réservant, prise dans
            ses favoris. C'est le briefing le plus fiable qu'on puisse
            recevoir : pas une description, une photo. Elle passe AVANT le
            message : on regarde d'abord, on lit ensuite.

            L'auteur est crédité — la photo peut venir de n'importe où sur
            CHAIR, et la faire passer pour le travail du coiffeur qui la
            reçoit serait malhonnête. */}
        {referenceImage && (
          <div className="flex items-start gap-2.5 border-t border-neutral-200 pt-2 mt-2">
            {/* Miniature distante non déclarée dans next.config. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={referenceImage}
              alt=""
              className="w-14 h-[72px] rounded-lg object-cover border border-neutral-200 shrink-0"
            />
            <p className="text-[11px] text-neutral-600 leading-snug">
              <span className="font-semibold text-neutral-900 block">Résultat souhaité</span>
              {referenceAuthor
                ? `Réalisation de ${referenceAuthor}, mise en favori par le client.`
                : 'Réalisation mise en favori par le client.'}
            </p>
          </div>
        )}
        {appt.message && (
          <p className="text-xs text-neutral-500 italic border-t border-neutral-200 pt-1.5 mt-1.5">
            &quot;{appt.message}&quot;
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {isPending && (
          <>
            <button
              onClick={() => onStatusChange(appt.id, 'confirmed')}
              className="relative before:absolute before:-inset-y-[6px] before:inset-x-0 before:content-[''] flex items-center gap-1.5 text-xs font-semibold text-white bg-neutral-900 px-3 py-2 rounded-xl hover:bg-neutral-700 transition-colors"
            >
              <CheckCircle2 size={13} />
              Confirmer
            </button>
            <button
              onClick={() => onStatusChange(appt.id, 'declined')}
              className="relative before:absolute before:-inset-y-[6px] before:inset-x-0 before:content-[''] flex items-center gap-1.5 text-xs font-semibold text-neutral-600 bg-neutral-100 px-3 py-2 rounded-xl hover:bg-neutral-200 transition-colors"
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
              className="relative before:absolute before:-inset-y-[6px] before:inset-x-0 before:content-[''] flex items-center gap-1.5 text-xs font-semibold text-white bg-neutral-900 px-3 py-2 rounded-xl hover:bg-neutral-700 transition-colors"
            >
              <CheckCircle2 size={13} />
              Marquer terminé
            </button>
            {/* Bouton no-show — visible uniquement si la date du RDV est passée */}
            {(() => {
              const d = appt.appointment_date || appt.desired_date;
              const isPast = d ? new Date(d + 'T23:59:59') < new Date() : false;
              return isPast ? (
                <button
                  onClick={() => onStatusChange(appt.id, 'no_show')}
                  className="relative before:absolute before:-inset-y-[6px] before:inset-x-0 before:content-[''] flex items-center gap-1.5 text-xs font-semibold text-orange-700 bg-orange-50 px-3 py-2 rounded-xl hover:bg-orange-100 transition-colors"
                >
                  <AlertCircle size={13} />
                  Client absent
                </button>
              ) : null;
            })()}
            <button
              onClick={() => onStatusChange(appt.id, 'cancelled')}
              className="relative before:absolute before:-inset-y-[6px] before:inset-x-0 before:content-[''] flex items-center gap-1.5 text-xs font-semibold text-neutral-500 bg-neutral-100 px-3 py-2 rounded-xl hover:bg-neutral-200 transition-colors"
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
  const router = useRouter();
  const [appts, setAppts]   = useState<ApiAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState<'active' | 'past'>('active');

  const loadAppts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apptApi.list();
      setAppts(Array.isArray(data) ? data as ApiAppointment[] : []);
    } catch { setAppts([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.hairdresser_profile?.is_independent === false) {
      router.replace('/pro');
      return;
    }
    loadAppts();
  }, [user, loadAppts, router]);

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

  const upcomingConfirmed = activeAppts
    .filter((a) => a.status === 'confirmed' && (a.appointment_date || a.desired_date))
    .sort((a, b) => {
      const da = new Date((a.appointment_date || a.desired_date)!).getTime();
      const db = new Date((b.appointment_date || b.desired_date)!).getTime();
      return da - db;
    })
    .slice(0, 3);

  // Cas coiffeur non-indépendant
  const isIndependent = user?.hairdresser_profile?.is_independent !== false;

  return (
    <div className="min-h-screen bg-white pb-28 md:pb-8">
      <div className="max-w-2xl mx-auto">
        <div className="px-4 pt-4">
          <DashboardPageHeader title="Rendez-vous" />
        </div>
        <div className="hidden md:block px-4 pt-6 pb-4">
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Rendez-vous</h1>
        </div>

        {!isIndependent ? (
          /* Coiffeur en salon */
          <div className="px-4 py-16 text-center">
            <AlertCircle size={40} className="text-neutral-300 mx-auto mb-4" strokeWidth={1.5} />
            <h2 className="text-base font-semibold text-neutral-900 mb-2">Réservation via votre salon</h2>
            <p className="text-sm text-neutral-400 max-w-xs mx-auto leading-relaxed">
              Les rendez-vous sont gérés par votre salon. Passez en mode indépendant depuis votre profil pour gérer vos propres réservations.
            </p>
          </div>
        ) : (
          <div className="px-4 pt-4">
            {/* ── 3 prochains RDV confirmés — uniquement sur l'onglet Historique,
                pour ne pas répéter ce qui est déjà affiché juste en dessous
                dans l'onglet "En cours" ── */}
            {!loading && tab === 'past' && upcomingConfirmed.length > 0 && (
              <div className="mb-5">
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-3">
                  Prochains rendez-vous
                </p>
                <div className="space-y-2">
                  {upcomingConfirmed.map((appt) => {
                    const displayDate = appt.appointment_date || appt.desired_date;
                    const dateFormatted = displayDate
                      ? new Date(displayDate + 'T00:00:00').toLocaleDateString('fr-FR', {
                          weekday: 'short', day: 'numeric', month: 'short',
                        })
                      : '';
                    const timeFormatted = appt.appointment_time?.slice(0, 5) ?? appt.desired_slot ?? '';
                    return (
                      <div key={appt.id} className="flex items-center gap-3 bg-neutral-900 text-white rounded-[20px] shadow-[0_10px_24px_-10px_rgba(10,10,10,0.45)] px-4 py-3">
                        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                          <Calendar size={16} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold truncate">{appt.client_name}</p>
                          <p className="text-[11px] text-white/50 truncate">{appt.service}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[12px] font-semibold capitalize">{dateFormatted}</p>
                          {timeFormatted && <p className="text-[11px] text-white/50">{timeFormatted}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex bg-neutral-100 rounded-2xl p-1 mb-5">
              {(['active', 'past'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`relative before:absolute before:-inset-y-[4px] before:inset-x-0 before:content-[''] flex-1 text-sm font-medium py-2 rounded-xl transition-all ${
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
    </div>
  );
}
