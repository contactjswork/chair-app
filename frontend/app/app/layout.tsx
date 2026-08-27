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
  '/app/classements',
  // Suppression de compte doit rester atteignable depuis CHAIR PRO (gérant/coiffeur) —
  // pas de flow de suppression dédié côté pro, celui-ci est réutilisé tel quel.
  '/app/compte/supprimer',
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  // Onboarding première ouverture — jamais sur un lien profond partagé
  // (profil, avis, scan...), seulement sur l'entrée générale de l'app.
  // Lu dans un effet, JAMAIS à l'initialisation de l'état : localStorage
  // n'existe pas côté serveur, qui rendait donc `false` pendant que le
  // navigateur rendait `true` — et cette divergence-là remplace la page
  // entière par le carrousel. React abandonne l'hydratation et la barrière
  // d'erreur prend le relais : écran « Quelque chose s'est mal passé » au
  // chargement, page fonctionnelle après un clic sur « Réessayer ».
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (isPublic) return;
    try {
      // Double rendu volontaire : premier rendu identique au serveur, puis
      // application de la valeur qui n'existe que dans le navigateur.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!localStorage.getItem(ONBOARDING_KEY)) setShowOnboarding(true);
    } catch {
      // Stockage indisponible (navigation privée verrouillée) : on n'affiche
      // pas l'onboarding plutôt que de le réafficher à chaque ouverture.
    }
  }, [isPublic]);
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

  // Le splash reste monté au MÊME endroit de l'arbre quel que soit l'état
  // ci-dessous. C'est essentiel : quand il changeait de position — seul
  // pendant le chargement de l'auth, puis dans un fragment avec les enfants —
  // React démontait l'instance et en remontait une neuve, et l'animation
  // repartait de zéro au moment précis où l'authentification se résolvait.
  // Seul le contenu DERRIÈRE lui change désormais.
  let content: React.ReactNode = children;

  if (!isPublic && (isLoading || (user && (user.role === 'hairdresser' || user.role === 'salon_owner')))) {
    // Auth en cours, ou compte pro en train d'être redirigé vers /pro :
    // rien à afficher derrière le splash.
    content = null;
  } else if (showOnboarding) {
    content = (
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
      {content}
    </>
  );
}
