'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, CheckCircle } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

export default function MotDePasseOubliePage() {
  const [email,     setEmail]     = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent,      setSent]      = useState(false);
  const [error,     setError]     = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await fetch(`${API}/forgot-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body:    JSON.stringify({ email }),
      });
      setSent(true);
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

        {!sent ? (
          <>
            <div className="text-center">
              <h1 className="text-[20px] font-bold text-neutral-900">Mot de passe oublié</h1>
              <p className="text-[14px] text-neutral-400 mt-2 leading-relaxed">
                Renseigne ton adresse e-mail et on t'envoie un lien pour réinitialiser ton mot de passe.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
                className="w-full px-4 py-3.5 bg-neutral-50 rounded-xl text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-neutral-300 transition-all"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-neutral-900 text-white font-semibold py-3.5 rounded-xl text-[14px] hover:bg-neutral-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Envoi…' : 'Envoyer le lien'}
              </button>
            </form>

            <Link href="/connexion" className="flex items-center justify-center gap-1.5 text-[13px] text-neutral-400 hover:text-neutral-700 transition-colors">
              <ArrowLeft size={14} />
              Retour à la connexion
            </Link>
          </>
        ) : (
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-neutral-900 flex items-center justify-center">
              <CheckCircle size={26} className="text-white" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-neutral-900">E-mail envoyé</h2>
              <p className="text-[14px] text-neutral-400 mt-2 leading-relaxed max-w-[280px]">
                Si <strong className="text-neutral-700">{email}</strong> est associé à un compte, tu recevras un lien dans quelques minutes.
              </p>
              <p className="text-[12px] text-neutral-400 mt-2">Pense à vérifier tes spams.</p>
            </div>
            <Link
              href="/connexion"
              className="mt-2 text-[14px] font-semibold text-neutral-900 hover:underline"
            >
              Retour à la connexion
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
