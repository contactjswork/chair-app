'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { services as servicesApi, availability as availabilityApi, appointments as appointmentsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ApiServiceCategory, ApiService } from '@/lib/types';
import { ChevronLeft, ChevronRight, Check, Clock, MapPin, X, LogIn, UserPlus } from 'lucide-react';

type Step = 'category' | 'service' | 'date' | 'slot' | 'info' | 'confirm' | 'success';

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const DAY_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

interface Props {
  slug: string;
  open: boolean;
  onClose: () => void;
}

export default function BookingSheet({ slug, open, onClose }: Props) {
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('category');
  const [categories, setCategories] = useState<ApiServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedCategory, setSelectedCategory] = useState<ApiServiceCategory | null>(null);
  const [selectedService, setSelectedService] = useState<ApiService | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Drag to dismiss
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    // Reset à chaque ouverture
    setStep('category');
    setSelectedCategory(null);
    setSelectedService(null);
    setSelectedDate('');
    setSelectedSlot('');
    setError('');
    setDragY(0);

    setLoading(true);
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
  }, [open, slug]);

  useEffect(() => {
    if (user) {
      setClientName(user.name ?? '');
      setClientEmail(user.email ?? '');
    }
  }, [user]);

  useEffect(() => {
    if (!selectedService) return;
    const month = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    availabilityApi.availableDates(slug, selectedService.id, month)
      .then((data) => setAvailableDates((data as { dates: string[] }).dates))
      .catch(() => setAvailableDates([]));
  }, [selectedService, viewMonth, viewYear, slug]);

  useEffect(() => {
    if (!selectedService || !selectedDate) return;
    setLoadingSlots(true);
    setAvailableSlots([]);
    availabilityApi.slots(slug, selectedDate, selectedService.id)
      .then((data) => {
        setAvailableSlots((data as { slots: string[] }).slots);
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
      setError(e instanceof Error ? e.message : 'Erreur lors de la réservation.');
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
  function getFirstDay(y: number, m: number) { return new Date(y, m, 1).getDay(); }

  const progressSteps: Step[] = ['category', 'service', 'date', 'slot', 'info', 'confirm'];
  const stepIndex = progressSteps.indexOf(step);

  // ── Drag to dismiss (poignée uniquement, pour ne pas gêner le scroll interne) ──
  function onHandlePointerDown(e: React.PointerEvent) {
    startY.current = e.clientY;
    setDragging(true);
  }
  function onHandlePointerMove(e: React.PointerEvent) {
    if (startY.current == null) return;
    const delta = e.clientY - startY.current;
    if (delta > 0) setDragY(delta);
  }
  function onHandlePointerUp() {
    if (dragY > 110) {
      onClose();
    }
    setDragY(0);
    setDragging(false);
    startY.current = null;
  }

  function handleBack() {
    const prev = progressSteps[stepIndex - 1];
    if (prev) setStep(prev);
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-[201] bg-white rounded-t-3xl shadow-2xl flex flex-col"
        style={{
          height: '90vh',
          transform: `translateY(${dragY}px)`,
          transition: dragging ? 'none' : 'transform 250ms ease-out',
        }}
      >
        {/* Poignée de fermeture (drag) */}
        <div
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          className="flex-shrink-0 pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="w-10 h-1 rounded-full bg-neutral-200 mx-auto" />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 border-b border-neutral-100">
          <div className="flex items-center justify-between px-4 pb-3">
            {stepIndex > 0 && step !== 'success' ? (
              <button onClick={handleBack} className="p-2 -ml-2" aria-label="Précédent">
                <ChevronLeft size={20} className="text-neutral-700" />
              </button>
            ) : (
              <div className="w-9" />
            )}
            {step !== 'success' && (
              <div className="text-center">
                <p className="text-sm font-semibold text-neutral-900">
                  {step === 'category' && 'Choisir une catégorie'}
                  {step === 'service' && 'Choisir une prestation'}
                  {step === 'date' && 'Choisir une date'}
                  {step === 'slot' && 'Choisir un créneau'}
                  {step === 'info' && (user ? 'Vos coordonnées' : 'Connexion requise')}
                  {step === 'confirm' && 'Récapitulatif'}
                </p>
                <p className="text-xs text-neutral-400">{stepIndex + 1} / {progressSteps.length}</p>
              </div>
            )}
            <button onClick={onClose} className="w-9 h-9 -mr-1 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors" aria-label="Fermer">
              <X size={18} className="text-neutral-500" />
            </button>
          </div>
          {step !== 'success' && (
            <div className="h-0.5 bg-neutral-100">
              <div
                className="h-full bg-neutral-900 transition-all duration-300"
                style={{ width: `${((stepIndex + 1) / progressSteps.length) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
            </div>
          ) : step === 'success' ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mb-6">
                <Check size={28} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900 mb-2">Rendez-vous confirmé</h2>
              {selectedService && <p className="text-neutral-500 text-sm mb-1">{selectedService.name}</p>}
              <p className="text-neutral-500 text-sm mb-1 capitalize">{formatDate(selectedDate)}</p>
              <p className="text-neutral-900 font-semibold text-sm mb-6">{selectedSlot}</p>
              <p className="text-xs text-neutral-400 mb-8">Confirmation envoyée à {clientEmail}</p>
              <button
                onClick={onClose}
                className="bg-neutral-900 text-white px-6 py-3 rounded-xl text-sm font-medium"
              >
                Terminé
              </button>
            </div>
          ) : (
            <div className="px-4 py-5">
              {error && (
                <div className="mb-4 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
              )}

              {/* Rappel prestation choisie */}
              {selectedService && step !== 'category' && step !== 'service' && (
                <div className="mb-4 px-4 py-3 bg-neutral-50 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{selectedService.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-neutral-500 flex items-center gap-1">
                        <Clock size={11} />{selectedService.duration_minutes} min
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
              )}

              {/* ── CATEGORY ── */}
              {step === 'category' && (
                <div className="space-y-3">
                  <p className="text-xs text-neutral-400 mb-1">
                    Chaque catégorie regroupe plusieurs prestations — choisissez celle qui vous correspond.
                  </p>
                  {categories.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-neutral-500 text-sm">Ce coiffeur n&apos;a pas encore configuré ses prestations.</p>
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
                          <p className="text-xs text-neutral-400 mt-0.5">
                            {(cat.services ?? []).length} prestation{(cat.services ?? []).length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <ChevronRight size={16} className="text-neutral-400 shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* ── SERVICE ── */}
              {step === 'service' && selectedCategory && (
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-1">
                    {selectedCategory.name}
                  </p>
                  <p className="text-xs text-neutral-400 mb-4">
                    Sélectionnez la prestation exacte que vous souhaitez.
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
                        <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                          <span className="text-xs text-neutral-500 flex items-center gap-1">
                            <Clock size={11} />{svc.duration_minutes} min
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-neutral-900 text-sm">{parseFloat(svc.price ?? '0').toFixed(0)} €</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* ── DATE ── */}
              {step === 'date' && selectedService && (
                <div>
                  <p className="text-sm text-neutral-500 mb-4">Les jours disponibles sont mis en évidence.</p>
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
                    <span className="font-semibold text-neutral-900">{MONTH_NAMES[viewMonth]} {viewYear}</span>
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
                    {Array.from({ length: getFirstDay(viewYear, viewMonth) }).map((_, i) => <div key={`e-${i}`} />)}
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
                    <p className="text-center text-sm text-neutral-400 mt-6">Aucune disponibilité ce mois-ci.</p>
                  )}
                </div>
              )}

              {/* ── SLOT ── */}
              {step === 'slot' && selectedService && selectedDate && (
                <div>
                  <p className="text-sm font-semibold text-neutral-900 mb-1 capitalize">{formatDate(selectedDate)}</p>
                  <p className="text-xs text-neutral-400 mb-4">{selectedService.duration_minutes} min par créneau</p>
                  {loadingSlots ? (
                    <div className="text-center py-8 text-neutral-400 text-sm">Chargement des créneaux...</div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-neutral-500 text-sm mb-3">Aucun créneau disponible ce jour.</p>
                      <button onClick={() => setStep('date')} className="text-sm border border-neutral-200 px-4 py-2 rounded-xl">
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

              {/* ── INFO ── */}
              {step === 'info' && !user && (
                <div className="flex flex-col items-center text-center py-6">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center mb-4">
                    <LogIn size={22} className="text-neutral-400" />
                  </div>
                  <h3 className="text-[17px] font-bold text-neutral-900 mb-2">Dernière étape</h3>
                  <p className="text-[13px] text-neutral-500 leading-relaxed mb-6 max-w-xs">
                    Connecte-toi ou crée un compte gratuit pour confirmer ton rendez-vous.
                  </p>
                  <div className="w-full space-y-2">
                    <Link
                      href="/connexion"
                      onClick={() => { if (typeof window !== 'undefined') sessionStorage.setItem('chair_redirect', window.location.pathname); }}
                      className="flex items-center justify-center gap-2 w-full bg-neutral-900 text-white font-semibold py-3.5 rounded-xl text-sm"
                    >
                      <LogIn size={15} /> Se connecter
                    </Link>
                    <Link
                      href="/inscription"
                      onClick={() => { if (typeof window !== 'undefined') sessionStorage.setItem('chair_redirect', window.location.pathname); }}
                      className="flex items-center justify-center gap-2 w-full border border-neutral-200 text-neutral-700 font-semibold py-3.5 rounded-xl text-sm"
                    >
                      <UserPlus size={15} /> Créer un compte
                    </Link>
                  </div>
                </div>
              )}

              {step === 'info' && user && (
                <div className="space-y-4">
                  <p className="text-sm text-neutral-500">Renseignez vos coordonnées pour confirmer le rendez-vous.</p>
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

              {/* ── CONFIRM ── */}
              {step === 'confirm' && selectedService && (
                <div className="space-y-4">
                  <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">Récapitulatif</p>
                  <div className="border border-neutral-200 rounded-xl divide-y divide-neutral-100">
                    <div className="px-4 py-3">
                      <p className="text-xs text-neutral-400 mb-0.5">Prestation</p>
                      <p className="text-sm font-semibold text-neutral-900">{selectedService.name}</p>
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
                      <span className="text-xs text-neutral-500">Paiement sur place, directement au salon</span>
                    </div>
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full bg-neutral-900 text-white py-3.5 rounded-xl font-medium text-sm disabled:opacity-50"
                  >
                    {submitting ? 'Confirmation...' : 'Confirmer le rendez-vous'}
                  </button>
                  <button onClick={() => setStep('info')} className="w-full text-sm text-neutral-500 py-2">
                    Modifier
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
