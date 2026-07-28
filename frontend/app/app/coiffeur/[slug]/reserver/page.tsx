import { redirect } from 'next/navigation';

// Cette page pleine-écran a été remplacée par BookingSheet (bottom sheet),
// utilisée directement depuis la fiche coiffeur (BookingCTA, PublicProfileServices)
// — plus aucun lien de l'app ne pointe ici (audit visuel du 2026-07-29, grade
// D : mise en page datée, jamais migrée, accents français cassés). Gardée en
// simple redirection plutôt que supprimée, au cas où un lien externe/historique
// pointerait encore vers cette URL.
export default async function ReserverPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/app/coiffeur/${slug}`);
}
