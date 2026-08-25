'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppShell from '@/components/layout/AppShell';
import { ArrowLeft, Trash2, AlertTriangle, User, CalendarDays, Star, Heart, Bell, EyeOff, LogIn } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

export default function SupprimerComptePage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [error,   setError]       = useState('');
  const [deleted, setDeleted]     = useState(false);

  // L'écran est partagé par l'app cliente et l'espace pro (voir
  // /pro/compte). Un compte pro perd en plus sa fiche publique et ses
  // publications — il faut le lui annoncer, pas le lui faire découvrir.
  const isPro = user?.role === 'hairdresser' || user?.role === 'salon_owner';

  async function handleDelete() {
    if (confirm !== 'SUPPRIMER') return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('chair_token');
      const res = await fetch(`${API}/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (!res.ok) throw new Error();
      setDeleted(true);
      setTimeout(() => {
        logout();
        router.replace('/');
      }, 3000);
    } catch {
      setError('Une erreur est survenue. Réessaie ou contacte contact@getchair.app.');
    } finally {
      setLoading(false);
    }
  }

  // La page est volontairement hors garde d'authentification (PUBLIC_PREFIXES
  // dans app/app/layout.tsx) pour rester atteignable depuis CHAIR PRO et
  // depuis le pied de page du site. Sans cet état, un visiteur déconnecté
  // arrivait sur le formulaire, tapait SUPPRIMER, et récoltait une erreur
  // générique — un cul-de-sac que la review App Store peut rencontrer.
  if (!isLoading && !user && !deleted) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto px-4 flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center">
            <LogIn size={22} className="text-neutral-400" strokeWidth={1.5} />
          </div>
          <h1 className="text-[20px] font-bold text-neutral-900">Connecte-toi d&apos;abord</h1>
          <p className="text-[14px] text-neutral-400 leading-relaxed max-w-[300px]">
            Pour supprimer un compte, il faut être connecté dessus. Tu reviendras
            directement ici après la connexion.
          </p>
          <Link
            href="/connexion?returnTo=%2Fapp%2Fcompte%2Fsupprimer"
            className="mt-2 inline-flex items-center justify-center min-h-[44px] px-6 rounded-2xl bg-neutral-900 text-white text-[14px] font-semibold active:bg-black transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </AppShell>
    );
  }

  if (deleted) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto px-4 flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center">
            <Trash2 size={24} className="text-neutral-400" />
          </div>
          <h1 className="text-[20px] font-bold text-neutral-900">Compte supprimé</h1>
          {/* Formulation exacte de ce que fait DELETE /account côté serveur
              (AuthController::deleteAccount) : ne jamais promettre plus que
              ce qui se passe réellement — guideline App Store 5.1.1(v). */}
          <p className="text-[14px] text-neutral-400 leading-relaxed max-w-[300px]">
            Tes données ont été supprimées et ton identité effacée. Cette adresse e-mail
            ne donne plus accès à rien. Tu vas être redirigé dans quelques secondes.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-lg mx-auto pb-28">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-5 pb-6">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-900 active:text-neutral-900 active:scale-90 transition-all">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-[18px] font-bold text-neutral-900">Supprimer mon compte</h1>
        </div>

        {/* Warning */}
        <div className="mx-4 bg-red-50 border border-red-100 rounded-2xl px-5 py-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
            <p className="text-[14px] font-bold text-red-600">Cette action est irréversible</p>
          </div>
          {/* Chaque ligne correspond à une opération réelle de
              AuthController::deleteAccount — rien de plus, rien de moins.
              Aucun délai de grâce n'existe côté serveur : la suppression est
              immédiate, ne pas annoncer de "30 jours". */}
          <p className="text-[13px] text-red-500 leading-relaxed mb-4">
            Tout se passe immédiatement, dès que tu confirmes. Rien n&apos;est récupérable ensuite,
            et tu ne pourras plus te reconnecter avec cette adresse e-mail.
          </p>
          <div className="space-y-2.5">
            {[
              { icon: User,         label: 'Ton nom, ton e-mail, ton téléphone, ta ville, ta photo et ta bio sont effacés' },
              { icon: CalendarDays, label: 'Tes réservations en tant que client sont supprimées' },
              { icon: Star,         label: 'Les avis que tu as laissés sont supprimés' },
              { icon: Heart,        label: 'Tes favoris, abonnements et inspirations sauvegardées sont supprimés' },
              { icon: Bell,         label: 'Tes notifications et tes appareils liés sont supprimés' },
              ...(isPro ? [{ icon: EyeOff, label: 'Ta fiche professionnelle et tes publications sont retirées de CHAIR' }] : []),
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-start gap-2.5">
                <Icon size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-red-500 leading-relaxed">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Honnêteté sur ce qui subsiste : la ligne de compte n'est pas
            détruite (elle porte des données appartenant à d'autres
            personnes), elle est vidée de tout ce qui identifie. Le dire
            explicitement plutôt que de laisser croire à un effacement
            physique total — 5.1.1(i)/(v). */}
        <div className="mx-4 bg-neutral-50 rounded-2xl px-5 py-4 mb-6">
          <p className="text-[12px] text-neutral-500 leading-relaxed">
            Ce qui subsiste : les rendez-vous et avis qui appartiennent à d&apos;autres personnes
            {isPro ? ' (les avis que des clients t’ont laissés, l’historique de ton salon)' : ' (l’historique du professionnel qui t’a reçu)'}
            {' '}restent chez elles, sans plus aucun lien avec ton identité. Ton compte devient
            un compte anonyme, sans nom ni contact, que personne ne peut rouvrir.
          </p>
        </div>

        {/* Confirmation */}
        <div className="mx-4 space-y-4">
          <div>
            <p className="text-[13px] font-semibold text-neutral-900 mb-2">
              Pour confirmer, tape <span className="font-bold">SUPPRIMER</span> ci-dessous :
            </p>
            <input
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.toUpperCase())}
              placeholder="SUPPRIMER"
              className="w-full px-4 py-3.5 bg-neutral-50 rounded-xl text-[14px] text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-red-300 transition-all tracking-widest font-mono"
            />
          </div>

          {error && (
            <p className="text-[12px] text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>
          )}

          <button
            onClick={handleDelete}
            disabled={confirm !== 'SUPPRIMER' || loading}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-[14px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-red-500 text-white active:bg-red-600"
          >
            <Trash2 size={16} />
            {loading ? 'Suppression…' : 'Supprimer définitivement mon compte'}
          </button>

          <button
            onClick={() => router.back()}
            className="w-full py-3.5 rounded-2xl text-[14px] font-medium text-neutral-500 hover:text-neutral-900 active:text-neutral-900 active:bg-neutral-50 transition-colors"
          >
            Annuler
          </button>
        </div>

        {/* La suppression se fait entièrement ici, sans contacter personne
            (5.1.1(v)). Cette adresse n'est qu'un recours en cas de question —
            elle sert aussi de contact publié au sens de la guideline 1.2. */}
        <p className="text-center text-[11px] text-neutral-300 mt-6 px-4 leading-relaxed">
          Une question avant de te décider ? Écris-nous à{' '}
          <a href="mailto:contact@getchair.app" className="underline">contact@getchair.app</a>
        </p>
      </div>
    </AppShell>
  );
}
