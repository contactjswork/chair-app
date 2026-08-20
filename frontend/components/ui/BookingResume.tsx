'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { readBookingIntent, clearBookingIntent, type BookingIntent } from '@/lib/bookingIntent';
import BookingSheet from './BookingSheet';

interface Props {
  slug: string;
}

/**
 * Reprise de réservation après connexion/inscription.
 *
 * Monté sur la fiche coiffeur (indépendants uniquement) : si un
 * bookingIntent frais existe pour CE coiffeur et que l'utilisateur est
 * maintenant connecté, rouvre automatiquement la feuille de réservation à
 * l'étape la plus avancée possible (prestation présélectionnée, date et
 * créneau restaurés si toujours disponibles — BookingSheet gère lui-même le
 * créneau parti entre-temps avec un message doux).
 *
 * Garde-fous :
 * - ne navigue jamais : il ne fait que rouvrir la sheet quand on est déjà
 *   sur la fiche — aucune boucle de redirection possible ;
 * - l'intent est consommé dès la reprise : fermer la feuille ne la fera pas
 *   réapparaître, et un refresh non plus ;
 * - visiteur revenu sans se connecter (retour arrière volontaire) : rien ne
 *   se passe, l'intent expirera silencieusement (60 min, voir bookingIntent.ts).
 */
export default function BookingResume({ slug }: Props) {
  const { user, isLoading } = useAuth();
  const [intent, setIntent] = useState<BookingIntent | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Attendre la fin de l'hydratation de la session : au premier rendu
    // après le retour de /connexion, `user` peut être encore null.
    if (isLoading || !user) return;
    const pending = readBookingIntent(slug);
    if (!pending) return;
    clearBookingIntent(); // consommé : ne doit jamais se rejouer
    // Lecture d'un système externe (sessionStorage) possible uniquement
    // côté client après montage — même dérogation que connexion/page.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIntent(pending);
    setOpen(true);
  }, [isLoading, user, slug]);

  if (!intent) return null;

  return (
    <BookingSheet
      slug={slug}
      open={open}
      onClose={() => setOpen(false)}
      initialCategoryId={intent.categoryId}
      initialServiceId={intent.serviceId}
      initialDate={intent.date}
      initialTime={intent.time}
    />
  );
}
