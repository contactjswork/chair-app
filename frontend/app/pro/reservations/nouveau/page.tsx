'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { appointments as apptApi, services as servicesApi } from '@/lib/api';
import type { ApiService } from '@/lib/types';

export default function NouveauRendezVousPage() {
  const { user, isLoading: authLoading } = useRequireAuth(['hairdresser']);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [services, setServices] = useState<ApiService[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  const [clientName, setClientName]   = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [serviceId, setServiceId]     = useState<number | ''>('');
  const [date, setDate]               = useState(searchParams.get('date') ?? '');
  const [time, setTime]               = useState(searchParams.get('time') ?? '');
  const [message, setMessage]         = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    if (!user) return;
    servicesApi.items.list()
      .then((data) => setServices(Array.isArray(data) ? (data as ApiService[]).filter((s) => s.is_active) : []))
      .catch(() => setServices([]))
      .finally(() => setLoadingServices(false));
  }, [user]);

  const canSubmit = clientName.trim().length > 0 && clientEmail.trim().length > 0 && serviceId !== '' && !!date && !!time;

  async function handleSubmit() {
    if (!user?.hairdresser_profile || !canSubmit) return;
    setSaving(true);
    setError('');
    try {
      await apptApi.book({
        hairdresser_id: user.hairdresser_profile.id,
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        client_phone: clientPhone.trim() || undefined,
        service_id: Number(serviceId),
        appointment_date: date,
        appointment_time: time,
        message: message.trim() || undefined,
      });
      router.push('/pro/agenda');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de créer le rendez-vous.');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="max-w-lg mx-auto px-4 pt-4">
        <DashboardPageHeader title="Nouveau rendez-vous" backHref="/pro/agenda" />

        <div className="mt-2 space-y-4">
          {/* Client */}
          <section className="bg-neutral-50 rounded-2xl p-4 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-400">Client</p>
            <div>
              <label className="text-xs font-medium text-neutral-600 block mb-1">Nom complet</label>
              <input
                type="text" value={clientName} onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex : Camille Dupont"
                className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-600 block mb-1">Email</label>
              <input
                type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@email.fr"
                className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-600 block mb-1">Téléphone (optionnel)</label>
              <input
                type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)}
                placeholder="06 12 34 56 78"
                className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 transition-colors"
              />
            </div>
          </section>

          {/* Prestation */}
          <section className="bg-neutral-50 rounded-2xl p-4 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-400">Prestation</p>
            {loadingServices ? (
              <div className="h-12 bg-neutral-100 rounded-xl animate-pulse" />
            ) : services.length === 0 ? (
              <p className="text-xs text-neutral-400 leading-relaxed">
                Aucun service configuré.{' '}
                <a href="/pro/services" className="underline font-semibold text-neutral-600">Ajoutez-en un</a>{' '}
                avant de créer un rendez-vous.
              </p>
            ) : (
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 transition-colors"
              >
                <option value="">Choisir une prestation</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.price ? ` — ${parseFloat(s.price)}€` : ''}{s.duration_minutes ? ` · ${s.duration_minutes} min` : ''}
                  </option>
                ))}
              </select>
            )}
          </section>

          {/* Date / heure */}
          <section className="bg-neutral-50 rounded-2xl p-4 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-400">Créneau</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-neutral-600 block mb-1">Date</label>
                <input
                  type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-600 block mb-1">Heure</label>
                <input
                  type="time" value={time} onChange={(e) => setTime(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 transition-colors"
                />
              </div>
            </div>
          </section>

          {/* Note */}
          <section className="bg-neutral-50 rounded-2xl p-4 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-400">Note (optionnel)</p>
            <textarea
              value={message} onChange={(e) => setMessage(e.target.value)} rows={2}
              placeholder="Allergie, préférence, contexte..."
              className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 transition-colors resize-none"
            />
          </section>

          {error && <p className="text-[12px] text-red-600 px-1">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            className="w-full py-3.5 bg-neutral-900 text-white text-sm font-semibold rounded-2xl disabled:opacity-40 hover:bg-neutral-700 transition-colors"
          >
            {saving ? 'Création...' : 'Créer le rendez-vous'}
          </button>
        </div>
      </div>
    </div>
  );
}
