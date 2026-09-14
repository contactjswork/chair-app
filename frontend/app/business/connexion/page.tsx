'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isClientBinary, isProBinary, WRONG_APP_MSG_KEY } from '@/lib/appContext';
import { PRO_APP_STORE_URL } from '@/lib/appDownload';
import ChairLogo from '@/components/ui/ChairLogo';
import AppBridgeCard from '@/components/auth/AppBridgeCard';
import { Eye, EyeOff, Scissors, BadgeCheck } from 'lucide-react';

// ── Connexion CHAIR BUSINESS — même squelette clair que /connexion et ─────
// /pro/connexion (un seul langage d'entrée pour les trois apps, retour
// Julien 09/09/2026).
//
// Pas de compte « BUSINESS » séparé : un gérant se connecte AVEC son compte
// CHAIR PRO (mêmes identifiants, un seul compte professionnel pour les deux
// apps) — l'écran le dit explicitement. Et le pont inverse : un coiffeur
// arrivé ici par erreur est mené vers CHAIR PRO.

export default function BusinessConnexionPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Message du verrou binaire ↔ rôle (compte client ou coiffeur sans salon
  // évincé de l'app BUSINESS) — posé en sessionStorage par AuthContext.
  const [wrongAppMsg, setWrongAppMsg] = useState('');

  // Chaque app n'expose que son propre écran d'entrée : dans le binaire
  // CLIENT ou PRO, la connexion BUSINESS n'existe pas.
  useEffect(() => {
    if (isClientBinary()) { router.replace('/connexion'); return; }
    if (isProBinary()) router.replace('/pro/connexion');
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      // AuthContext redirige vers /business via redirectPathForRole
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identifiants invalides');
    } finally {
      setIsLoading(false);
    }
  }

  const inputCls = 'w-full px-4 py-3.5 bg-neutral-50 rounded-xl text-[16px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-neutral-300 transition-all';

  return (
    <div className="min-h-[100svh] bg-white flex flex-col items-center justify-center px-5 py-10 pt-safe">
      <div className="w-full max-w-[360px] flex flex-col gap-8">

        {/* Logo */}
        <div className="text-center">
          <ChairLogo href="/business" size="lg" business />
          <p className="text-[14px] text-neutral-400 mt-1.5">L&apos;app des gérants de salon.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Un seul compte pro pour CHAIR PRO et CHAIR BUSINESS — dit ICI,
              avant les champs, pour qu'un gérant venu de CHAIR PRO n'hésite
              pas une seconde sur « quel compte » utiliser. */}
          <div className="flex items-start gap-2.5 px-4 py-3 bg-neutral-50 ring-1 ring-neutral-100 rounded-xl">
            <BadgeCheck size={15} className="text-neutral-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
            <p className="text-[12.5px] text-neutral-600 leading-snug">
              Vous avez déjà un compte <span className="font-semibold text-neutral-900">CHAIR PRO</span> ?
              Continuez avec les mêmes identifiants — c&apos;est le même compte.
            </p>
          </div>

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
          Pas encore de compte ?{' '}
          <Link href="/pro/inscription?role=gerant" className="font-semibold text-neutral-900 hover:underline">Créer mon compte gérant</Link>
        </p>

        {/* Pont inverse : le coiffeur qui veut mettre en avant son activité. */}
        <AppBridgeCard
          icon={Scissors}
          title="Vous êtes coiffeur ?"
          subtitle="Profil, réalisations, avis, agenda : mettez en avant votre activité avec CHAIR PRO."
          storeUrl={PRO_APP_STORE_URL}
          externalUrl="https://getchair.app/pro"
          internalPath="/pro/connexion"
        />
      </div>
    </div>
  );
}
