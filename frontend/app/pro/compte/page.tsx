'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { ChevronLeft, Check, LogOut, Trash2 } from 'lucide-react';

/**
 * Page "Mon compte" pour un gérant de salon — l'équivalent de /pro/profil
 * (édition de profil coiffeur) n'a pas de sens pour un gérant pur ; avant
 * cette page, le lien "Profil" de la nav gérant menait nulle part d'utile
 * (redirigé par useRequireAuth, faute de profil coiffeur).
 */
export default function ProComptePage() {
  const { user, isLoading } = useRequireAuth(['salon_owner']);
  const { updateUser, logout } = useAuth();
  const router = useRouter();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState(user?.city ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState('');

  if (isLoading || !user) {
    return <div className="min-h-screen bg-neutral-50 flex items-center justify-center"><div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" /></div>;
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api.put('/user/profile', { name, city, phone });
      updateUser({ name, city });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== newPasswordConfirm) {
      setPwError('Les mots de passe ne correspondent pas.');
      return;
    }
    setPwSaving(true);
    setPwError('');
    setPwSaved(false);
    try {
      await api.put('/user/password', {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: newPasswordConfirm,
      });
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 2500);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Erreur lors du changement de mot de passe.');
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
        <div className="flex items-center gap-3 mb-6 md:hidden">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-100 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-neutral-900">Mon compte</h1>
        </div>
        <div className="hidden md:block mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">Mon compte</h1>
          <p className="text-sm text-neutral-400 mt-0.5">Vos informations personnelles</p>
        </div>

        <form onSubmit={handleSaveProfile} className="bg-white rounded-[24px] shadow-[0_4px_18px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-50 p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-neutral-400 mb-1.5">Nom complet</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 transition-all" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-neutral-400 mb-1.5">Email</label>
            <input type="email" value={user.email} disabled
              className="w-full px-4 py-3 rounded-xl bg-neutral-50 text-sm text-neutral-400" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-neutral-400 mb-1.5">Téléphone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="06 12 34 56 78"
              className="w-full px-4 py-3 rounded-xl bg-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 transition-all" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-neutral-400 mb-1.5">Ville</label>
            <input type="text" value={city ?? ''} onChange={(e) => setCity(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 transition-all" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white font-bold py-3.5 rounded-2xl text-sm hover:bg-neutral-700 active:scale-[0.98] transition-all disabled:opacity-60">
            {saved ? <><Check size={15} />Enregistré</> : saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>

        <form onSubmit={handleChangePassword} className="bg-white rounded-[24px] shadow-[0_4px_18px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-50 p-5 space-y-4 mt-4">
          <h2 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.18em]">Mot de passe</h2>
          <div>
            <label className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-neutral-400 mb-1.5">Mot de passe actuel</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl bg-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 transition-all" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-neutral-400 mb-1.5">Nouveau mot de passe</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8}
              className="w-full px-4 py-3 rounded-xl bg-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 transition-all" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-neutral-400 mb-1.5">Confirmer</label>
            <input type="password" value={newPasswordConfirm} onChange={(e) => setNewPasswordConfirm(e.target.value)} required minLength={8}
              className="w-full px-4 py-3 rounded-xl bg-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 transition-all" />
          </div>

          {pwError && <p className="text-sm text-red-600">{pwError}</p>}

          <button type="submit" disabled={pwSaving}
            className="w-full flex items-center justify-center gap-2 bg-neutral-50 text-neutral-700 font-bold py-3.5 rounded-2xl text-sm hover:bg-neutral-100 active:scale-[0.98] transition-all disabled:opacity-60">
            {pwSaved ? <><Check size={15} />Mis à jour</> : pwSaving ? 'Mise à jour...' : 'Changer le mot de passe'}
          </button>
        </form>

        <button onClick={logout}
          className="w-full flex items-center justify-center gap-2 text-sm text-neutral-400 hover:text-red-500 transition-colors mt-6 py-2">
          <LogOut size={14} />Se déconnecter
        </button>

        {/* Navigation interne, surtout PAS target="_blank" : dans l'app native
            (Capacitor) un _blank sort vers Safari, où la session n'existe pas —
            la suppression de compte y était donc impossible. La page
            /app/compte/supprimer est accessible aux comptes pro (PUBLIC_PREFIXES). */}
        <Link href="/app/compte/supprimer"
          className="w-full flex items-center justify-center gap-2 text-xs text-neutral-300 hover:text-red-500 transition-colors mt-2 py-2">
          <Trash2 size={12} />Supprimer mon compte
        </Link>
      </div>
    </div>
  );
}
