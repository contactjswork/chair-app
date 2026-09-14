'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isBusinessBinary, isClientBinary, useAppContext, WRONG_APP_MSG_KEY } from '@/lib/appContext';
import { BUSINESS_APP_STORE_URL } from '@/lib/appDownload';
import ChairLogo from '@/components/ui/ChairLogo';
import AppBridgeCard from '@/components/auth/AppBridgeCard';
import OnboardingCarousel, { type OnboardingSlide } from '@/components/ui/OnboardingCarousel';
import { TrendingUp, Award, CalendarClock, Briefcase, Building2, Eye, EyeOff } from 'lucide-react';

const ONBOARDING_KEY = 'chair_pro_onboarding_seen';

const SLIDES: OnboardingSlide[] = [
  { Icon: TrendingUp,   title: 'Fais connaître ton talent.',           body: "CHAIR PRO aide les coiffeurs à gagner en visibilité et à développer leur clientèle." },
  { Icon: Award,        title: 'Construis ta réputation.',              body: 'Portfolio, avis vérifiés, spécialités, badges et classements.' },
  { Icon: CalendarClock,title: 'Gère ton activité.',                    body: 'Agenda, performances, profil, demandes et outils professionnels.' },
  { Icon: Briefcase,    title: 'Trouve de nouvelles opportunités.',     body: 'Location de fauteuil, recrutement et réseau professionnel.' },
];

// ── Connexion CHAIR PRO — même squelette clair que la connexion client ────
//
// Retour Julien 09/09/2026 : les écrans d'entrée des trois apps étaient
// « brouillon » (le PRO en carte sombre, le client en clair, BUSINESS sans
// écran du tout). Un seul langage désormais : fond blanc, champs neutral-50,
// CTA noir — la DA de la famille, identique à /connexion et
// /business/connexion. Et un PONT : le gérant qui a installé CHAIR PRO par
// erreur est mené vers CHAIR BUSINESS dès cet écran.

export default function ProConnexionPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Toujours false au premier rendu (identique au serveur) — la vraie valeur
  // n'est calculée qu'après montage (lecture localStorage impossible en SSR).
  const [showOnboarding, setShowOnboarding] = useState(false);
  // Rendu-sûr à l'hydratation (contrairement à un appel direct isProBinary()
  // pendant le rendu, qui divergerait entre serveur et navigateur).
  const { context: appContext } = useAppContext();
  // Message du verrou binaire ↔ rôle (compte client évincé de l'app PRO) —
  // posé en sessionStorage par AuthContext juste avant la redirection ici.
  const [wrongAppMsg, setWrongAppMsg] = useState('');

  // Chaque app n'expose que son propre écran d'entrée (décision Julien
  // 01/09/2026) : dans le binaire CLIENT comme dans le binaire BUSINESS, la
  // connexion PRO n'existe pas.
  useEffect(() => {
    if (isClientBinary()) { router.replace('/connexion'); return; }
    if (isBusinessBinary()) router.replace('/business/connexion');
  }, [router]);

  useEffect(() => {
    try {
      const msg = sessionStorage.getItem(WRONG_APP_MSG_KEY);
      if (msg) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setWrongAppMsg(msg);
        sessionStorage.removeItem(WRONG_APP_MSG_KEY);
      }
    } catch { /* stockage indisponible : pas de message, l'écran reste utilisable */ }
  }, []);

  useEffect(() => {
    // Lecture localStorage impossible côté serveur — ne peut arriver qu'après
    // montage, une seule fois (deps []), même pattern que le reste de la home
    // (voir HomePersonalized.tsx, SpecialtyQuickLinks.tsx).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!localStorage.getItem(ONBOARDING_KEY)) setShowOnboarding(true);
  }, []);

  function dismissOnboarding() {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setShowOnboarding(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      // AuthContext redirige vers /pro via redirectPathForRole
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identifiants invalides');
    } finally {
      setIsLoading(false);
    }
  }

  if (showOnboarding) {
    return (
      <OnboardingCarousel
        slides={SLIDES}
        dark
        primaryLabel="Créer mon profil"
        secondaryLabel="J'ai déjà un compte — Se connecter"
        onPrimary={() => { dismissOnboarding(); router.push('/pro/inscription'); }}
        onSecondary={dismissOnboarding}
        onSkip={dismissOnboarding}
      />
    );
  }

  const inputCls = 'w-full px-4 py-3.5 bg-neutral-50 rounded-xl text-[16px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-neutral-300 transition-all';

  return (
    <div className="min-h-[100svh] bg-white flex flex-col items-center justify-center px-5 py-10 pt-safe">
      <div className="w-full max-w-[360px] flex flex-col gap-8">

        {/* Logo */}
        <div className="text-center">
          <ChairLogo href="/pro" size="lg" pro />
          <p className="text-[14px] text-neutral-400 mt-1.5">L&apos;app des coiffeurs professionnels.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {wrongAppMsg && !error && (
            <div className="px-4 py-3 bg-amber-50 rounded-xl text-[13px] text-amber-700">{wrongAppMsg}</div>
          )}
          {error && (
            <div className="px-4 py-3 bg-red-50 rounded-xl text-[13px] text-red-600">{error}</div>
          )}

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Adresse e-mail"
            required
            autoComplete="email"
            className={inputCls}
          />

          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              required
              autoComplete="current-password"
              className={`${inputCls} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          <div className="text-right -mt-1">
            <Link href="/mot-de-passe-oublie" className="inline-flex items-center min-h-[44px] text-[12px] text-neutral-400 hover:text-neutral-700 transition-colors">
              Mot de passe oublié ?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-neutral-900 text-white font-semibold py-3.5 rounded-xl text-[14px] hover:bg-neutral-700 active:bg-black transition-colors disabled:opacity-50 mt-1"
          >
            {isLoading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-[13px] text-neutral-400 -mt-2">
          Pas encore de compte pro ?{' '}
          <Link href="/pro/inscription" className="font-semibold text-neutral-900 hover:underline">Créer mon espace pro</Link>
        </p>

        {/* Pont gérant → CHAIR BUSINESS (un seul compte pro pour les deux apps). */}
        <AppBridgeCard
          icon={Building2}
          title="Vous êtes gérant de salon ?"
          subtitle="Salon, équipe, fauteuils, recrutement : tout se passe sur CHAIR BUSINESS — avec ce même compte."
          storeUrl={BUSINESS_APP_STORE_URL}
          externalUrl="https://getchair.app/business"
          internalPath="/business/connexion"
        />

        {/* Dans le binaire PRO, aucun pont vers l'espace client : le verrou
            binaire ↔ rôle refuserait de toute façon la connexion au bout. */}
        {appContext !== 'pro' && (
          <p className="text-center text-[13px] text-neutral-400 -mt-3">
            Vous êtes client ?{' '}
            <Link href="/connexion" className="text-neutral-500 hover:text-neutral-800 hover:underline">Connexion CHAIR</Link>
          </p>
        )}
      </div>
    </div>
  );
}
