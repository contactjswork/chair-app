'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Star, ShieldCheck, BadgeCheck, X, Share2 } from 'lucide-react';
import StoryShareSheet from '@/components/pro/StoryShareSheet';
import { genererStoryAvis } from '@/lib/storyImage';
import StarRating from '@/components/ui/StarRating';
import ReviewsSection from '@/components/ui/ReviewsSection';
import BottomSheet from '@/components/ui/BottomSheet';
import { resolveMediaUrl, formatDate } from '@/lib/types';
import { reviews as reviewsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ApiReview } from '@/lib/types';

function buildBreakdown(reviews: ApiReview[]): Record<number, number> {
  const b: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r) => { if (r.rating >= 1 && r.rating <= 5) b[r.rating]++; });
  return b;
}

function SimpleReviewCard({ review, isOwner, onReplied, onShareStory }: { review: ApiReview; isOwner: boolean; onReplied: (id: number, reply: string) => void; onShareStory?: () => void }) {
  const clientAvatar = resolveMediaUrl(review.client?.avatar ?? null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(review.hairdresser_reply ?? '');
  const [saving, setSaving] = useState(false);

  function save() {
    const texte = draft.trim();
    if (!texte) return;
    setSaving(true);
    reviewsApi
      .reply(review.id, texte)
      .then(() => { onReplied(review.id, texte); setEditing(false); })
      .catch(() => {})
      .finally(() => setSaving(false));
  }
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
              <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium">
                <BadgeCheck size={11} />
                Vérifié
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
        <p className="text-[13px] text-neutral-600 leading-relaxed pl-11 italic break-words [overflow-wrap:anywhere]">
          &ldquo;{review.comment}&rdquo;
        </p>
      )}
      {/* La photo du résultat — la preuve du texte. Elle reste petite :
          c'est l'avis qui parle, la photo l'appuie. */}
      {review.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={review.photo_url}
          alt="Photo du résultat"
          loading="lazy"
          className="mt-2.5 ml-11 w-24 h-32 rounded-xl object-cover border border-neutral-100"
        />
      )}
      {review.specialty && (
        <span className="inline-block mt-2 ml-11 text-[10px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">
          {review.specialty}
        </span>
      )}

      {/* La réponse du coiffeur — publique, sous l'avis, en retrait. C'est
          elle que lisent les FUTURS clients : sur un avis mitigé, une bonne
          réponse vaut mieux qu'un 5 étoiles de plus. */}
      {review.hairdresser_reply && !editing && (
        <div className="mt-2.5 ml-11 border-l-2 border-neutral-200 pl-3">
          <p className="text-[11px] font-semibold text-neutral-500">Réponse du coiffeur</p>
          <p className="text-[13px] text-neutral-600 leading-relaxed mt-0.5 break-words [overflow-wrap:anywhere]">
            {review.hairdresser_reply}
          </p>
          {isOwner && (
            <button
              onClick={() => setEditing(true)}
              className="relative before:absolute before:-inset-y-[13px] before:inset-x-0 before:content-[''] text-[12px] font-medium text-neutral-400 active:text-neutral-700 mt-1"
            >
              Modifier
            </button>
          )}
        </div>
      )}

      {/* Un bon avis est une pub : le coiffeur le partage en story
          formatée CHAIR (étoiles, citation, lien de réservation). */}
      {onShareStory && (
        <button
          onClick={onShareStory}
          className="relative before:absolute before:-inset-y-[8px] before:inset-x-0 before:content-[''] mt-2 ml-11 flex items-center gap-1.5 text-[12px] font-semibold text-neutral-400 hover:text-neutral-900 transition-colors"
        >
          <Share2 size={12} /> Partager en story
        </button>
      )}

      {isOwner && (editing || !review.hairdresser_reply) && (
        <div className="mt-2.5 ml-11">
          {editing ? (
            <div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Votre réponse, visible par tous…"
                rows={2}
                maxLength={1000}
                className="w-full border border-neutral-200 rounded-xl px-3.5 py-2.5 text-[16px] text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:border-neutral-900 resize-none transition-colors"
              />
              <div className="flex gap-2 mt-1.5">
                <button
                  onClick={save}
                  disabled={saving || !draft.trim()}
                  className="text-[12.5px] font-semibold text-white bg-neutral-900 px-3.5 min-h-[36px] rounded-xl disabled:opacity-40 active:scale-[0.97] transition-transform"
                >
                  {saving ? 'Envoi…' : 'Publier la réponse'}
                </button>
                <button
                  onClick={() => { setEditing(false); setDraft(review.hairdresser_reply ?? ''); }}
                  className="text-[12.5px] font-medium text-neutral-500 px-2 min-h-[36px]"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="relative before:absolute before:-inset-y-[8px] before:inset-x-0 before:content-[''] text-[12.5px] font-semibold text-neutral-500 active:text-neutral-900"
            >
              Répondre à cet avis
            </button>
          )}
        </div>
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
  /** Nécessaire au partage d'un avis en story (propriétaire uniquement). */
  storyMeta?: { name: string; city: string | null; slug: string | null };
}

export default function ReviewsCompact({
  hairdresserId,
  hairdresserUserId,
  initialReviews,
  avgRating,
  reviewsCount,
  storyMeta,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  // L'avis en cours de partage en story (propriétaire, avis 4★+ seulement).
  const [avisStory, setAvisStory] = useState<ApiReview | null>(null);
  // Copie locale : la réponse tout juste publiée doit apparaître sans
  // recharger la page — le coiffeur doit voir sa parole en place.
  const [liste, setListe] = useState(initialReviews);
  const { user } = useAuth();
  const isOwner = user?.id === hairdresserUserId;
  const hasRating = reviewsCount > 0;
  const avg = parseFloat(avgRating);
  const breakdown = buildBreakdown(liste);
  const top3 = liste.slice(0, 3);

  function surReponse(id: number, reply: string) {
    setListe((avant) => avant.map((r) => (r.id === id ? { ...r, hairdresser_reply: reply } : r)));
  }

  return (
    <section className="mt-8">
      <div className="px-4 md:px-0 flex items-center justify-between mb-4">
        <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-neutral-400">
          Avis clients
        </p>
        {hasRating && (
          <div className="flex items-center gap-1">
            <Star size={12} className="fill-neutral-900 stroke-none" />
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
                <SimpleReviewCard key={r.id} review={r} isOwner={isOwner} onReplied={surReponse}
                  onShareStory={storyMeta && r.rating >= 4 ? () => setAvisStory(r) : undefined} />
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
              Les avis CHAIR sont vérifiés après un rendez-vous confirmé et terminé.
            </p>
          </div>
        </div>
      )}

      {avisStory && storyMeta && (
        <StoryShareSheet
          generer={() => genererStoryAvis({
            rating: avisStory.rating,
            comment: avisStory.comment,
            clientFirstName: (avisStory.client?.name ?? 'Client').split(' ')[0],
            name: storyMeta.name,
            city: storyMeta.city,
            slug: storyMeta.slug,
          })}
          lien={storyMeta.slug ? `https://getchair.app/coiffeur/${storyMeta.slug}` : null}
          onClose={() => setAvisStory(null)}
        />
      )}

      {/* Bottom sheet — tous les avis */}
      {sheetOpen && (
        <BottomSheet onClose={() => setSheetOpen(false)} maxHeight="max-h-[90vh]">
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-5 pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <p className="text-[16px] font-bold text-neutral-900">Avis clients</p>
                {hasRating && (
                  <div className="flex items-center gap-1 bg-neutral-50 rounded-full px-2.5 py-1">
                    <Star size={11} className="fill-neutral-900 stroke-none" />
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
            <ReviewsSection
              hairdresserId={hairdresserId}
              hairdresserUserId={hairdresserUserId}
              initialReviews={initialReviews}
              avgRating={avgRating}
              reviewsCount={reviewsCount}
            />
        </BottomSheet>
      )}
    </section>
  );
}
