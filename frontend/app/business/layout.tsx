import type { Metadata } from 'next';

// CHAIR BUSINESS — l'espace gérant comme app à part entière (3e binaire,
// décision Julien 02/09/2026). V1 : /business est la porte d'entrée du
// binaire app.getchair.business et réutilise les écrans gérant existants
// (/pro/salon, /pro/equipe, /pro/recrutement, /pro/fauteuils…) — un seul
// code, trois vitrines. Les écrans migreront sous /business au fur et à
// mesure que l'app prendra sa propre identité visuelle.
export const metadata: Metadata = {
  title: 'CHAIR BUSINESS — Gérez votre salon',
  description:
    'Salon, équipe, location de fauteuil, recrutement : l’espace des gérants CHAIR.',
};

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
