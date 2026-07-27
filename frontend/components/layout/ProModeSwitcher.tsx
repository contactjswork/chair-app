'use client';

import { useState } from 'react';
import { Building2, Scissors } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Double identité gérant/coiffeur — ne s'affiche que pour un compte qui
 * possède réellement les deux capacités (canManageSalon + hasHairdresserProfile).
 * Bascule instantanée, sans déconnexion — voir AuthContext::switchProMode().
 */
export default function ProModeSwitcher({ compact = false }: { compact?: boolean }) {
  const { user, switchProMode } = useAuth();
  const [switching, setSwitching] = useState(false);

  if (!user?.can_manage_salon || !user?.has_hairdresser_profile) return null;

  const activeMode = user.active_pro_mode ?? user.role;

  async function handleSwitch(mode: 'salon_owner' | 'hairdresser') {
    if (mode === activeMode || switching) return;
    setSwitching(true);
    try {
      await switchProMode(mode);
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className={`flex bg-neutral-100 rounded-full p-0.5 gap-0.5 ${compact ? '' : 'w-full'}`}>
      <button
        onClick={() => handleSwitch('salon_owner')}
        disabled={switching}
        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors disabled:opacity-50 ${
          activeMode === 'salon_owner' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
        }`}
      >
        <Building2 size={12} />Gérant
      </button>
      <button
        onClick={() => handleSwitch('hairdresser')}
        disabled={switching}
        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors disabled:opacity-50 ${
          activeMode === 'hairdresser' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
        }`}
      >
        <Scissors size={12} />Coiffeur
      </button>
    </div>
  );
}
