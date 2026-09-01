'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Flag } from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';
import ReportSheet from '@/components/ui/ReportSheet';
import StarRating from '@/components/ui/StarRating';
import type { ApiReview } from '@/lib/types';
import { formatDate } from '@/lib/types';
import ReviewsCompact from './ReviewsCompact';

interface Props {
  hairdresserId: number;
  hairdresserUserId: number;
  reviews: ApiReview[];
  avgRating: string;
  reviewsCount: number;
  storyMeta?: { name: string; city: string | null; slug: string | null };
}

/**
 * Onglet "Avis" de la fiche publique.
 *
 * Le rendu des avis reste entièrement délégué à ReviewsCompact (inchangé).
 * On ajoute ici l'entrée de SIGNALEMENT d'un avis, exigée par App Store
 * Review Guideline 1.2 : "A mechanism to report offensive content". Un avis
 * est du contenu généré par un utilisateur au même titre qu'une réalisation,
 * il doit donc être signalable.
 *
 * Le parcours est en deux temps — choisir l'avis, puis le motif — parce que
 * la liste d'avis est rendue par un composant partagé qui n'expose pas de
 * point d'accroche par carte. Le sélecteur reprend les mêmes avis que ceux
 * affichés au-dessus.
 */
export default function PublicProfileReviews({
  hairdresserId,
  hairdresserUserId,
  reviews,
  avgRating,
  reviewsCount,
  storyMeta,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reportId, setReportId]     = useState<number | null>(null);

  return (
    <>
      <ReviewsCompact
        hairdresserId={hairdresserId}
        hairdresserUserId={hairdresserUserId}
        initialReviews={reviews}
        avgRating={avgRating}
        reviewsCount={reviewsCount}
        storyMeta={storyMeta}
      />

      {reviews.length > 0 && (
        <div className="px-4 md:px-0 mt-3">
          <button
            onClick={() => setPickerOpen(true)}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 text-[12px] font-medium text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <Flag size={13} />
            Signaler un avis
          </button>
        </div>
      )}

      {/* Portalé dans body : la fiche coiffeur pose un CTA sticky et la bottom
          nav est en z-[60] — sans portail, le bas du sélecteur passe dessous. */}
      {pickerOpen && createPortal(
        <BottomSheet onClose={() => setPickerOpen(false)} maxHeight="max-h-[85vh]" zIndexClassName="z-[110]">
          <div className="px-5 pb-8">
            <div className="pb-4 border-b border-neutral-100">
              <p className="text-[16px] font-bold text-neutral-900">Quel avis veux-tu signaler ?</p>
              <p className="text-[12px] text-neutral-400 mt-1">
                Ton signalement est confidentiel et examiné sous 72 heures.
              </p>
            </div>

            <ul className="divide-y divide-neutral-100">
              {reviews.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => { setPickerOpen(false); setReportId(r.id); }}
                    className="w-full text-left py-3.5 min-h-[52px] hover:bg-neutral-50 transition-colors rounded-xl px-2 -mx-2"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-neutral-900">
                        {(r.client?.name ?? 'Client').split(' ')[0]}
                      </span>
                      <StarRating rating={r.rating} size={11} />
                      <span className="text-[11px] text-neutral-400">{formatDate(r.created_at)}</span>
                    </span>
                    {r.comment && (
                      <span className="block text-[12px] text-neutral-500 mt-1 line-clamp-2">
                        {r.comment}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>

            <button
              onClick={() => setPickerOpen(false)}
              className="w-full mt-4 min-h-[48px] rounded-2xl bg-neutral-100 text-neutral-700 text-[14px] font-semibold hover:bg-neutral-200 transition-colors"
            >
              Annuler
            </button>
          </div>
        </BottomSheet>,
        document.body
      )}

      {reportId !== null && (
        <ReportSheet type="review" contentId={reportId} onClose={() => setReportId(null)} />
      )}
    </>
  );
}
