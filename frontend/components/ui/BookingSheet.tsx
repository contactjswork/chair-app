'use client';

import { useEffect, useState, useRef } from 'react';
import { services as servicesApi, availability as availabilityApi, appointments as appointmentsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useScrollLock } from '@/hooks/useScrollLock';
import type { ApiServiceCategory, ApiService } from '@/lib/types';
import { ChevronLeft, ChevronRight, Check, Clock, CalendarX2, Scissors, X, LogIn, UserPlus } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from './Button';
import EmptyState from './EmptyState';
import { Skeleton } from './Skeleton';

type Step = 'category' | 'service' | 'date' | 'slot' | 'info' | 'confirm' | 'success';

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const DAY_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const STEP_TITLES: Record<Exclude<Step, 'success'>, string> = {
  category: 'Catégorie',
  service: 'Prestation',
  date: 'Date',
  slot: 'Créneau',
  info: 'Coordonnées',
  confirm: 'Confirmation',
};

// Le parcours réel dépend de ce que le client a déjà choisi avant d'ouvrir la
// feuille. L'ancienne version affichait une barre de progression figée sur six
// étapes : en arrivant depuis le bouton "Réserver" d'une prestation, on ouvrait
// donc sur "3 / 6" avec la barre déjà à moitié pleine, et la flèche retour
// remontait vers deux écrans (catégorie, prestation) que l'utilisateur n'avait
// jamais vus. Le décompte décrit maintenant le parcours qui reste à faire.
type FlowStart = 'category' | 'service' | 'date';
const FLOWS: Record<FlowStart, Step[]> = {
  category: ['category', 'service', 'date', 'slot', 'info', 'confirm'],
  service:  ['service', 'date', 'slot', 'info', 'confirm'],
  date:     ['date', 'slot', 'info', 'confirm'],
};

const INPUT_CLS = 'w-full border border-neutral-200 rounded-xl px-4 h-12 text-[14px] text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:border-neutral-900 transition-colors';

interface Props {
  slug: string;
  open: boolean;
  onClose: () => void;
  /** Présélectionne une prestation (bouton "Réserver" depuis une ligne de service) — saute directement à l'étape date. */
  initialCategoryId?: number;
  initialServiceId?: number;
}

export default function BookingSheet({ slug, open, onClose, initialCategoryId, initialServiceId }: Props) {
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('category');
  const [flowStart, setFlowStart] = useState<FlowStart>('category');
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
  const [datesLoadedKey, setDatesLoadedKey] = useState('');

  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useScrollLock(open);

  // Drag to dismiss
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Reset à chaque ouverture
    setStep('category');
    setFlowStart('category');
    setSelectedCategory(null);
    setSelectedService(null);
    setSelectedDate('');
    setSelectedSlot('');
    setError('');
    setDragY(0);

    setLoading(true);
    servicesApi.publicList(slug)
      .then((data) => {
        const cats = (data as ApiServiceCategory[]).filter((c) => (c.services ?? []).length > 0);
        setCategories(cats);

        if (initialServiceId != null) {
          const cat = cats.find((c) => c.id === initialCategoryId) ?? cats.find((c) => (c.services ?? []).some((s) => s.id === initialServiceId));
          const svc = cat?.services?.find((s) => s.id === initialServiceId);
          if (cat && svc) {
            setSelectedCategory(cat);
            setSelectedService(svc);
            setFlowStart('date');
            setStep('date');
          }
        } else if (cats.length === 1) {
          // Une seule catégorie : la faire choisir est un écran pour rien.
          setSelectedCategory(cats[0]);
          setFlowStart('service');
          setStep('service');
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Impossible de charger les services de ce coiffeur.');
        setLoading(false);
      });
  }, [open, slug, initialCategoryId, initialServiceId]);

  useEffect(() => {
    if (user) {
      setClientName(user.name ?? '');
      setClientEmail(user.email ?? '');
    }
  }, [user]);

  // `loadingDates` est dérivé plutôt que posé en début d'effet : on retient
  // quel (prestation, mois) a effectivement répondu, et tant que la clé
  // courante ne correspond pas, on est en chargement. Même résultat à l'écran
  // sans setState synchrone dans le corps de l'effet.
  const datesKey = selectedService ? `${selectedService.id}-${viewYear}-${viewMonth}` : '';
  const loadingDates = !!selectedService && datesKey !== datesLoadedKey;

  useEffect(() => {
    if (!selectedService) return;
    const month = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    const key = `${selectedService.id}-${viewYear}-${viewMonth}`;
    availabilityApi.availableDates(slug, selectedService.id, month)
      .then((data) => { setAvailableDates((data as { dates: string[] }).dates); setDatesLoadedKey(key); })
      .catch(() => { setAvailableDates([]); setDatesLoadedKey(key); });
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

  // Chaque étape repart du haut : sur une feuille de 90dvh, enchaîner date →
  // créneau en restant à mi-hauteur donnait l'impression d'un écran tronqué.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [step]);

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

  const flowSteps = FLOWS[flowStart];
  const stepIndex = flowSteps.indexOf(step);

  function rememberRedirect() {
    if (typeof window !== 'undefined') sessionStorage.setItem('chair_redirect', window.location.pathname);
  }

  // ── Drag to dismiss (poignée uniquement, pour ne pas gêner le scroll interne) ──
  function onHandlePointerDown(e: React.PointerEvent) {
    startY.current = e.clientY;
    setDragging(true);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
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
    const prev = flowSteps[stepIndex - 1];
    if (prev) setStep(prev);
  }

  if (!open) return null;

  const priceOf = (svc: ApiService) => parseFloat(svc.price ?? '0').toFixed(0);

  return (
    <>
      <div
        className="fixed inset-0 z-[200] bg-black/50"
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-[201] bg-white rounded-t-3xl flex flex-col overflow-hidden"
        style={{
          height: '90dvh',
          transform: `translateY(${dragY}px)`,
          transition: dragging ? 'none' : 'transform 250ms ease-out',
        }}
      >
        {/* Poignée de fermeture (drag) */}
        <div
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          className="flex-shrink-0 pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="w-9 h-1 rounded-full bg-neutral-200 mx-auto" />
        </div>

        {/* Header */}
        <div className="flex-shrink-0">
          <div className="flex items-center gap-1 px-2 pb-2.5">
            {stepIndex > 0 && step !== 'success' ? (
              <button onClick={handleBack} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors flex-shrink-0" aria-label="Étape précédente">
                <ChevronLeft size={20} className="text-neutral-700" />
              </button>
            ) : (
              <div className="w-10 flex-shrink-0" />
            )}

            <div className="flex-1 min-w-0 text-center">
              {step !== 'success' && (
                <>
                  <p className="text-[15px] font-semibold text-neutral-900 leading-tight">
                    {step === 'info' && !user ? 'Connexion requise' : STEP_TITLES[step]}
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Étape {stepIndex + 1} sur {flowSteps.length}
                  </p>
                </>
              )}
            </div>

            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors flex-shrink-0" aria-label="Fermer">
              <X size={18} className="text-neutral-500" />
            </button>
          </div>

          {step !== 'success' && (
            <div className="h-[3px] bg-neutral-100">
              <div
                className="h-full bg-neutral-900 rounded-r-full transition-all duration-300"
                style={{ width: `${((stepIndex + 1) / flowSteps.length) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Contenu scrollable */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
          {loading ? (
            <div className="px-4 py-5 space-y-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[76px] w-full" />)}
            </div>
          ) : step === 'success' ? (
            <div className="flex flex-col items-center px-6 pt-14 text-center">
              <div className="w-14 h-14 bg-neutral-900 rounded-full flex items-center justify-center mb-5">
                <Check size={26} className="text-white" strokeWidth={2.5} />
              </div>
              <h2 className="text-[20px] font-bold text-neutral-900 mb-1.5">Rendez-vous confirmé</h2>
              <p className="text-[13px] text-neutral-400 mb-7">
                Une confirmation vient d&apos;être envoyée à {clientEmail}.
              </p>

              <div className="w-full border-y border-neutral-100 divide-y divide-neutral-100 mb-8 text-left">
                {selectedService && (
                  <div className="flex items-center justify-between py-3.5">
                    <span className="text-[13px] text-neutral-400">Prestation</span>
                    <span className="text-[14px] font-semibold text-neutral-900">{selectedService.name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-3.5">
                  <span className="text-[13px] text-neutral-400">Date</span>
                  <span className="text-[14px] font-semibold text-neutral-900 capitalize">{formatDate(selectedDate)}</span>
                </div>
                <div className="flex items-center justify-between py-3.5">
                  <span className="text-[13px] text-neutral-400">Heure</span>
                  <span className="text-[14px] font-semibold text-neutral-900 tabular-nums">{selectedSlot}</span>
                </div>
              </div>

              <PrimaryButton fullWidth onClick={onClose}>Terminé</PrimaryButton>
            </div>
          ) : (
            <div className="px-4 py-5">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-100 text-red-600 text-[13px] px-4 py-3 rounded-xl">{error}</div>
              )}

              {/* Rappel de ce qui est déjà choisi */}
              {selectedService && step !== 'category' && step !== 'service' && (
                <div className="mb-5 border-y border-neutral-100 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-neutral-900 truncate">{selectedService.name}</p>
                    <div className="flex items-center gap-2.5 mt-0.5">
                      <span className="text-[12px] text-neutral-400 flex items-center gap-1">
                        <Clock size={11} />{selectedService.duration_minutes} min
                      </span>
                      <span className="text-[12px] font-semibold text-neutral-900">{priceOf(selectedService)} €</span>
                    </div>
                  </div>
                  {/* La date n'entre dans le rappel qu'une fois l'heure choisie :
                      à l'étape "Créneau" elle est déjà le titre de l'écran, et
                      l'afficher aux deux endroits donnait la même date deux fois
                      à 40px d'écart. */}
                  {selectedDate && selectedSlot && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-[12px] text-neutral-400 capitalize">{formatDate(selectedDate)}</p>
                      <p className="text-[14px] font-semibold text-neutral-900 tabular-nums">{selectedSlot}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── CATEGORY ── */}
              {step === 'category' && (
                categories.length === 0 ? (
                  <EmptyState
                    compact
                    icon={Scissors}
                    title="Aucune prestation"
                    subtitle="Ce coiffeur n'a pas encore configuré ses prestations."
                  />
                ) : (
                  <div className="border-t border-neutral-100">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => { setSelectedCategory(cat); setSelectedService(null); setStep('service'); }}
                        className="w-full flex items-center justify-between gap-3 py-4 border-b border-neutral-100 text-left transition-colors active:bg-neutral-50"
                      >
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold text-neutral-900">{cat.name}</p>
                          {cat.description && <p className="text-[12px] text-neutral-400 mt-0.5 line-clamp-1">{cat.description}</p>}
                          <p className="text-[12px] text-neutral-400 mt-0.5">
                            {(cat.services ?? []).length} prestation{(cat.services ?? []).length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <ChevronRight size={16} className="text-neutral-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                )
              )}

              {/* ── SERVICE ── */}
              {step === 'service' && selectedCategory && (
                <div>
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-neutral-400 mb-2.5">
                    {selectedCategory.name}
                  </p>
                  <div className="border-t border-neutral-100">
                    {(selectedCategory.services ?? []).map((svc) => (
                      <button
                        key={svc.id}
                        onClick={() => { setSelectedService(svc); setSelectedDate(''); setSelectedSlot(''); setStep('date'); }}
                        className="w-full flex items-center gap-3 py-4 border-b border-neutral-100 text-left transition-colors active:bg-neutral-50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-neutral-900">{svc.name}</p>
                          {svc.description && (
                            <p className="text-[12px] text-neutral-400 mt-0.5 line-clamp-1">{svc.description}</p>
                          )}
                          <span className="inline-flex items-center gap-1 text-[12px] text-neutral-400 mt-1.5">
                            <Clock size={11} />{svc.duration_minutes} min
                          </span>
                        </div>
                        <span className="text-[16px] font-bold text-neutral-900 tabular-nums shrink-0">{priceOf(svc)} €</span>
                        <ChevronRight size={16} className="text-neutral-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── DATE ── */}
              {step === 'date' && selectedService && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => {
                        if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
                        else setViewMonth((m) => m - 1);
                      }}
                      disabled={viewYear === today.getFullYear() && viewMonth === today.getMonth()}
                      aria-label="Mois précédent"
                      className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-neutral-100 disabled:opacity-25 transition-colors"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="text-[15px] font-semibold text-neutral-900">{MONTH_NAMES[viewMonth]} {viewYear}</span>
                    <button
                      onClick={() => {
                        if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
                        else setViewMonth((m) => m + 1);
                      }}
                      aria-label="Mois suivant"
                      className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-1.5">
                    {DAY_SHORT.map((d) => (
                      <div key={d} className="text-[11px] text-center text-neutral-400 font-medium py-1">{d}</div>
                    ))}
                  </div>

                  {/* Le calendrier se remplissait sans prévenir : les jours
                      disponibles apparaissaient d'un coup après la requête,
                      sur une grille déjà affichée en tout-gris impossible à
                      distinguer d'un mois réellement complet. */}
                  {loadingDates ? (
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: 35 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 rounded-xl" />
                      ))}
                    </div>
                  ) : (
                    <>
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
                              className={`h-10 text-[14px] rounded-xl font-medium tabular-nums transition-colors ${
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

                      {availableDates.length === 0 ? (
                        <EmptyState
                          compact
                          icon={CalendarX2}
                          title="Aucune disponibilité"
                          subtitle="Ce coiffeur n'a pas ouvert de créneau ce mois-ci. Essayez le mois suivant."
                        />
                      ) : (
                        <div className="flex items-center justify-center gap-2 mt-5">
                          <span className="w-3 h-3 rounded-md bg-neutral-100" />
                          <span className="text-[12px] text-neutral-400">Jours disponibles</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── SLOT ── */}
              {step === 'slot' && selectedService && selectedDate && (
                <div>
                  <p className="text-[15px] font-semibold text-neutral-900 mb-1 capitalize">{formatDate(selectedDate)}</p>
                  <p className="text-[12px] text-neutral-400 mb-4">Créneaux de {selectedService.duration_minutes} min</p>

                  {/* Avant : la ligne de texte "Chargement des créneaux...",
                      puis un remplissage brutal de la grille. */}
                  {loadingSlots ? (
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 rounded-xl" />
                      ))}
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <EmptyState
                      compact
                      icon={CalendarX2}
                      title="Complet ce jour-là"
                      subtitle="Tous les créneaux de cette journée sont déjà pris."
                      action={
                        <SecondaryButton size="sm" onClick={() => setStep('date')}>
                          Choisir une autre date
                        </SecondaryButton>
                      }
                    />
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => { setSelectedSlot(slot); setStep('info'); }}
                          className="h-12 rounded-xl text-[14px] font-semibold tabular-nums border border-neutral-200 text-neutral-900 transition-colors hover:border-neutral-900 active:bg-neutral-900 active:text-white"
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── INFO (non connecté) ── */}
              {step === 'info' && !user && (
                <div className="flex flex-col items-center text-center py-4">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center mb-4">
                    <LogIn size={22} className="text-neutral-300" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-[17px] font-bold text-neutral-900 mb-1.5">Dernière étape</h3>
                  <p className="text-[13px] text-neutral-400 leading-relaxed mb-7 max-w-xs">
                    Connecte-toi ou crée un compte gratuit pour confirmer ton rendez-vous.
                  </p>
                  <div className="w-full space-y-2">
                    <PrimaryButton fullWidth href="/connexion" onClick={rememberRedirect} icon={<LogIn size={15} />}>
                      Se connecter
                    </PrimaryButton>
                    <SecondaryButton fullWidth href="/inscription" onClick={rememberRedirect} icon={<UserPlus size={15} />}>
                      Créer un compte
                    </SecondaryButton>
                  </div>
                </div>
              )}

              {/* ── INFO (connecté) ── */}
              {step === 'info' && user && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="booking-name" className="text-[12px] font-medium text-neutral-500 mb-1.5 block">Nom complet *</label>
                    <input
                      id="booking-name"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Votre nom"
                      className={INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label htmlFor="booking-email" className="text-[12px] font-medium text-neutral-500 mb-1.5 block">Email *</label>
                    <input
                      id="booking-email"
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="votre@email.com"
                      className={INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label htmlFor="booking-phone" className="text-[12px] font-medium text-neutral-500 mb-1.5 block">Téléphone (optionnel)</label>
                    <input
                      id="booking-phone"
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="06 XX XX XX XX"
                      className={INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label htmlFor="booking-message" className="text-[12px] font-medium text-neutral-500 mb-1.5 block">Message (optionnel)</label>
                    <textarea
                      id="booking-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Précisions sur votre demande..."
                      rows={3}
                      className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-[14px] text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:border-neutral-900 resize-none transition-colors"
                    />
                  </div>
                  <PrimaryButton
                    fullWidth
                    className="mt-2"
                    onClick={() => {
                      if (!clientName.trim() || !clientEmail.trim()) {
                        setError('Nom et email sont obligatoires.');
                        return;
                      }
                      setError('');
                      setStep('confirm');
                    }}
                  >
                    Continuer
                  </PrimaryButton>
                </div>
              )}

              {/* ── CONFIRM ── */}
              {step === 'confirm' && selectedService && (
                <div>
                  <div className="border-y border-neutral-100 divide-y divide-neutral-100">
                    <div className="py-3.5">
                      <p className="text-[12px] text-neutral-400 mb-1">Prestation</p>
                      <p className="text-[14px] font-semibold text-neutral-900">{selectedService.name}</p>
                      <p className="text-[12px] text-neutral-400 mt-0.5">{selectedService.duration_minutes} min</p>
                    </div>
                    <div className="py-3.5">
                      <p className="text-[12px] text-neutral-400 mb-1">Date et heure</p>
                      <p className="text-[14px] font-semibold text-neutral-900 capitalize">{formatDate(selectedDate)}</p>
                      <p className="text-[14px] text-neutral-600 tabular-nums mt-0.5">{selectedSlot}</p>
                    </div>
                    <div className="py-3.5">
                      <p className="text-[12px] text-neutral-400 mb-1">Client</p>
                      <p className="text-[14px] text-neutral-900">{clientName}</p>
                      <p className="text-[12px] text-neutral-400 mt-0.5">{clientEmail}</p>
                      {clientPhone && <p className="text-[12px] text-neutral-400">{clientPhone}</p>}
                    </div>
                    <div className="py-4 flex items-center justify-between">
                      <span className="text-[14px] font-semibold text-neutral-900">Montant total</span>
                      <span className="text-[22px] font-bold text-neutral-900 tabular-nums">{priceOf(selectedService)} €</span>
                    </div>
                  </div>

                  <p className="text-[12px] text-neutral-400 mt-3 mb-6">
                    Paiement sur place, directement au salon. Aucune carte n&apos;est demandée maintenant.
                  </p>

                  <PrimaryButton fullWidth onClick={handleSubmit} loading={submitting}>
                    {submitting ? 'Confirmation…' : 'Confirmer le rendez-vous'}
                  </PrimaryButton>
                  <button onClick={() => setStep('info')} className="w-full text-[13px] text-neutral-400 hover:text-neutral-700 transition-colors py-3.5">
                    Modifier mes informations
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
