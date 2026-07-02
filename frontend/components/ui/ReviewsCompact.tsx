'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Star, ShieldCheck, BadgeCheck, X } from 'lucide-react';
import StarRating from '@/components/ui/StarRating';
import ReviewsSection from '@/components/ui/ReviewsSection';
import { resolveMediaUrl, formatDate } from '@/lib/types';
import type { ApiReview } from '@/lib/types';

function buildBreakdown(reviews: ApiReview[]): Record<number, number> {
  const b: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r) => { if (r.rating >= 1 && r.rating <= 5) b[r.rating]++; });
  return b;
}

function SimpleReviewCard({ review }: { review: ApiReview }) {
  const clientAvatar = resolveMediaUrl(review.client?.avatar ?? null);
  const firstName = (review.client?.name ?? 'Client').split(' ')[0];
  const initial = firstName.charAt(0).toUpperCase();
  return (
    <div className="py-4 first:pt-0">
      <div className="flex items-center gap-3 mb-2">
        <div className="relative w-8 h-8 rounded-full overflow-hidden bg-neutral-100 flex-shrink-0 flex items-center justify-center">
          {clientAvatar ? (
            <Image src={clientAvatar} alt={firstName} fill className="object-cover" sizes="32px" />
          ) : (
            <span className="text-[12px] font-bold text-neutral-400">{initial}</span>
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-semibold text-neutral-900">{firstName}</p>
            {review.is_verified && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-green-700 font-medium">
                <BadgeCheck size={11} />
                Certifié
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <StarRating rating={review.rating} size={11} />
            <span className="text-[11px] text-neutral-400">{formatDate(review.created_at)}</span>
          </div>
        </div>
      </div>
      {review.comment && (
        <p className="text-[13px] text-neutral-600 leading-relaxed pl-11 italic">
          &ldquo;{review.comment}&rdquo;
        </p>
      )}
      {review.specialty && (
        <span className="inline-block mt-2 ml-11 text-[10px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">
          {review.specialty}
        </span>
      )}
    </div>
  );
}

interface Props {
  hairdresserId: number;
  hairdresserUserId: number;
  initialReviews: ApiReview[];
  avgRating: string;
  reviewsCount: number;
}

export default function ReviewsCompact({
  hairdresserId,
  hairdresserUserId,
  initialReviews,
  avgRating,
  reviewsCount,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const hasRating = reviewsCount > 0;
  const avg = parseFloat(avgRating);
  const breakdown = buildBreakdown(initialReviews);
  const top3 = initialReviews.slice(0, 3);

  return (
    <section className="mt-8">
      <div className="px-4 md:px-0 flex items-center justify-between mb-4">
        <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-neutral-400">
          Avis clients
        </p>
        {hasRating && (
          <div className="flex items-center gap-1">
            <Star size={12} className="fill-amber-400 stroke-amber-400" />
            <span className="text-[13px] font-bold text-neutral-900">{avg.toFixed(1)}</span>
            <span className="text-[11px] text-neutral-400 ml-0.5">({reviewsCount})</span>
          </div>
        )}
      </div>

      {!hasRating ? (
        <p className="px-4 md:px-0 text-[13px] text-neutral-400">Aucun avis pour l&apos;instant.</p>
      ) : (
        <div className="px-4 md:px-0">
          {/* Score + répartition — compact */}
          <div className="flex items-center gap-5 bg-neutral-50 rounded-2xl p-4 mb-4">
            <div className="text-center flex-shrink-0">
              <p className="text-[44px] font-bold text-neutral-900 leading-none">{avg.toFixed(1)}</p>
              <div className="mt-1.5 flex justify-center">
                <StarRating rating={avg} size={12} />
              </div>
              <p className="text-[10px] text-neutral-400 mt-1.5">{reviewsCount} avis</p>
            </div>
            <div className="flex-1 space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = breakdown[star] ?? 0;
                const pct = reviewsCount > 0 ? Math.round((count / reviewsCount) * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-400 w-2.5 flex-shrink-0">{star}</span>
                    <div className="flex-1 h-1 bg-neutral-200 rounded-full overflow-hidden">
                      <div className="h-full bg-neutral-900 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-neutral-400 w-4 text-right flex-shrink-0">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top 3 avis */}
          {top3.length > 0 && (
            <div className="divide-y divide-neutral-100 mb-4">
              {top3.map((r) => (
                <SimpleReviewCard key={r.id} review={r} />
              ))}
            </div>
          )}

          {/* Voir tous */}
          {reviewsCount > 3 && (
            <button
              onClick={() => setSheetOpen(true)}
              className="w-full py-3.5 text-[13px] font-semibold text-neutral-700 bg-neutral-50 rounded-2xl hover:bg-neutral-100 transition-colors mb-4"
            >
              Voir les {reviewsCount} avis
            </button>
          )}

          <div className="flex items-start gap-2 bg-neutral-50 rounded-xl px-3 py-2.5">
            <ShieldCheck size={13} className="text-neutral-400 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Les avis CHAIR sont certifiés après un rendez-vous confirmé et terminé.
            </p>
          </div>
        </div>
      )}

      {/* Bottom sheet — tous les avis */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSheetOpen(false)}
          />
          <div className="relative bg-white rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-neutral-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <p className="text-[16px] font-bold text-neutral-900">Avis clients</p>
                {hasRating && (
                  <div className="flex items-center gap-1 bg-neutral-50 rounded-full px-2.5 py-1">
                    <Star size={11} className="fill-amber-400 stroke-amber-400" />
                    <span className="text-[12px] font-bold text-neutral-900">{avg.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSheetOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <ReviewsSection
                hairdresserId={hairdresserId}
                hairdresserUserId={hairdresserUserId}
                initialReviews={initialReviews}
                avgRating={avgRating}
                reviewsCount={reviewsCount}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
