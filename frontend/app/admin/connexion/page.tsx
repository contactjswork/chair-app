'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { apiEnvironment, setAdminSession } from '@/lib/adminApi';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

/**
 * Login admin réel — compte nommé (email + mot de passe PAR PERSONNE) via
 * Sanctum côté Laravel (POST /admin/auth/login). Remplace l'ancien flow qui
 * comparait à ADMIN_EMAIL/ADMIN_PASSWORD (variables d'env partagées, avec
 * des valeurs par défaut en clair dans le code) puis posait un jeton
 * CODÉ EN DUR ('chair_admin_secret_2026') dans localStorage — exactement
 * la valeur que le backend rejette désormais explicitement comme non
 * sécurisée. Voir App\Http\Controllers\Api\AdminAuthController.
 */
export default function AdminConnexionPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message ?? 'Identifiants invalides');
      }

      // Jeton Sanctum réel, propre à CE compte — plus de secret partagé.
      setAdminSession(data.token, data.user);

      // Pose le cookie httpOnly marqueur que proxy.ts vérifie pour laisser
      // passer /admin/* — sans ça, proxy.ts renvoie systématiquement vers
      // /admin/connexion même avec un jeton Sanctum valide en localStorage
      // (le cookie et le localStorage sont deux mécanismes séparés).
      await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: data.token }),
      });

      router.push('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  }

  const inputCls =
    'w-full px-4 py-3.5 bg-neutral-50 rounded-xl text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-neutral-300 transition-all';

  return (
    <div className="min-h-[100svh] bg-white flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-[360px] flex flex-col gap-8">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield size={20} className="text-neutral-400" />
            <span className="text-[28px] font-bold tracking-tight text-neutral-900">CHAIR</span>
          </div>
          <p className="text-[13px] text-neutral-400 font-medium uppercase tracking-widest">Administration</p>
          <div
            className={`inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${
              apiEnvironment() === 'PRODUCTION' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            {apiEnvironment()}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {error && (
            <div className="px-4 py-3 bg-red-50 rounded-xl text-[13px] text-red-600">
              {error}
            </div>
          )}

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Adresse e-mail admin"
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-neutral-900 text-white font-semibold py-3.5 rounded-xl text-[14px] hover:bg-neutral-700 active:bg-black transition-colors disabled:opacity-50 mt-1"
          >
            {isLoading ? 'Connexion…' : 'Accéder au dashboard'}
          </button>
        </form>

        <p className="text-center text-[12px] text-neutral-300">
          Accès réservé aux administrateurs CHAIR
        </p>
      </div>
    </div>
  );
}
