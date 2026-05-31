'use client';

import { useState } from 'react';
import { Star, Send, Loader } from 'lucide-react';
import { getStoredToken, getStoredUser } from '@/lib/auth';

interface Props {
  hairdresserId: number;
  hairdresserUserId: number;
  onSuccess: (review: ReviewData) => void;
}

export interface ReviewData {
  id: number;
  rating: number;
  comment: string;
  is_verified: boolean;
  specialty: string | null;
  created_at: string;
  client: { id: number; name: string };
}

export default function ReviewForm({ hairdresserId, hairdresserUserId, onSuccess }: Props) {
  const user = getStoredUser();
  const token = getStoredToken();

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Ne pas afficher si pas connecté, si coiffeur, ou si c'est son propre profil
  if (!user || !token) return null;
  if (user.role === 'hairdresser') return null;
  if (user.id === hairdresserUserId) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { setError('Choisissez une note.'); return; }
    if (comment.trim().length < 10) { setError('Le commentaire doit faire au moins 10 caractères.'); return; }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`http://localhost:8000/api/hairdressers/${hairdresserId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: JSON.stringify({ rating, comment: comment.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Erreur ${res.status}`);

      onSuccess(data as ReviewData);
      setRating(0);
      setComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  const display = hovered || rating;

  return (
    <form onSubmit={handleSubmit} className="bg-neutral-50 rounded-2xl p-4 border border-neutral-100">
      <p className="text-sm font-semibold text-neutral-900 mb-3">Laisser un avis</p>

      {/* Étoiles */}
      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="p-0.5"
          >
            <Star
              size={22}
              className={`transition-colors ${star <= display ? 'fill-neutral-900 text-neutral-900' : 'text-neutral-300'}`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-xs text-neutral-500">
            {['', 'Mauvais', 'Passable', 'Bien', 'Très bien', 'Excellent'][rating]}
          </span>
        )}
      </div>

      {/* Commentaire */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Décrivez votre expérience..."
        rows={3}
        maxLength={1000}
        className="w-full px-3 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 resize-none mb-3"
      />

      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      <button
        type="submit"
        disabled={submitting || rating === 0}
        className="flex items-center gap-2 bg-neutral-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-50"
      >
        {submitting ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
        {submitting ? 'Envoi...' : 'Publier'}
      </button>
    </form>
  );
}
