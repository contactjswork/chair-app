'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface Props {
  /** Nom du badge tel que défini dans BadgeService (backend/app/Services/BadgeService.php) */
  label: string;
  points: number;
  onDone: () => void;
}

/**
 * Toast de célébration affiché quand une action de l'onboarding débloque un
 * vrai badge (points réels issus de BadgeService — jamais inventés côté front).
 */
export default function BadgeUnlockToast({ label, points, onDone }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 20);
    const hideTimer = setTimeout(() => setVisible(false), 2600);
    const doneTimer = setTimeout(onDone, 3000);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); clearTimeout(doneTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`fixed top-safe-header inset-x-0 z-[70] flex justify-center px-5 pointer-events-none transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'
      }`}
      style={{ marginTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
    >
      <div className="flex items-center gap-2.5 bg-neutral-900 text-white rounded-2xl pl-3 pr-4 py-2.5 shadow-xl">
        <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0 animate-pop-in">
          <Sparkles size={14} className="text-white" />
        </div>
        <div className="text-left">
          <p className="text-[12px] font-bold leading-tight">{label}</p>
          <p className="text-[10px] text-white/50 leading-tight">+{points} pts</p>
        </div>
      </div>
    </div>
  );
}
