'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ChairLogo from '@/components/ui/ChairLogo';

export default function ProConnexionPage() {
  const { login } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
