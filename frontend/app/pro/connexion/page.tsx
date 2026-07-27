'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ChairLogo from '@/components/ui/ChairLogo';
import OnboardingCarousel, { type OnboardingSlide } from '@/components/ui/OnboardingCarousel';
import { TrendingUp, Award, CalendarClock, Briefcase } from 'lucide-react';

const ONBOARDING_KEY = 'chair_pro_onboarding_seen';

const SLIDES: OnboardingSlide[] = [
  { Icon: TrendingUp,   title: 'Fais connaître ton talent.',           body: "CHAIR PRO aide les coiffeurs à gagner en visibilité et à développer leur clientèle." },
  { Icon: Award,        title: 'Construis ta réputation.',              body: 'Portfolio, avis certifiés, spécialités, badges et classements.' },
  { Icon: CalendarClock,title: 'Gère ton activité.',                    body: 'Agenda, performances, profil, demandes et outils professionnels.' },
  { Icon: Briefcase,    title: 'Trouve de nouvelles opportunités.',     body: 'Location de fauteuil, recrutement et réseau professionnel.' },
];

export default function ProConnexionPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => typeof window !== 'undefined' && !localStorage.getItem(ONBOARDING_KEY));

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

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center px-4 py-10 pt-safe">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <ChairLogo href="/pro" size="md" pro dark />
          <p className="text-sm text-neutral-400 mt-2">Connectez-vous à votre espace professionnel</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 mb-4">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-900/40 border border-red-800 rounded-xl text-sm text-red-400">{error}</div>
          )}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.fr" required
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Mot de passe</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition-all" />
            </div>
            <button type="submit" disabled={isLoading}
              className="w-full bg-white text-neutral-900 font-semibold py-3 rounded-xl hover:bg-neutral-100 transition-colors text-sm mt-2 disabled:opacity-50">
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-neutral-500">
          Pas encore de compte pro ?{' '}
          <Link href="/pro/inscription" className="font-semibold text-white hover:underline">Créer mon espace pro</Link>
        </p>
        <p className="text-center text-sm text-neutral-600 mt-3">
          Vous êtes client ?{' '}
          <Link href="/connexion" className="text-neutral-500 hover:text-neutral-300 hover:underline">Connexion client</Link>
        </p>
      </div>
    </div>
  );
}
