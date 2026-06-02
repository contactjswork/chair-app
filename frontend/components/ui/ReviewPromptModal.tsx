'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { X, Star } from 'lucide-react';
import { resolveMediaUrl, formatApptDate, type ApiAppointment } from '@/lib/types';
import { appointments as apptApi } from '@/lib/api';

interface Props {
  appointment: ApiAppointment;
  onClose: () => void;
  onSubmitted: (appointmentId: number) => void;
}

const STAR_LABELS: Record<number, string> = {
  1: 'Très déçu',
  2: 'Décevant',
  3: 'Correct',
  4: 'Très satisfait',
  5: 'Exceptionnel',
};

export default function ReviewPromptModal({ appointment, onClose, onSubmitted }: Props) {
  const [rating, setRating]     = useState(0);
  const [hovered, setHovered]   = useState(0);
  const [comment, setComment]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const hairdresserName = appointment.hairdresser?.user?.name ?? 'votre coiffeur';
  const hairdresserAvatar = resolveMediaUrl(appointment.hairdresser?.user?.avatar ?? null);
  const hairdresserSlug  = appointment.hairdresser?.slug;
  const dateLabel = formatApptDate(appointment, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const displayRating = hovered || rating;

  const handleSubmit = useCallback(async () => {
    if (rating === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await apptApi.submitReview(appointment.id, {
        rating,
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
      setTimeout(() => onSubmitted(appointment.id), 1800);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  }, [rating, comment, appointment.id, onSubmitted]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center px-0 sm:px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">

        {/* Close */}
        {!submitted && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
            aria-label="Fermer"
          >
            <X size={15} className="text-neutral-600" />
          </button>
        )}

        {submitted ? (
          /* ── Écran de succès ── */
          <div className="flex flex-col items-center justify-center px-8 py-14 text-center">
            <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center mb-5">
              <Star size={26} className="text-white fill-white" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 mb-2">Merci !</h2>
            <p className="text-sm text-neutral-500 leading-relaxed">
              Votre avis a été publié et aide d'autres clients à choisir {hairdresserName}.
            </p>
          </div>
        ) : (
          <>
            {/* ── Header coiffeur ── */}
            <div className="px-6 pt-8 pb-5 border-b border-neutral-100">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-4 text-center">
                Partagez votre experience
              </p>

              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14 rounded-full overflow-hidden bg-neutral-200 flex-shrink-0 flex items-center justify-center">
                  {hairdresserAvatar ? (
                    <Image src={hairdresserAvatar} alt={hairdresserName} fill className="object-cover" sizes="56px" />
                  ) : (
                    <span className="text-xl font-bold text-neutral-400">
                      {hairdresserName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold text-neutral-900 truncate">{hairdresserName}</p>
                  <p className="text-sm text-neutral-500 truncate">{appointment.service}</p>
                  {dateLabel && (
                    <p className="text-xs text-neutral-400 mt-0.5 capitalize">{dateLabel}</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Corps ── */}
            <div className="px-6 py-6 space-y-6">

              {/* Étoiles interactives */}
              <div className="flex flex-col items-center gap-3">
                <div
                  className="flex items-center gap-2"
                  onMouseLeave={() => setHovered(0)}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHovered(star)}
                      onClick={() => setRating(star)}
                      className="transition-transform active:scale-90 focus:outline-none"
                      aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
                    >
                      <Star
                        size={38}
                        className={`transition-all duration-150 ${
                          star <= displayRating
                            ? 'text-neutral-900 fill-neutral-900 scale-110'
                            : 'text-neutral-200 fill-neutral-100'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p
                  className={`text-sm font-semibold transition-all duration-200 min-h-[20px] ${
                    displayRating > 0 ? 'text-neutral-900 opacity-100' : 'opacity-0'
                  }`}
                >
                  {STAR_LABELS[displayRating] ?? ''}
                </p>
              </div>

              {/* Commentaire optionnel */}
              <div>
                <label className="block text-[11px] font-semibold tracking-[0.15em] uppercase text-neutral-400 mb-2">
                  Commentaire <span className="normal-case font-normal tracking-normal">(optionnel)</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Décrivez votre experience..."
                  rows={3}
                  maxLength={1000}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 resize-none focus:outline-none focus:border-neutral-400 transition-colors"
                />
              </div>

              {/* Erreur */}
              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                  {error}
                </p>
              )}

              {/* CTA */}
              <button
                onClick={handleSubmit}
                disabled={rating === 0 || submitting}
                className={`w-full py-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  rating === 0
                    ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                    : submitting
                    ? 'bg-neutral-700 text-white'
                    : 'bg-neutral-900 text-white hover:bg-neutral-700 active:scale-[0.98]'
                }`}
              >
                {submitting ? 'Publication...' : 'Publier mon avis'}
              </button>

              {hairdresserSlug && (
                <p className="text-center text-xs text-neutral-400">
                  Votre avis sera visible sur le profil de{' '}
                  <span className="font-medium text-neutral-600">{hairdresserName}</span>
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
