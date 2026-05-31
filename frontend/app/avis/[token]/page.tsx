'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { appointments as apptApi } from '@/lib/api';
import { Star, CheckCircle2 } from 'lucide-react';

export default function AvisTokenPage() {
  const { token } = useParams<{ token: string }>();

  const [rating,  setRating]  = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [error,     setError]     = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { setError('Veuillez sélectionner une note.'); return; }
    setError('');
    setIsLoading(true);
    try {
      await apptApi.reviewByToken(token, { rating, comment: comment || undefined });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <AppShell>
        <div className="max-w-sm mx-auto px-4 py-20 text-center">
          <CheckCircle2 size={48} className="text-neutral-900 mx-auto mb-5" strokeWidth={1.5} />
          <h1 className="text-xl font-bold text-neutral-900 mb-2">Avis publié</h1>
          <p className="text-sm text-neutral-500 leading-relaxed mb-8">
            Merci pour votre avis certifié. Il est maintenant visible sur le profil du coiffeur.
          </p>
          <a href="/" className="inline-flex items-center gap-2 bg-neutral-900 text-white font-semibold px-6 py-3 rounded-xl text-sm hover:bg-neutral-700 transition-colors">
            Retour à l'accueil
          </a>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-sm mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-neutral-400 mb-2">Avis certifié</p>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Votre expérience</h1>
          <p className="text-sm text-neutral-500 leading-relaxed">
            Partagez votre avis suite à votre rendez-vous. Il sera publié comme avis vérifié.
          </p>
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Étoiles */}
          <div className="text-center">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400 mb-4">Votre note</p>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={36}
                    strokeWidth={1.5}
                    className={
                      star <= (hovered || rating)
                        ? 'text-neutral-900 fill-neutral-900'
                        : 'text-neutral-300'
                    }
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-xs text-neutral-500 mt-2">
                {['', 'Décevant', 'Moyen', 'Bien', 'Très bien', 'Excellent'][rating]}
              </p>
            )}
          </div>

          {/* Commentaire */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Commentaire <span className="font-normal text-neutral-400">(optionnel)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Décrivez votre expérience, la qualité du travail, l'accueil..."
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-400 focus:bg-white transition-all resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || rating === 0}
            className="w-full bg-neutral-900 text-white font-semibold py-3.5 rounded-xl text-sm hover:bg-neutral-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Publication...' : 'Publier mon avis'}
          </button>

          <p className="text-[11px] text-neutral-400 text-center">
            Cet avis est lié à votre rendez-vous et sera marqué comme "Vérifié".
          </p>
        </form>
      </div>
    </AppShell>
  );
}
