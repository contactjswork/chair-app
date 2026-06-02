'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Star, BadgeCheck, ShieldCheck } from 'lucide-react';
import StarRating from '@/components/ui/StarRating';
import { resolveMediaUrl, formatDate } from '@/lib/types';
import type { ApiReview } from '@/lib/types';

interface Props {
  hairdresserId: number;
  hairdresserUserId: number;
  initialReviews: ApiReview[];
  avgRating: string;
  reviewsCount: number;
}

/** Construit la répartition 1–5 étoiles depuis la liste des avis. */
function buildBreakdown(reviews: ApiReview[]): Record<number, number> {
  const b: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r) => { if (r.rating >= 1 && r.rating <= 5) b[r.rating]++; });
  return b;
}

export default function ReviewsSection({
  initialReviews,
  avgRating,
  reviewsCount,
}: Props) {
  const [reviews] = useState<ApiReview[]>(initialReviews);
  const hasRating = reviewsCount > 0;
  const breakdown = buildBreakdown(reviews);

  return (
    <section className="px-4 md:px-0 mb-10">
      <div className="flex items-center gap-2 mb-5">
        <Star size={15} className="text-neutral-900" />
        <h3 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">
          Avis clients
        </h3>
      </div>

      {hasRating ? (
        <>
          {/* ── Résumé note + répartition ── */}
          <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-5 mb-5">
            <div className="flex items-start gap-5">
              {/* Note globale */}
              <div className="text-center flex-shrink-0">
                <p className="text-5xl font-bold text-neutral-900 leading-none">
                  {parseFloat(avgRating).toFixed(1)}
                </p>
                <div className="mt-1.5 flex justify-center">
                  <StarRating rating={parseFloat(avgRating)} size={13} />
                </div>
                <p className="text-xs text-neutral-400 mt-1.5">
                  {reviewsCount} avis
                </p>
              </div>

              {/* Barres de répartition */}
              <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = breakdown[star] ?? 0;
                  const pct = reviewsCount > 0 ? Math.round((count / reviewsCount) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-neutral-500 w-3 text-right flex-shrink-0">
                        {star}
                      </span>
                      <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-neutral-900 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-neutral-400 w-6 text-right flex-shrink-0">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Liste des avis ── */}
          {reviews.length > 0 && (
            <div className="space-y-3 mb-5">
              {reviews.slice(0, 10).map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-neutral-400 mb-5">Aucun avis pour l'instant.</p>
      )}

      {/* ── Notice certification ── */}
      <div className="flex items-start gap-2.5 bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2.5">
        <ShieldCheck size={15} className="text-neutral-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-neutral-500 leading-relaxed">
          Les avis CHAIR sont certifiés après un rendez-vous confirmé et termine.
        </p>
      </div>
    </section>
  );
}

// ── Carte d'avis individuelle ─────────────────────────────────────────

function ReviewCard({ review }: { review: ApiReview }) {
  const clientAvatar = resolveMediaUrl(review.client?.avatar ?? null);
  const firstName = (review.client?.name ?? 'Client').split(' ')[0];
  const initial = firstName.charAt(0).toUpperCase();

  return (
    <div className="bg-white border border-neutral-100 rounded-2xl p-4">
      <div className="flex items-start gap-3 mb-2.5">
        {/* Avatar client */}
        <div className="relative w-9 h-9 rounded-full overflow-hidden bg-neutral-200 flex-shrink-0 flex items-center justify-center">
          {clientAvatar ? (
            <Image src={clientAvatar} alt={firstName} fill className="object-cover" sizes="36px" />
          ) : (
            <span className="text-sm font-bold text-neutral-500">{initial}</span>
          )}
        </div>

        {/* Nom + note */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-neutral-900 truncate">{firstName}</p>
            {review.is_verified && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-green-700 font-medium">
                <BadgeCheck size={11} />
                Certifie
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <StarRating rating={review.rating} size={12} />
            <span className="text-[11px] text-neutral-400">{formatDate(review.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Commentaire */}
      {review.comment && (
        <p className="text-sm text-neutral-600 leading-relaxed pl-12">
          &ldquo;{review.comment}&rdquo;
        </p>
      )}

      {review.specialty && (
        <span className="inline-block mt-2 ml-12 text-[10px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">
          {review.specialty}
        </span>
      )}
    </div>
  );
}
