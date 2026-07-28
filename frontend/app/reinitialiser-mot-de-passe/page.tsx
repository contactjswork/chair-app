'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const linkInvalid = !token || !email;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== passwordConfirmation) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ token, email, password, password_confirmation: passwordConfirmation }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? 'Lien invalide ou expiré. Demande un nouveau lien.');
        return;
      }
      setDone(true);
    } catch {
      setError('Une erreur est survenue. Réessaie.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-[100svh] bg-white flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-[360px] flex flex-col gap-8">
        <div className="text-center">
          <Link href="/" className="text-[28px] font-bold tracking-tight text-neutral-900">CHAIR</Link>
        </div>

        {done ? (
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-neutral-900 flex items-center justify-center">
              <CheckCircle size={26} className="text-white" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-neutral-900">Mot de passe mis à jour</h2>
              <p className="text-[14px] text-neutral-400 mt-2 leading-relaxed max-w-[280px]">
                Tu peux maintenant te connecter avec ton nouveau mot de passe.
              </p>
            </div>
            <Link href="/connexion" className="mt-2 text-[14px] font-semibold text-neutral-900 hover:underline">
              Se connecter
            </Link>
          </div>
        ) : linkInvalid ? (
          <div className="flex flex-col items-center text-center gap-4">
            <div>
              <h2 className="text-[18px] font-bold text-neutral-900">Lien invalide</h2>
              <p className="text-[14px] text-neutral-400 mt-2 leading-relaxed max-w-[280px]">
                Ce lien de réinitialisation est incomplet ou a expiré. Demande-en un nouveau.
              </p>
            </div>
            <Link href="/mot-de-passe-oublie" className="mt-2 text-[14px] font-semibold text-neutral-900 hover:underline">
              Nouveau lien
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center">
              <h1 className="text-[20px] font-bold text-neutral-900">Nouveau mot de passe</h1>
              <p className="text-[14px] text-neutral-400 mt-2 leading-relaxed">
                Choisis un nouveau mot de passe pour {email}.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {error && (
                <div className="px-4 py-3 bg-red-50 rounded-xl text-[13px] text-red-600">{error}</div>
              )}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nouveau mot de passe (8 caractères min.)"
                required
                autoComplete="new-password"
                className="w-full px-4 py-3.5 bg-neutral-50 rounded-xl text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-neutral-300 transition-all"
              />
              <input
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                placeholder="Confirme le mot de passe"
                required
                autoComplete="new-password"
                className="w-full px-4 py-3.5 bg-neutral-50 rounded-xl text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-neutral-300 transition-all"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-neutral-900 text-white font-semibold py-3.5 rounded-xl text-[14px] hover:bg-neutral-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Mise à jour…' : 'Réinitialiser le mot de passe'}
              </button>
            </form>

            <Link href="/connexion" className="flex items-center justify-center gap-1.5 text-[13px] text-neutral-400 hover:text-neutral-700 transition-colors">
              <ArrowLeft size={14} />
              Retour à la connexion
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function ReinitialiserMotDePassePage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
