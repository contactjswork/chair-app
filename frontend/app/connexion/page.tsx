'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { safeInternalPath } from '@/lib/auth';


function ConnexionContent() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionExpired, setSessionExpired] = useState(false);

  // Reprise de parcours (ex: réservation interrompue par l'auth) : on revient
  // là d'où l'utilisateur a été interrompu plutôt que sur l'accueil de son
  // rôle. Uniquement un chemin interne — une URL externe est ignorée.
  const returnTo = safeInternalPath(searchParams.get('returnTo'));

  useEffect(() => {
    // Le flag survit même si une garde de page a remplacé l'URL avant
    // d'arriver ici (voir AuthContext) — la query ?expired= seule n'est pas fiable.
    if (searchParams.get('expired') === '1' || sessionStorage.getItem('chair_session_expired') === '1') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSessionExpired(true);
      sessionStorage.removeItem('chair_session_expired');
    }
  }, [searchParams]);

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/app');
    }
  }
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [showPwd,   setShowPwd]   = useState(false);
  const [error,     setError]     = useState('');
  const [isLoading, setIsLoading] = useState(false);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password, { returnTo });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identifiants invalides');
    } finally {
      setIsLoading(false);
    }
  }

  const inputCls = 'w-full px-4 py-3.5 bg-neutral-50 rounded-xl text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-neutral-300 transition-all';

  return (
    <div className="min-h-[100svh] bg-white flex flex-col items-center justify-center px-5 py-10">
      <button
        onClick={handleBack}
        aria-label="Retour"
        className="fixed left-4 top-safe mt-2 w-9 h-9 flex items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 transition-colors z-10"
      >
        <ArrowLeft size={19} strokeWidth={1.75} />
      </button>

      <div className="w-full max-w-[360px] flex flex-col gap-8">

        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="text-[28px] font-bold tracking-tight text-neutral-900">CHAIR</Link>
          <p className="text-[14px] text-neutral-400 mt-1.5">Content de te revoir.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {sessionExpired && !error && (
            <div className="px-4 py-3 bg-amber-50 rounded-xl text-[13px] text-amber-700">
              Ta session a expiré, reconnecte-toi pour continuer.
            </div>
          )}
          {error && (
            <div className="px-4 py-3 bg-red-50 rounded-xl text-[13px] text-red-600">
              {error}
            </div>
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
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          <div className="text-right -mt-1">
            <Link href="/mot-de-passe-oublie" className="text-[12px] text-neutral-400 hover:text-neutral-700 transition-colors">
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

        {/* Footer */}
        <p className="text-center text-[13px] text-neutral-400">
          Pas encore de compte ?{' '}
          {/* Le returnTo suit vers l'inscription : celui qui découvre ici
              qu'il n'a pas de compte ne doit pas perdre sa reprise de parcours. */}
          <Link
            href={returnTo ? `/inscription?returnTo=${encodeURIComponent(returnTo)}` : '/inscription'}
            className="font-semibold text-neutral-900 hover:underline"
          >
            Créer un compte
          </Link>
        </p>

      </div>
    </div>
  );
}

export default function ConnexionPage() {
  return (
    <Suspense fallback={null}>
      <ConnexionContent />
    </Suspense>
  );
}
