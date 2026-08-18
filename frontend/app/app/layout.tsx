'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import SplashScreen from '@/components/ui/SplashScreen';
import OnboardingCarousel, { type OnboardingSlide } from '@/components/ui/OnboardingCarousel';
import { Compass, Sparkles, ShieldCheck, Heart } from 'lucide-react';

const ONBOARDING_KEY = 'chair_client_onboarding_seen';

const SLIDES: OnboardingSlide[] = [
  { Icon: Compass,     title: 'Trouve le coiffeur qui te correspond.', body: 'Découvre des professionnels selon ton style, ta ville et tes besoins.' },
  { Icon: Sparkles,    title: 'Inspire-toi.',                          body: 'Parcours des réalisations, profils, spécialités et tendances.' },
  { Icon: ShieldCheck, title: 'Choisis en confiance.',                 body: 'Consulte les avis certifiés, portfolios et disponibilités.' },
  { Icon: Heart,       title: 'Garde tes favoris.',                    body: 'Enregistre les coiffeurs et réalisations que tu aimes.' },
];

const PUBLIC_PREFIXES = [
  '/app/coiffeur/',
  '/app/salon/',
  '/app/realisation/',
  '/app/avis/',
  '/app/scan/',
  // Suppression de compte doit rester atteignable depuis CHAIR PRO (gérant/coiffeur) —
  // pas de flow de suppression dédié côté pro, celui-ci est réutilisé tel quel
  // (page neutre sans AppShell depuis le fix retour de Julien — voir
  // app/app/compte/supprimer/page.tsx).
  '/app/compte/supprimer',
  // /app/classements retiré : a maintenant son propre équivalent /pro/classements
  // (retour de Julien — "Classement" depuis CHAIR PRO ouvrait l'interface CHAIR
  // sans changer d'appli). Un coiffeur/gérant qui atterrit ici est renvoyé
  // vers /pro comme n'importe quelle autre page CHAIR non publique.
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  // Onboarding première ouverture — jamais sur un lien profond partagé
  // (profil, avis, scan...), seulement sur l'entrée générale de l'app.
  const [showOnboarding, setShowOnboarding] = useState(
    () => !isPublic && typeof window !== 'undefined' && !localStorage.getItem(ONBOARDING_KEY)
  );
  function dismissOnboarding() {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setShowOnboarding(false);
  }

  useEffect(() => {
    if (isLoading || isPublic) return;
    if (user && (user.role === 'hairdresser' || user.role === 'salon_owner')) {
      router.replace('/pro');
    }
  }, [user, isLoading, router, isPublic]);

  // Splash toujours rendu en premier, avant tout check d'auth
  if (!isPublic) {
    if (isLoading) return <SplashScreen />;
    if (user && (user.role === 'hairdresser' || user.role === 'salon_owner')) return null;
  }

  if (showOnboarding) {
    return (
      <OnboardingCarousel
        slides={SLIDES}
        primaryLabel="Créer un compte"
        secondaryLabel="Se connecter"
        onPrimary={() => { dismissOnboarding(); router.push('/inscription'); }}
        onSecondary={() => { dismissOnboarding(); router.push('/connexion'); }}
        onSkip={dismissOnboarding}
      />
    );
  }

  return (
    <>
      <SplashScreen />
      {children}
    </>
  );
}
