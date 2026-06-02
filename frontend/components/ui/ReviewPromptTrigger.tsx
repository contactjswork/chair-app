'use client';

/**
 * ReviewPromptTrigger
 * -------------------
 * Monté dans AppShell (visible sur toutes les pages).
 * Quand un client connecté a un rendez-vous terminé sans avis,
 * affiche automatiquement la popup ReviewPromptModal.
 *
 * Logique de re-déclenchement :
 *   - Si le client ferme sans noter : réapparaît au prochain chargement
 *     (pas de délai) sauf si dismissed dans les 4 dernières heures.
 *   - Si l'avis est soumis : le RDV est retiré de la file pour toujours.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { appointments as apptApi } from '@/lib/api';
import type { ApiAppointment } from '@/lib/types';
import ReviewPromptModal from '@/components/ui/ReviewPromptModal';

const DISMISS_KEY = (id: number) => `chair_review_dismissed_${id}`;
const DISMISS_TTL_MS = 4 * 60 * 60 * 1000; // 4 heures

function isDismissedRecently(appointmentId: number): boolean {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem(DISMISS_KEY(appointmentId));
  if (!raw) return false;
  const ts = parseInt(raw, 10);
  return Date.now() - ts < DISMISS_TTL_MS;
}

function recordDismissal(appointmentId: number) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DISMISS_KEY(appointmentId), String(Date.now()));
  }
}

function clearDismissal(appointmentId: number) {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DISMISS_KEY(appointmentId));
  }
}

export default function ReviewPromptTrigger() {
  const { user, isLoading } = useAuth();
  const [pending, setPending] = useState<ApiAppointment[]>([]);
  const [current, setCurrent] = useState<ApiAppointment | null>(null);

  // Charger les RDVs terminés sans avis dès que l'utilisateur est connu
  useEffect(() => {
    if (isLoading || !user || user.role !== 'client') return;

    apptApi.myList()
      .then((data) => {
        const appts = data as ApiAppointment[];
        const reviewable = appts.filter(
          (a) => a.status === 'completed' && !a.review
        );
        setPending(reviewable);
      })
      .catch(() => {});
  }, [user, isLoading]);

  // Dès que la liste est prête, afficher la première non dismissée récemment
  useEffect(() => {
    if (pending.length === 0) return;
    const next = pending.find((a) => !isDismissedRecently(a.id));
    if (next) setCurrent(next);
  }, [pending]);

  const handleClose = () => {
    if (current) recordDismissal(current.id);
    setCurrent(null);
    // Passer au suivant s'il y en a un autre
    const remaining = pending.filter(
      (a) => a.id !== current?.id && !isDismissedRecently(a.id)
    );
    if (remaining.length > 0) {
      setTimeout(() => setCurrent(remaining[0]), 400);
    }
  };

  const handleSubmitted = (appointmentId: number) => {
    clearDismissal(appointmentId);
    setCurrent(null);
    setPending((prev) => prev.filter((a) => a.id !== appointmentId));
  };

  if (!current) return null;

  return (
    <ReviewPromptModal
      appointment={current}
      onClose={handleClose}
      onSubmitted={handleSubmitted}
    />
  );
}
