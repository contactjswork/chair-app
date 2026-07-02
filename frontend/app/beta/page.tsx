'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function BetaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Déjà authentifié → redirect
    if (document.cookie.includes('chair_beta=1')) {
      const from = searchParams.get('from') ?? '/';
      router.replace(from);
    }
  }, [router, searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const res = await fetch('/api/beta-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      const from = searchParams.get('from') ?? '/';
      router.replace(from);
    } else {
      setError(true);
      setPassword('');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="text-white font-bold text-[22px] tracking-tight mb-2">CHAIR</p>
          <p className="text-white/30 text-[14px]">Accès privé — bêta fermée</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            autoFocus
            className={`w-full px-4 py-4 bg-white/[0.06] border rounded-2xl text-white text-[15px] placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors ${
              error ? 'border-red-500/60' : 'border-white/10'
            }`}
          />
          {error && (
            <p className="text-[12px] text-red-400 text-center">Mot de passe incorrect</p>
          )}
          <button
            type="submit"
            disabled={!password || loading}
            className="w-full py-4 bg-white text-neutral-900 font-bold text-[15px] rounded-2xl hover:bg-neutral-100 transition-all disabled:opacity-30"
          >
            {loading ? 'Vérification…' : 'Accéder'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function BetaPage() {
  return (
    <Suspense>
      <BetaContent />
    </Suspense>
  );
}
