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
  /**
   * Lien de réservation du SALON, hérité par tous ses salariés.
   *
   * C'est le salon qui détient l'abonnement au logiciel de réservation
   * (Planity, Zenoti, Shortcuts…) et son agenda est commun : un salarié n'a
   * donc rien à saisir. Sans cette retombée, un coiffeur salarié n'avait
   * aucun moyen d'être réservé — donc aucune clientèle possible sur CHAIR.
   */
  salonBookingUrl?: string | null;
  /** Réputation par spécialité (specialty_highlights du profil) — sert à
   *  afficher les visites certifiées réelles à côté de chaque groupe. */
  specialtyHighlights?: ApiSpecialtyHighlight[];
}

export default function PublicProfileServices({ slug, categories, isIndependent, bookingUrl, salonBookingUrl = null, specialtyHighlights = [] }: Props) {
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

  /**
   * Vers quoi réserve-t-on quand ce coiffeur est salarié ? Son propre lien
   * s'il en a saisi un, sinon celui de son salon.
   */
  const externalBookingUrl = isIndependent ? null : (bookingUrl ?? salonBookingUrl ?? null);

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
      {/* Coiffeur salarié : c'est l'agenda de son salon qui fait foi, pas le
          nôtre. Le bouton quittait CHAIR sans prévenir — en app native, ce clic
          éjecte dans le navigateur du téléphone. Le libellé et la phrase qui
          suit disent où l'on va AVANT le clic. */}
      {externalBookingUrl && (
        <div className="mb-6">
          <PrimaryButton
            fullWidth
            href={externalBookingUrl}
            target="_blank"
            icon={<ExternalLink size={15} strokeWidth={2} />}
          >
            Réserver sur le site du salon
          </PrimaryButton>
          <p className="text-[12px] text-neutral-400 mt-2 text-center leading-relaxed">
            Ce coiffeur travaille en salon et utilise l&apos;agenda de son salon. Le lien
            s&apos;ouvre dans ton navigateur, CHAIR reste ouverte derrière. Le paiement se fait sur place.
          </p>
        </div>
      )}

      {/* Salarié dont NI lui NI son salon n'a de lien : sans ce message, la
          fiche listait des prestations inertes, sans prix, sans bouton et sans
          un mot — une impasse complète. On dit au moins comment procéder. */}
      {!isIndependent && !externalBookingUrl && (
        <div className="mb-6 rounded-2xl bg-neutral-50 border border-neutral-100 px-4 py-3.5">
          <p className="text-[13px] font-semibold text-neutral-900 leading-snug">
            Réservation par téléphone
          </p>
          <p className="text-[12px] text-neutral-500 mt-1 leading-relaxed">
            Ce coiffeur travaille en salon et n&apos;a pas encore de réservation en ligne.
            Contacte son salon pour prendre rendez-vous avec lui — les prestations
            ci-dessous sont celles qu&apos;il propose.
          </p>
        </div>
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
                      {externalBookingUrl && <ExternalLink size={14} className="text-neutral-300" />}
                    </div>
                  </>
                );

                if (isIndependent) {
                  return (
                    <button
                      key={svc.id}
                      onClick={() => handleBook(svc)}
                      aria-label={`Réserver ${svc.name}`}
                      className="w-full flex items-center py-4 border-b border-neutral-100 text-left transition-colors active:bg-neutral-50 hover:bg-neutral-50/60"
                    >
                      {inner}
                    </button>
                  );
                }

                // Salarié : chaque prestation mène à l'agenda du salon.
                //
                // Les lignes étaient de simples <div> inertes. Un client qui
                // voyait la prestation qu'il voulait tapait dessus, et rien ne
                // se passait — le seul point de sortie était un bouton unique
                // tout en haut, qu'il fallait avoir remarqué. Rendre chaque
                // ligne cliquable, c'est rendre un salarié réservable au même
                // endroit et avec le même geste qu'un indépendant.
                //
                // target="_blank" : dans l'app native, la demande passe au
                // navigateur du système et CHAIR reste ouverte derrière.
                if (externalBookingUrl) {
                  return (
                    <a
                      key={svc.id}
                      href={externalBookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Réserver ${svc.name} sur le site du salon`}
                      className="w-full flex items-center py-4 border-b border-neutral-100 text-left transition-colors active:bg-neutral-50 hover:bg-neutral-50/60"
                    >
                      {inner}
                    </a>
                  );
                }

                return (
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

      {externalBookingUrl && (
        <p className="text-[12px] text-neutral-400 mt-6 text-center leading-relaxed">
          Choisis une prestation pour ouvrir l&apos;agenda du salon.
          <br />
          Le paiement se fait sur place, jamais dans l&apos;application.
        </p>
      )}

      {isIndependent && (
        <>
          <p className="text-[12px] text-neutral-400 mt-6 text-center leading-relaxed">
            Choisis une prestation pour voir les disponibilités.
            <br />
            Le paiement se fait sur place, jamais dans l&apos;application.
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
