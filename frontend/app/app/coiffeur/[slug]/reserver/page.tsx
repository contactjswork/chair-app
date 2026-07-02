'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { services as servicesApi, availability as availabilityApi, appointments as appointmentsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ApiServiceCategory, ApiService } from '@/lib/types';
import { ChevronLeft, ChevronRight, Check, Clock, MapPin } from 'lucide-react';

type Step = 'category' | 'service' | 'date' | 'slot' | 'info' | 'confirm' | 'success';

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const DAY_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default function ReserverPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>('category');
  const [categories, setCategories] = useState<ApiServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selections
  const [selectedCategory, setSelectedCategory] = useState<ApiServiceCategory | null>(null);
  const [selectedService, setSelectedService] = useState<ApiService | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Calendar
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  // Client info
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load categories on mount
  useEffect(() => {
    servicesApi.publicList(slug)
      .then((data) => {
        const cats = data as ApiServiceCategory[];
        setCategories(cats.filter((c) => (c.services ?? []).length > 0));
        setLoading(false);
      })
      .catch(() => {
        setError('Impossible de charger les services de ce coiffeur.');
        setLoading(false);
      });
  }, [slug]);

  // Pre-fill user info
  useEffect(() => {
    if (user) {
      setClientName(user.name ?? '');
      setClientEmail(user.email ?? '');
    }
  }, [user]);

  // Load available dates when service or month changes
  useEffect(() => {
    if (!selectedService) return;
    const month = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    availabilityApi.availableDates(slug, selectedService.id, month)
      .then((data) => {
        const d = data as { dates: string[] };
        setAvailableDates(d.dates);
      })
      .catch(() => setAvailableDates([]));
  }, [selectedService, viewMonth, viewYear, slug]);

  // Load slots when date selected
  useEffect(() => {
    if (!selectedService || !selectedDate) return;
    setLoadingSlots(true);
    setAvailableSlots([]);
    availabilityApi.slots(slug, selectedDate, selectedService.id)
      .then((data) => {
        const d = data as { slots: string[] };
        setAvailableSlots(d.slots);
        setLoadingSlots(false);
      })
      .catch(() => {
        setAvailableSlots([]);
        setLoadingSlots(false);
      });
  }, [selectedService, selectedDate, slug]);

  async function handleSubmit() {
    if (!selectedService || !selectedDate || !selectedSlot) return;
    setSubmitting(true);
    setError('');
    try {
      await appointmentsApi.book({
        hairdresser_id: selectedService.hairdresser_id,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone || undefined,
        service_id: selectedService.id,
        appointment_date: selectedDate,
        appointment_time: selectedSlot,
        message: message || undefined,
      });
      setStep('success');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur lors de la réservation.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function getDaysInMonth(y: number, m: number) {
    return new Date(y, m + 1, 0).getDate();
  }
  function getFirstDay(y: number, m: number) {
    return new Date(y, m, 1).getDay();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  // ── Step: success ─────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
        <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mb-6">
          <Check size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">Rendez-vous confirmé</h1>
        {selectedService && (
          <p className="text-neutral-500 text-sm mb-1">{selectedService.name}</p>
        )}
        <p className="text-neutral-500 text-sm mb-1 capitalize">{formatDate(selectedDate)}</p>
        <p className="text-neutral-900 font-semibold text-sm mb-6">{selectedSlot}</p>
        <p className="text-xs text-neutral-400 mb-8">
          Confirmation envoyée à {clientEmail}
        </p>
        <Link
          href={`/app/coiffeur/${slug}`}
          className="bg-neutral-900 text-white px-6 py-3 rounded-xl text-sm font-medium"
        >
          Retour au profil
        </Link>
      </div>
    );
  }

  const progressSteps: Step[] = ['category', 'service', 'date', 'slot', 'info', 'confirm'];
  const stepIndex = progressSteps.indexOf(step);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-neutral-100 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => {
              if (step === 'category') router.push(`/app/coiffeur/${slug}`);
              else {
                const prev = progressSteps[stepIndex - 1];
                if (prev) setStep(prev);
              }
            }}
            className="p-2 -ml-2"
          >
            <ChevronLeft size={20} className="text-neutral-700" />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-neutral-900">
              {step === 'category' && 'Choisir une catégorie'}
              {step === 'service' && 'Choisir un service'}
              {step === 'date' && 'Choisir une date'}
              {step === 'slot' && 'Choisir un créneau'}
              {step === 'info' && 'Vos coordonnées'}
              {step === 'confirm' && 'Récapitulatif'}
            </p>
            <p className="text-xs text-neutral-400">{stepIndex + 1} / {progressSteps.length}</p>
          </div>
          <div className="w-8" />
        </div>
        {/* Progress bar */}
        <div className="h-0.5 bg-neutral-100">
          <div
            className="h-full bg-neutral-900 transition-all duration-300"
            style={{ width: `${((stepIndex + 1) / progressSteps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Service preview (when service selected and past step 2) */}
      {selectedService && step !== 'category' && step !== 'service' && (
        <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-neutral-900">{selectedService.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-neutral-500 flex items-center gap-1">
                  <Clock size={11} />
                  {selectedService.duration_minutes} min
                </span>
                <span className="text-xs font-semibold text-neutral-900">
                  {parseFloat(selectedService.price ?? '0').toFixed(0)} €
                </span>
              </div>
            </div>
            {selectedDate && (
              <div className="text-right">
                <p className="text-xs text-neutral-500 capitalize">{formatDate(selectedDate)}</p>
                {selectedSlot && <p className="text-sm font-semibold text-neutral-900">{selectedSlot}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="px-4 py-6">
        {error && (
          <div className="mb-4 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
        )}

        {/* ── STEP: CATEGORY ── */}
        {step === 'category' && (
          <div className="space-y-3">
            {categories.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-neutral-500 text-sm">Ce coiffeur n'a pas encore configure ses services.</p>
                <Link href={`/app/coiffeur/${slug}`} className="text-sm text-neutral-900 underline mt-2 block">
                  Retour au profil
                </Link>
              </div>
            ) : (
              categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategory(cat); setSelectedService(null); setStep('service'); }}
                  className="w-full flex items-center justify-between px-4 py-4 border border-neutral-200 rounded-xl hover:border-neutral-400 hover:bg-neutral-50 transition-colors text-left"
                >
                  <div>
                    <p className="font-semibold text-neutral-900 text-sm">{cat.name}</p>
                    {cat.description && <p className="text-xs text-neutral-400 mt-0.5">{cat.description}</p>}
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-xs text-neutral-400">
                        {(cat.services ?? []).length} service{(cat.services ?? []).length !== 1 ? 's' : ''}
                      </p>
                      {cat.visits_count > 0 && (
                        <p className="text-xs font-medium text-neutral-500">
                          {cat.visits_count} reservation{cat.visits_count > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-neutral-400 shrink-0" />
                </button>
              ))
            )}
          </div>
        )}

        {/* ── STEP: SERVICE ── */}
        {step === 'service' && selectedCategory && (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-4">
              {selectedCategory.name}
            </p>
            {(selectedCategory.services ?? []).map((svc) => (
              <button
                key={svc.id}
                onClick={() => { setSelectedService(svc); setSelectedDate(''); setSelectedSlot(''); setStep('date'); }}
                className="w-full flex items-start justify-between px-4 py-4 border border-neutral-200 rounded-xl hover:border-neutral-400 hover:bg-neutral-50 transition-colors text-left"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <p className="font-semibold text-neutral-900 text-sm">{svc.name}</p>
                  {svc.description && (
                    <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2">{svc.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-neutral-500 flex items-center gap-1">
                      <Clock size={11} />
                      {svc.duration_minutes} min
                    </span>
                    {svc.visits_count > 0 && (
                      <span className="text-xs font-medium text-neutral-500">
                        {svc.visits_count} reservation{svc.visits_count > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-neutral-900 text-sm">{parseFloat(svc.price ?? '0').toFixed(0)} €</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── STEP: DATE ── */}
        {step === 'date' && selectedService && (
          <div>
            <p className="text-sm text-neutral-500 mb-4">
              Les jours disponibles sont mis en evidence.
            </p>

            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
                  else setViewMonth((m) => m - 1);
                }}
                disabled={viewYear === today.getFullYear() && viewMonth === today.getMonth()}
                className="p-2 hover:bg-neutral-100 rounded-lg disabled:opacity-30"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="font-semibold text-neutral-900">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <button
                onClick={() => {
                  if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
                  else setViewMonth((m) => m + 1);
                }}
                className="p-2 hover:bg-neutral-100 rounded-lg"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAY_SHORT.map((d) => (
                <div key={d} className="text-[11px] text-center text-neutral-400 font-medium py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: getFirstDay(viewYear, viewMonth) }).map((_, i) => (
                <div key={`e-${i}`} />
              ))}
              {Array.from({ length: getDaysInMonth(viewYear, viewMonth) }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isAvailable = availableDates.includes(dateStr);
                const isSelected = dateStr === selectedDate;
                const todayStr = today.toISOString().split('T')[0];
                const isPast = dateStr < todayStr;

                return (
                  <button
                    key={dayNum}
                    onClick={() => {
                      if (isAvailable && !isPast) {
                        setSelectedDate(dateStr);
                        setSelectedSlot('');
                        setStep('slot');
                      }
                    }}
                    disabled={!isAvailable || isPast}
                    className={`text-sm py-2.5 rounded-xl font-medium transition-colors ${
                      isSelected
                        ? 'bg-neutral-900 text-white'
                        : isAvailable && !isPast
                        ? 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200'
                        : 'text-neutral-300 cursor-default'
                    }`}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            {availableDates.length === 0 && (
              <p className="text-center text-sm text-neutral-400 mt-6">
                Aucune disponibilite ce mois-ci.
              </p>
            )}
          </div>
        )}

        {/* ── STEP: SLOT ── */}
        {step === 'slot' && selectedService && selectedDate && (
          <div>
            <p className="text-sm font-semibold text-neutral-900 mb-1 capitalize">{formatDate(selectedDate)}</p>
            <p className="text-xs text-neutral-400 mb-4">{selectedService.duration_minutes} min par créneau</p>

            {loadingSlots ? (
              <div className="text-center py-8 text-neutral-400 text-sm">Chargement des créneaux...</div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-neutral-500 text-sm mb-3">Aucun créneau disponible ce jour.</p>
                <button
                  onClick={() => setStep('date')}
                  className="text-sm border border-neutral-200 px-4 py-2 rounded-xl"
                >
                  Choisir une autre date
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => { setSelectedSlot(slot); setStep('info'); }}
                    className="py-3 rounded-xl text-sm font-medium border border-neutral-200 text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50 transition-colors"
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STEP: INFO ── */}
        {step === 'info' && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-500">
              Renseignez vos coordonnées pour confirmer le rendez-vous.
            </p>

            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Nom complet *</label>
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Votre nom"
                className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neutral-400"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Email *</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neutral-400"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Téléphone (optionnel)</label>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="06 XX XX XX XX"
                className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neutral-400"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Message (optionnel)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Précisions sur votre demande..."
                rows={3}
                className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neutral-400 resize-none"
              />
            </div>

            <button
              onClick={() => {
                if (!clientName.trim() || !clientEmail.trim()) {
                  setError('Nom et email sont obligatoires.');
                  return;
                }
                setError('');
                setStep('confirm');
              }}
              className="w-full bg-neutral-900 text-white py-3.5 rounded-xl font-medium text-sm"
            >
              Continuer
            </button>
          </div>
        )}

        {/* ── STEP: CONFIRM ── */}
        {step === 'confirm' && selectedService && (
          <div className="space-y-4">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">
              Recapitulatif
            </p>

            <div className="border border-neutral-200 rounded-xl divide-y divide-neutral-100">
              <div className="px-4 py-3">
                <p className="text-xs text-neutral-400 mb-0.5">Service</p>
                <p className="text-sm font-semibold text-neutral-900">{selectedService.name}</p>
                {selectedService.description && (
                  <p className="text-xs text-neutral-400 mt-0.5">{selectedService.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-neutral-500">{selectedService.duration_minutes} min</span>
                  <span className="text-xs font-semibold text-neutral-900">
                    {parseFloat(selectedService.price ?? '0').toFixed(0)} €
                  </span>
                </div>
              </div>

              <div className="px-4 py-3">
                <p className="text-xs text-neutral-400 mb-0.5">Date et heure</p>
                <p className="text-sm font-semibold text-neutral-900 capitalize">{formatDate(selectedDate)}</p>
                <p className="text-sm text-neutral-700">{selectedSlot}</p>
              </div>

              <div className="px-4 py-3">
                <p className="text-xs text-neutral-400 mb-0.5">Client</p>
                <p className="text-sm text-neutral-900">{clientName}</p>
                <p className="text-xs text-neutral-500">{clientEmail}</p>
                {clientPhone && <p className="text-xs text-neutral-500">{clientPhone}</p>}
              </div>

              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-900">Montant total</span>
                <span className="text-lg font-bold text-neutral-900">
                  {parseFloat(selectedService.price ?? '0').toFixed(0)} €
                </span>
              </div>

              <div className="px-4 py-3 flex items-center gap-2">
                <MapPin size={13} className="text-neutral-400" />
                <span className="text-xs text-neutral-500">Paiement sur place</span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-neutral-900 text-white py-3.5 rounded-xl font-medium text-sm disabled:opacity-50"
            >
              {submitting ? 'Confirmation...' : 'Confirmer le rendez-vous'}
            </button>

            <button
              onClick={() => setStep('info')}
              className="w-full text-sm text-neutral-500 py-2"
            >
              Modifier
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
