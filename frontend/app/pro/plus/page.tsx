'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Building2 } from 'lucide-react';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuth } from '@/contexts/AuthContext';
import { useProNav } from '@/hooks/useProNav';

// Équivalent mobile de la section "Outils" de la sidebar desktop — sans ça,
// ces pages (fauteuils, offres d'emploi, badges, classement...) ne sont
// atteignables que sur desktop puisque ProNav (bottom nav) n'affiche que
// les items "primary".
export default function ProPlusPage() {
  const { isLoading: authLoading } = useRequireAuth(['hairdresser', 'salon_owner']);
  const { user, enableSalonOwnerMode } = useAuth();
  const { secondary } = useProNav();

  const [expanded, setExpanded] = useState(false);
  const [salonName, setSalonName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  async function handleCreateSalon() {
    if (!salonName.trim()) return;
    setCreating(true);
    setError('');
    try {
      await enableSalonOwnerMode(salonName.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la création.');
      setCreating(false);
    }
  }

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="max-w-lg mx-auto px-4 pt-4">
        <DashboardPageHeader title="Plus" />

        {/* Double identité : proposer de créer son salon si le coiffeur n'en gère aucun */}
        {user?.has_hairdresser_profile && !user?.can_manage_salon && (
          <div className="mt-2 mb-4 bg-white rounded-[22px] p-4 shadow-[0_2px_10px_-4px_rgba(10,10,10,0.08)] ring-1 ring-neutral-100">
            {!expanded ? (
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                  <Building2 size={16} className="text-neutral-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-neutral-900">Vous gérez aussi un salon ?</p>
                  <p className="text-xs text-neutral-400">Créez sa page sur CHAIR, sans quitter votre compte.</p>
                </div>
                <button
                  onClick={() => setExpanded(true)}
                  className="text-xs font-semibold bg-neutral-900 text-white px-3.5 py-2 rounded-xl hover:bg-neutral-700 transition-colors flex-shrink-0"
                >
                  Créer
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-bold text-neutral-900">Comment s&apos;appelle votre salon ?</p>
                {error && <p className="text-xs text-red-600">{error}</p>}
                <input
                  type="text"
                  value={salonName}
                  onChange={(e) => setSalonName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSalon(); }}
                  placeholder="Koehler Coiffeur"
                  autoFocus
                  className="w-full px-4 py-3 bg-neutral-50 rounded-xl text-sm ring-1 ring-neutral-200 focus:outline-none focus:ring-neutral-400"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setExpanded(false); setError(''); }}
                    className="flex-1 py-2.5 text-sm font-semibold text-neutral-600 rounded-xl ring-1 ring-neutral-200 hover:bg-neutral-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleCreateSalon}
                    disabled={creating || !salonName.trim()}
                    className="flex-1 py-2.5 text-sm font-semibold bg-neutral-900 text-white rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-50"
                  >
                    {creating ? 'Création...' : 'Créer mon salon'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-2 bg-white rounded-[22px] shadow-[0_2px_10px_-4px_rgba(10,10,10,0.08)] ring-1 ring-neutral-100 divide-y divide-neutral-50 px-4 overflow-hidden">
          {secondary.map(({ href, label, icon: Icon, highlight }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3.5 py-4 hover:bg-neutral-50 transition-colors -mx-4 px-4"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${highlight ? 'bg-neutral-900' : 'bg-neutral-100'}`}>
                <Icon size={16} className={highlight ? 'text-white' : 'text-neutral-600'} strokeWidth={1.5} />
              </div>
              <span className="flex-1 text-sm font-medium text-neutral-900">{label}</span>
              {/* Mis en avant selon la raison d'installation choisie à l'onboarding (pro_goals) */}
              {highlight && (
                <span className="text-[10px] font-bold tracking-wide uppercase text-neutral-400 flex-shrink-0">Pour vous</span>
              )}
              <ChevronRight size={16} className="text-neutral-300 flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
