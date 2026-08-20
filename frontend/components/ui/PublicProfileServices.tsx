'use client';

import { useState } from 'react';
import { Clock, ExternalLink, ChevronRight, Scissors, BadgeCheck } from 'lucide-react';
import type { ApiServiceCategory, ApiService, ApiSpecialtyHighlight } from '@/lib/types';
import BookingSheet from './BookingSheet';
import EmptyState from './EmptyState';
import { PrimaryButton } from './Button';

interface Props {
  slug: string;
  categories: ApiServiceCategory[];
  isIndependent: boolean;
  bookingUrl: string | null;
  /** Réputation par spécialité (specialty_highlights du profil) — sert à
   *  afficher les visites certifiées réelles à côté de chaque groupe. */
  specialtyHighlights?: ApiSpecialtyHighlight[];
}

export default function PublicProfileServices({ slug, categories, isIndependent, bookingUrl, specialtyHighlights = [] }: Props) {
  const [preselect, setPreselect] = useState<ApiService | null>(null);
  const [open, setOpen] = useState(false);

  const visibleCategories = categories
    .map((cat) => ({ cat, active: (cat.services ?? []).filter((s) => s.is_active) }))
    .filter(({ active }) => active.length > 0);

  // Visites certifiées de la spécialité du groupe (données réelles issues des
  // QR de visite — hairdresser_specialty_progress.visits_count). Le groupe est
  // relié à sa spécialité par le specialty_id de ses services ; affiché
  // uniquement si > 0 — jamais un "0 visites" par défaut.
  function certifiedVisitsFor(services: ApiService[]): number | null {
    const specialtyId = services.find((s) => s.specialty_id != null)?.specialty_id;
    if (specialtyId == null) return null;
    const h = specialtyHighlights.find((x) => x.specialty_id === specialtyId);
    return h && h.visits_count > 0 ? h.visits_count : null;
  }

  function handleBook(svc: ApiService) {
    setPreselect(svc);
    setOpen(true);
  }

  if (visibleCategories.length === 0) {
    return (
      <EmptyState
        icon={Scissors}
        title="Aucune prestation"
        subtitle="Ce coiffeur n'a pas encore publié ses prestations et ses tarifs."
      />
    );
  }

  return (
    <div className="px-4 md:px-0">
      {!isIndependent && bookingUrl && (
        <PrimaryButton
          fullWidth
          href={bookingUrl}
          target="_blank"
          icon={<ExternalLink size={15} strokeWidth={2} />}
          className="mb-6"
        >
          Réserver au salon
        </PrimaryButton>
      )}

      <div className="space-y-7">
        {visibleCategories.map(({ cat, active }) => {
          const certifiedVisits = certifiedVisitsFor(active);
          return (
          <div key={cat.id}>
            {cat.name && (
              <div className="flex items-baseline justify-between gap-2 mb-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">{cat.name}</p>
                {certifiedVisits != null && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-500 whitespace-nowrap">
                    <BadgeCheck size={12} className="text-neutral-400" />
                    {certifiedVisits} visite{certifiedVisits > 1 ? 's' : ''} certifiée{certifiedVisits > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}

            {/* Lignes à filets sur fond blanc, plutôt qu'un pavé gris arrondi.
                Et surtout : chez un indépendant, c'est la ligne entière qui
                déclenche la réservation. Avant, chaque ligne empilait le prix
                ET un petit bouton "Réserver" dans le même coin — deux
                contrôles serrés sur 375px de large, avec une cible tactile
                minuscule alors que toute la largeur était disponible. */}
            <div className="border-t border-neutral-100">
              {active.map((svc) => {
                const price = svc.price != null ? parseFloat(String(svc.price)) : null;
                const showPrice = isIndependent && price != null && price > 0;

                const inner = (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[14px] font-semibold text-neutral-900 leading-snug">{svc.name}</p>
                      {svc.description && (
                        <p className="text-[12px] text-neutral-400 mt-0.5 leading-snug line-clamp-1">{svc.description}</p>
                      )}
                      {svc.duration_minutes != null && (
                        <span className="inline-flex items-center gap-1 text-[12px] text-neutral-400 mt-1.5">
                          <Clock size={11} />{svc.duration_minutes} min
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 pl-3">
                      {showPrice && (
                        <span className="text-[16px] font-bold text-neutral-900 tabular-nums">{price.toFixed(0)} €</span>
                      )}
                      {isIndependent && <ChevronRight size={16} className="text-neutral-300" />}
                    </div>
                  </>
                );

                return isIndependent ? (
                  <button
                    key={svc.id}
                    onClick={() => handleBook(svc)}
                    aria-label={`Réserver ${svc.name}`}
                    className="w-full flex items-center py-4 border-b border-neutral-100 text-left transition-colors active:bg-neutral-50 hover:bg-neutral-50/60"
                  >
                    {inner}
                  </button>
                ) : (
                  <div key={svc.id} className="flex items-center py-4 border-b border-neutral-100">
                    {inner}
                  </div>
                );
              })}
            </div>
          </div>
          );
        })}
      </div>

      {isIndependent && (
        <>
          <p className="text-[12px] text-neutral-400 mt-6 text-center">
            Sélectionnez une prestation pour voir les disponibilités.
          </p>
          <BookingSheet
            slug={slug}
            open={open}
            onClose={() => { setOpen(false); setPreselect(null); }}
            initialCategoryId={preselect?.category_id}
            initialServiceId={preselect?.id}
          />
        </>
      )}
    </div>
  );
}
