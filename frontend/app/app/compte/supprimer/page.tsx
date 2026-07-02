'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppShell from '@/components/layout/AppShell';
import { ArrowLeft, Trash2, AlertTriangle, User, CalendarDays, Star, MessageSquare } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

export default function SupprimerComptePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [error,   setError]       = useState('');
  const [deleted, setDeleted]     = useState(false);

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

  if (deleted) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto px-4 flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center">
            <Trash2 size={24} className="text-neutral-400" />
          </div>
          <h1 className="text-[20px] font-bold text-neutral-900">Compte supprimé</h1>
          <p className="text-[14px] text-neutral-400 leading-relaxed max-w-[280px]">
            Ton compte et toutes tes données ont été supprimés. Tu vas être redirigé dans quelques secondes.
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
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-colors">
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
          <p className="text-[13px] text-red-500 leading-relaxed mb-4">
            La suppression de ton compte entraîne la perte définitive de toutes tes données dans les 30 jours.
          </p>
          <div className="space-y-2.5">
            {[
              { icon: User,         label: 'Ton profil et toutes tes informations' },
              { icon: CalendarDays, label: 'Toutes tes réservations' },
              { icon: Star,         label: 'Tous tes avis laissés' },
              { icon: MessageSquare,label: 'Tes favoris et abonnements' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5">
                <Icon size={14} className="text-red-400 flex-shrink-0" />
                <p className="text-[12px] text-red-500">{label}</p>
              </div>
            ))}
          </div>
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
            className="w-full py-3.5 rounded-2xl text-[14px] font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            Annuler
          </button>
        </div>

        <p className="text-center text-[11px] text-neutral-300 mt-6 px-4">
          Tu peux aussi envoyer une demande à <span className="underline">contact@getchair.app</span>
        </p>
      </div>
    </AppShell>
  );
}
