import type { Metadata } from 'next';
import BusinessShell from '@/components/business/BusinessShell';

// CHAIR BUSINESS — l'espace gérant comme app à part entière (3e binaire,
// décision Julien 02/09/2026). Ce layout serveur porte les métadonnées ;
// toute la coquille (gardes, wordmark, navigation, gate binaire PRO) vit
// dans BusinessShell (client). Les écrans réutilisent les pages gérant
// existantes via ré-export (/business/salon → /pro/salon, etc.) — un seul
// code, l'identité BUSINESS par-dessus.
export const metadata: Metadata = {
  title: 'CHAIR BUSINESS — Gérez votre salon',
  description:
    'Salon, équipe, location de fauteuil, recrutement : l’espace des gérants CHAIR.',
};

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return <BusinessShell>{children}</BusinessShell>;
}
