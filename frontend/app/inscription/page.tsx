'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';


export default function InscriptionPage() {
  const { register } = useAuth();
  const router = useRouter();

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/app');
    }
  }

  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState('');
  const [phone,     setPhone]     = useState('');
  const [password,  setPassword]  = useState('');
  const [showPwd,   setShowPwd]   = useState(false);
  const [error,     setError]     = useState('');
  const [isLoading, setIsLoading] = useState(false);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    setIsLoading(true);
    try {
      await register({
        name,
        email,
        phone: phone || undefined,
        password,
        password_confirmation: password,
        role: 'client',
      } as Parameters<typeof register>[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
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
          <p className="text-[14px] text-neutral-400 mt-1.5">Crée ton compte gratuit.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {error && (
            <div className="px-4 py-3 bg-red-50 rounded-xl text-[13px] text-red-600">
              {error}
            </div>
          )}

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom complet"
            required
            autoComplete="name"
            className={inputCls}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Adresse e-mail"
            required
            autoComplete="email"
            className={inputCls}
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Numéro de téléphone (optionnel)"
            autoComplete="tel"
            className={inputCls}
          />
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe (8 caractères min.)"
              required
              autoComplete="new-password"
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
            {isLoading ? 'Création…' : 'Créer mon compte'}
          </button>

          <p className="text-[11px] text-neutral-400 text-center leading-relaxed">
            En continuant, tu acceptes nos{' '}
            <a href="/cgu" className="underline hover:text-neutral-600">CGU</a>
            {' '}et notre{' '}
            <a href="/confidentialite" className="underline hover:text-neutral-600">Politique de confidentialité</a>.
          </p>
        </form>

        {/* Footer */}
        <p className="text-center text-[13px] text-neutral-400">
          Déjà un compte ?{' '}
          <Link href="/connexion" className="font-semibold text-neutral-900 hover:underline">
            Se connecter
          </Link>
        </p>

      </div>
    </div>
  );
}
