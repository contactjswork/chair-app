'use client';

import { useAuth } from '@/contexts/AuthContext';

/**
 * Accroche personnelle en tête de home — remplace le simple bandeau
 * recherche nu qui ouvrait la page (retour de Julien : "le hook app est vrm
 * moche"). Rien d'inventé : juste le prénom réel du compte connecté, ou une
 * accroche générique honnête pour un visiteur/chargement.
 */
export default function HomeGreeting() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-7 w-40 bg-neutral-100 rounded-full animate-pulse mb-3" />;
  }

  const firstName = user?.name?.split(' ')[0];

  return (
    <h1 className="text-[24px] font-bold text-neutral-900 tracking-[-0.02em] leading-tight mb-3">
      {firstName ? <>Bonjour {firstName} <span aria-hidden>👋</span></> : 'Trouvez votre coiffeur.'}
    </h1>
  );
}
