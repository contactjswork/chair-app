import ReferralLanding from '@/components/referral/ReferralLanding';

interface Props {
  params: Promise<{ code: string }>;
}

// Page publique — c'est le lien renvoyé par GET /my-referral
// ({FRONTEND_URL}/parrainage/{code}) et partagé partout dans l'app (dashboard
// Parrainage, ShareSheet). Elle n'existait pas du tout avant (retour de
// Julien : "j'ouvre mon lien, erreur 404") — tout visiteur qui cliquait un
// lien de parrainage tombait sur le 404 générique de Next.js.
export default async function ParrainagePage({ params }: Props) {
  const { code } = await params;
  return <ReferralLanding code={code} />;
}
