'use client';

import { useState } from 'react';
import { Star, BadgeCheck, ShieldCheck } from 'lucide-react';
import StarRating from '@/components/ui/StarRating';
import { formatDate } from '@/lib/types';
import type { ApiReview } from '@/lib/types';

interface Props {
  hairdresserId: number;
  hairdresserUserId: number;
  initialReviews: ApiReview[];
  avgRating: string;
  reviewsCount: number;
}

export default function ReviewsSection({
  initialReviews,
  avgRating,
  reviewsCount,
}: Props) {
  const [reviews] = useState<ApiReview[]>(initialReviews);
  const hasRating = reviewsCount > 0;

  return (
    <section className="px-4 md:px-0 mb-10">
      <div className="flex items-center gap-2 mb-4">
        <Star size={15} className="text-neutral-900" />
        <h3 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">Avis clients</h3>
      </div>

      {hasRating ? (
        <div className="flex items-center gap-2 mb-5">
          <StarRating rating={parseFloat(avgRating)} size={16} />
          <span className="text-sm font-bold text-neutral-900">{avgRating}</span>
          <span className="text-sm text-neutral-400">· {reviewsCount} avis</span>
        </div>
      ) : (
        <p className="text-sm text-neutral-400 mb-4">Aucun avis pour l'instant.</p>
      )}

      {/* Liste des avis */}
      {reviews.length > 0 && (
        <div className="space-y-3 mb-5">
          {reviews.slice(0, 10).map((review) => (
            <div key={review.id} className="bg-neutral-50 rounded-2xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{review.client.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StarRating rating={review.rating} size={12} />
                    {review.is_verified && (
                      <span className="text-[10px] text-green-700 flex items-center gap-0.5 font-medium">
                        <BadgeCheck size={11} /> Certifié
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-neutral-400">{formatDate(review.created_at)}</span>
              </div>
              {review.comment && (
                <p className="text-sm text-neutral-600 leading-relaxed">"{review.comment}"</p>
              )}
              {review.specialty && (
                <span className="inline-block mt-2 text-[10px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">
                  {review.specialty}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Notice avis certifiés */}
      <div className="flex items-start gap-2.5 bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2.5">
        <ShieldCheck size={15} className="text-neutral-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-neutral-500 leading-relaxed">
          Les avis CHAIR sont certifiés après un rendez-vous confirmé et terminé.
        </p>
      </div>
    </section>
  );
}
