'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Armchair, Scissors, DoorClosed, Palette, User as UserIcon,
  MapPin, PartyPopper, ShieldCheck, Star,
} from 'lucide-react';
import OwnerWizardShell from './OwnerWizardShell';
import EquipmentGrid from './chairWizard/EquipmentGrid';
import PhotoDropzone from './chairWizard/PhotoDropzone';
import AvailabilityStep from './chairWizard/AvailabilityStep';
import PricingStep from './chairWizard/PricingStep';
import { chairRentals } from '@/lib/api';
import {
  CHAIR_SPACE_TYPES, CHAIR_EQUIPMENT_LABELS, resolveMediaUrl,
  type ApiChairRental, type ApiSalonFull, type ChairEquipmentKey, type ChairSpaceType,
} from '@/lib/types';

const STEPS = ['Espace', 'Adresse', 'Photos', 'Description', 'Équipements', 'Disponibilités', 'Tarifs', 'Conditions', 'Aperçu'];

const SPACE_ICONS: Record<ChairSpaceType, typeof Armchair> = {
  chair: Armchair,
  barber_post: Scissors,
  private_cabin: DoorClosed,
  coloring_corner: Palette,
  independent_post: UserIcon,
};

interface DraftState {
  space_type: ChairSpaceType | null;
  address: string;
  city: string;
  access_instructions: string;
  photos: string[];
  title: string;
  description: string;
  equipment: ChairEquipmentKey[];
  available_days: number[];
  blocked_dates: string[];
  price_per_day: string;
  price_per_week: string;
  price_per_month: string;
  deposit_amount: string;
  insurance_required: boolean;
  insurance_notes: string;
  products_policy: string;
  conditions: string;
}

function initialDraft(initial: ApiChairRental | null | undefined, salon: ApiSalonFull): DraftState {
  return {
    space_type: initial?.space_type ?? null,
    address: initial?.address ?? '',
    city: initial?.city ?? salon.city ?? '',
    access_instructions: initial?.access_instructions ?? '',
    photos: initial?.photos ?? [],
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    equipment: initial?.equipment ?? [],
    available_days: initial?.available_days ?? [1, 2, 3, 4, 5],
    blocked_dates: initial?.blocked_dates ?? [],
    price_per_day: initial?.price_per_day != null ? String(initial.price_per_day) : '',
    price_per_week: initial?.price_per_week != null ? String(initial.price_per_week) : '',
    price_per_month: initial?.price_per_month != null ? String(initial.price_per_month) : '',
    deposit_amount: initial?.deposit_amount != null ? String(initial.deposit_amount) : '',
    insurance_required: initial?.insurance_required ?? true,
    insurance_notes: initial?.insurance_notes ?? '',
    products_policy: initial?.products_policy ?? '',
    conditions: initial?.conditions ?? '',
  };
}

const inputCls = 'w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all';
const labelCls = 'block text-xs font-semibold text-neutral-700 mb-1.5';

interface Props {
  salon: ApiSalonFull;
  initial?: ApiChairRental | null;
  onClose: () => void;
  onSaved: (rental: ApiChairRental) => void;
}

/** Wizard de création/édition d'annonce fauteuil, façon Airbnb Host : une décision par écran, sauvegarde à chaque étape, reprise possible (brouillon persistant côté serveur dès l'étape 1). */
export default function OwnerChairWizard({ salon, initial, onClose, onSaved }: Props) {
  const [step, setStep] = useState(0);
  const [rentalId, setRentalId] = useState<number | null>(initial?.id ?? null);
  const [data, setData] = useState<DraftState>(() => initialDraft(initial, salon));
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [published, setPublished] = useState<ApiChairRental | null>(null);
  const [error, setError] = useState('');

  function patch(p: Partial<DraftState>) {
    setData((d) => ({ ...d, ...p }));
  }

  async function persist(extra?: Partial<ApiChairRental>): Promise<ApiChairRental> {
    const payload: Partial<ApiChairRental> = {
      space_type: data.space_type ?? undefined,
      address: data.address || undefined,
      city: data.city || undefined,
      access_instructions: data.access_instructions || undefined,
      title: data.title || undefined,
      description: data.description || undefined,
      equipment: data.equipment,
      available_days: data.available_days,
      blocked_dates: data.blocked_dates,
      price_per_day: data.price_per_day ? parseFloat(data.price_per_day) : undefined,
      price_per_week: data.price_per_week ? parseFloat(data.price_per_week) : undefined,
      price_per_month: data.price_per_month ? parseFloat(data.price_per_month) : undefined,
      deposit_amount: data.deposit_amount ? parseFloat(data.deposit_amount) : undefined,
      insurance_required: data.insurance_required,
      insurance_notes: data.insurance_notes || undefined,
      products_policy: data.products_policy || undefined,
      conditions: data.conditions || undefined,
      ...extra,
    };

    if (rentalId) {
      return chairRentals.update(rentalId, payload);
    }
    const created = await chairRentals.create(payload);
    setRentalId(created.id);
    return created;
  }

  async function handleNext() {
    setError('');
    setSaving(true);
    try {
      if (step === STEPS.length - 1) {
        const result = await persist({ status: 'available' });
        setPublished(result);
        onSaved(result);
      } else {
        await persist();
        setStep((s) => s + 1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l’enregistrement.');
    } finally {
      setSaving(false);
    }
  }

  function handleBack() {
    if (step === 0) { onClose(); return; }
    setStep((s) => s - 1);
  }

  async function handleUploadPhotos(files: File[]) {
    setUploadingPhotos(true);
    setError('');
    try {
      const id = rentalId ?? (await persist()).id;
      const res = await chairRentals.uploadPhotos(id, files);
      patch({ photos: res.photos });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l’envoi des photos.');
    } finally {
      setUploadingPhotos(false);
    }
  }

  async function handleDeletePhoto(url: string) {
    if (!rentalId) return;
    const res = await chairRentals.deletePhoto(rentalId, url);
    patch({ photos: res.photos });
  }

  async function handleReorderPhotos(photos: string[]) {
    patch({ photos });
    if (rentalId) await chairRentals.reorderPhotos(rentalId, photos);
  }

  const nextDisabled = (() => {
    switch (step) {
      case 0: return !data.space_type;
      case 1: return !data.city.trim();
      case 3: return !data.title.trim();
      case 6: return !data.price_per_day && !data.price_per_week && !data.price_per_month;
      default: return false;
    }
  })();

  if (published) {
    return (
      <div className="fixed inset-0 z-[100] bg-neutral-900 flex flex-col items-center justify-center text-center px-6">
        <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-6 animate-[bounce_1s_ease-in-out_1]">
          <PartyPopper size={36} className="text-neutral-900" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Votre annonce est en ligne !</h2>
        <p className="text-sm text-neutral-400 mb-8 max-w-xs">
          {published.title} est désormais visible par les coiffeurs indépendants à la recherche d’un espace.
        </p>
        <div className="w-full max-w-xs space-y-2">
          <Link
            href={`/fauteuil/${published.slug}`}
            target="_blank"
            className="block w-full py-3 bg-white text-neutral-900 font-semibold rounded-2xl hover:bg-neutral-100 transition-colors text-sm text-center"
          >
            Voir mon annonce
          </Link>
          <button onClick={onClose} className="w-full py-3 text-neutral-400 font-semibold text-sm hover:text-white transition-colors">
            Terminer
          </button>
        </div>
      </div>
    );
  }

  return (
    <OwnerWizardShell
      title={initial ? 'Modifier l’annonce' : 'Nouvelle annonce'}
      steps={STEPS}
      currentStep={step}
      onClose={onClose}
      onBack={handleBack}
      onNext={handleNext}
      nextDisabled={nextDisabled}
      saving={saving}
      publishLabel="Publier"
    >
      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>}

      {step === 0 && (
        <div>
          <h2 className="text-lg font-bold text-neutral-900 mb-1">Quel type d’espace louez-vous ?</h2>
          <p className="text-sm text-neutral-500 mb-5">Ça aide les coiffeurs indépendants à trouver exactement ce qu’il leur faut.</p>
          <div className="space-y-3">
            {CHAIR_SPACE_TYPES.map(({ value, label }) => {
              const Icon = SPACE_ICONS[value];
              const active = data.space_type === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => patch({ space_type: value })}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                    active ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? 'bg-white/10' : 'bg-neutral-100'}`}>
                    <Icon size={20} strokeWidth={1.75} />
                  </div>
                  <span className="font-semibold text-sm">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <h2 className="text-lg font-bold text-neutral-900 mb-1">Où se trouve l’espace ?</h2>
          <p className="text-sm text-neutral-500 mb-5 flex items-center gap-1.5"><MapPin size={13} />Repris de {salon.name} par défaut — modifiable si besoin.</p>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Ville</label>
              <input type="text" value={data.city} onChange={(e) => patch({ city: e.target.value })} className={inputCls} placeholder="Strasbourg" />
            </div>
            <div>
              <label className={labelCls}>Adresse (optionnel)</label>
              <input type="text" value={data.address} onChange={(e) => patch({ address: e.target.value })} className={inputCls} placeholder="12 rue des Tanneurs" />
            </div>
            <div>
              <label className={labelCls}>Entrée, étage, accès (optionnel)</label>
              <textarea value={data.access_instructions} onChange={(e) => patch({ access_instructions: e.target.value })} rows={3} className={inputCls} placeholder="2e étage, digicode 1234, entrée par la cour..." />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="text-lg font-bold text-neutral-900 mb-1">Ajoutez des photos</h2>
          <p className="text-sm text-neutral-500 mb-5">Les annonces avec plusieurs photos reçoivent bien plus de demandes.</p>
          <PhotoDropzone
            photos={data.photos}
            uploading={uploadingPhotos}
            onUpload={handleUploadPhotos}
            onDelete={handleDeletePhoto}
            onReorder={handleReorderPhotos}
          />
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="text-lg font-bold text-neutral-900 mb-1">Décrivez votre espace</h2>
          <p className="text-sm text-neutral-500 mb-5">Un bon titre est court et concret ; la description donne envie et rassure.</p>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Titre de l’annonce</label>
              <input type="text" value={data.title} onChange={(e) => patch({ title: e.target.value })} className={inputCls} placeholder="Fauteuil lumineux en centre-ville" maxLength={200} />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea value={data.description} onChange={(e) => patch({ description: e.target.value })} rows={6} className={inputCls} placeholder="Décrivez l’ambiance, la clientèle habituelle, ce qui rend cet espace agréable à travailler..." maxLength={2000} />
            </div>
            <div className="bg-neutral-50 rounded-2xl p-3 text-xs text-neutral-500 space-y-1">
              <p className="font-semibold text-neutral-700">Conseils de rédaction</p>
              <p>• Mentionnez la luminosité, l’ambiance et le type de clientèle du salon.</p>
              <p>• Précisez ce qui est inclus (produits, ménage...) pour éviter les questions.</p>
              <p>• Restez honnête — la confiance est la base d’une bonne location.</p>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <h2 className="text-lg font-bold text-neutral-900 mb-1">Quels équipements sont inclus ?</h2>
          <p className="text-sm text-neutral-500 mb-5">Sélectionnez tout ce qui est disponible sur place.</p>
          <EquipmentGrid selected={data.equipment} onToggle={(key) => patch({
            equipment: data.equipment.includes(key) ? data.equipment.filter((k) => k !== key) : [...data.equipment, key],
          })} />
        </div>
      )}

      {step === 5 && (
        <div>
          <h2 className="text-lg font-bold text-neutral-900 mb-1">Quand l’espace est-il disponible ?</h2>
          <p className="text-sm text-neutral-500 mb-5">Une base hebdomadaire, avec la possibilité de bloquer des dates précises.</p>
          <AvailabilityStep
            availableDays={data.available_days}
            onToggleDay={(day) => patch({
              available_days: data.available_days.includes(day) ? data.available_days.filter((d) => d !== day) : [...data.available_days, day].sort(),
            })}
            blockedDates={data.blocked_dates}
            onToggleDate={(iso) => patch({
              blocked_dates: data.blocked_dates.includes(iso) ? data.blocked_dates.filter((d) => d !== iso) : [...data.blocked_dates, iso],
            })}
          />
        </div>
      )}

      {step === 6 && (
        <div>
          <h2 className="text-lg font-bold text-neutral-900 mb-1">Fixez votre tarif</h2>
          <p className="text-sm text-neutral-500 mb-5">Au moins un tarif est requis — les autres sont optionnels.</p>
          <PricingStep
            pricePerDay={data.price_per_day}
            pricePerWeek={data.price_per_week}
            pricePerMonth={data.price_per_month}
            depositAmount={data.deposit_amount}
            onChange={patch}
          />
        </div>
      )}

      {step === 7 && (
        <div>
          <h2 className="text-lg font-bold text-neutral-900 mb-1">Conditions de location</h2>
          <p className="text-sm text-neutral-500 mb-5">Ce que le locataire doit savoir avant de faire une demande.</p>
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-neutral-50 rounded-2xl p-3">
              <ShieldCheck size={16} className="text-neutral-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-neutral-600">Le SIRET du locataire est vérifié automatiquement par CHAIR avant toute demande — vous n’avez rien à faire de ce côté.</p>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={data.insurance_required} onChange={(e) => patch({ insurance_required: e.target.checked })} className="w-4 h-4 rounded accent-neutral-900" />
              <span className="text-sm text-neutral-700">Assurance professionnelle exigée</span>
            </label>
            {data.insurance_required && (
              <textarea value={data.insurance_notes} onChange={(e) => patch({ insurance_notes: e.target.value })} rows={2} className={inputCls} placeholder="Précisions sur l’assurance (optionnel)" />
            )}
            <div>
              <label className={labelCls}>Produits</label>
              <textarea value={data.products_policy} onChange={(e) => patch({ products_policy: e.target.value })} rows={2} className={inputCls} placeholder="Produits fournis, ou apportés par le locataire ?" />
            </div>
            <div>
              <label className={labelCls}>Règlement intérieur</label>
              <textarea value={data.conditions} onChange={(e) => patch({ conditions: e.target.value })} rows={4} className={inputCls} placeholder="Horaires d’accès, préavis, entretien de l’espace..." maxLength={1000} />
            </div>
          </div>
        </div>
      )}

      {step === 8 && (
        <div>
          <h2 className="text-lg font-bold text-neutral-900 mb-1">Aperçu de votre annonce</h2>
          <p className="text-sm text-neutral-500 mb-5">Voici ce que verra un coiffeur indépendant.</p>
          <div className="rounded-[24px] shadow-[0_6px_24px_-10px_rgba(10,10,10,0.16)] ring-1 ring-neutral-100 overflow-hidden">
            <div className="relative aspect-[4/3] bg-neutral-100">
              {data.photos[0] ? (
                <Image src={resolveMediaUrl(data.photos[0]) ?? data.photos[0]} alt="" fill className="object-cover" sizes="400px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-300 text-sm">Aucune photo</div>
              )}
            </div>
            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-bold text-neutral-900">{data.title || 'Sans titre'}</h3>
                <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5"><MapPin size={11} />{data.city || salon.city}</p>
              </div>
              {data.description && <p className="text-sm text-neutral-600">{data.description}</p>}
              <div className="flex items-baseline gap-1">
                {data.price_per_day && <span className="text-lg font-bold text-neutral-900">{data.price_per_day} €<span className="text-xs font-normal text-neutral-400">/jour</span></span>}
              </div>
              {data.equipment.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {data.equipment.map((k) => (
                    <span key={k} className="text-[10px] font-semibold bg-neutral-100 text-neutral-600 px-2 py-1 rounded-full">{CHAIR_EQUIPMENT_LABELS[k]}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-neutral-400 pt-2 border-t border-neutral-100">
                <Star size={11} />Publiée par {salon.name}
              </div>
            </div>
          </div>
        </div>
      )}
    </OwnerWizardShell>
  );
}
