'use client';

import { useState } from 'react';
import { Building2, Scissors } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isProBinary, isBusinessBinary } from '@/lib/appContext';
import { BUSINESS_APP_STORE_URL } from '@/lib/appDownload';

function Spinner() {
  return <span className="w-3 h-3 border-2 border-neutral-300 border-t-neutral-700 rounded-full animate-spin" />;
}

/**
 * Double identité gérant/coiffeur — ne s'affiche que pour un compte qui
 * possède réellement les deux capacités (canManageSalon + hasHairdresserProfile).
 * Bascule instantanée, sans déconnexion — voir AuthContext::switchProMode().
 *
 * `pendingMode` (pas juste un booléen "switching") garde le libellé du mode
 * VISÉ affiché avec son spinner pendant la requête + la navigation qui suit :
 * sans ça, le seul repli visuel était un léger opacity-50, pas assez visible
 * pour comprendre qu'un changement est en cours ("on comprend pas ce qui se
 * passe" — retour direct).
 */
export default function ProModeSwitcher({ compact = false }: { compact?: boolean }) {
  const { user, switchProMode } = useAuth();
  const [pendingMode, setPendingMode] = useState<'salon_owner' | 'hairdresser' | null>(null);

  if (!user?.can_manage_salon || !user?.has_hairdresser_profile) return null;

  // Plus de bascule de mode DANS l'app native (décision Julien 02/09/2026),
  // et un bouton de switch doit VRAIMENT changer d'app (retour Julien
  // 15/09) : dans le binaire CHAIR PRO, « Ouvrir CHAIR BUSINESS » sort vers
  // la fiche App Store (ou l'espace web tant qu'elle n'est pas publiée) —
  // jamais une navigation interne vers un écran intermédiaire. Sur le web,
  // la bascule instantanée reste.
  if (isProBinary()) {
    return (
      <a
        href={BUSINESS_APP_STORE_URL || 'https://getchair.app/business'}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white rounded-full text-[11px] font-semibold hover:bg-neutral-700 transition-colors ${compact ? '' : 'w-full'}`}
      >
        <Building2 size={12} /> Ouvrir CHAIR BUSINESS
      </a>
    );
  }
  // Binaire BUSINESS : pas de bascule non plus — l'activité coiffeur vit
  // dans l'app CHAIR PRO, rien à proposer ici.
  if (isBusinessBinary()) {
    return null;
  }

  const activeMode = user.active_pro_mode ?? user.role;
  const switching = pendingMode !== null;

  async function handleSwitch(mode: 'salon_owner' | 'hairdresser') {
    if (mode === activeMode || switching) return;
    setPendingMode(mode);
    try {
      await switchProMode(mode);
      // pendingMode reste affiché jusqu'au démontage de ce composant par la
      // navigation qui suit — pas de setPendingMode(null) ici : ça éviterait
      // un flash "retour à l'ancien mode" juste avant que la page change.
    } catch {
      setPendingMode(null);
    }
  }

  return (
    <div className={`flex bg-neutral-100 rounded-full p-0.5 gap-0.5 ${compact ? '' : 'w-full'}`}>
      <button
        onClick={() => handleSwitch('salon_owner')}
        disabled={switching}
        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors disabled:opacity-70 ${
          activeMode === 'salon_owner' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
        }`}
      >
        {pendingMode === 'salon_owner' ? <Spinner /> : <Building2 size={12} />}Gérant
      </button>
      <button
        onClick={() => handleSwitch('hairdresser')}
        disabled={switching}
        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors disabled:opacity-70 ${
          activeMode === 'hairdresser' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
        }`}
      >
        {pendingMode === 'hairdresser' ? <Spinner /> : <Scissors size={12} />}Coiffeur
      </button>
    </div>
  );
}
