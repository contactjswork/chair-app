'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';

interface OwnerTeamMemberProps {
  avatarUrl?: string | null;
  name: string;
  subtitle?: string;
  actions?: ReactNode;
  variant?: 'card' | 'inline';
}

/** Ligne membre d'équipe — utilisée pour l'équipe du salon (équipe.tsx, salon.tsx). */
export default function OwnerTeamMember({ avatarUrl, name, subtitle, actions, variant = 'card' }: OwnerTeamMemberProps) {
  const isCard = variant === 'card';
  const outer = isCard
    ? 'bg-white rounded-2xl border border-neutral-100 p-3.5 flex items-center gap-3'
    : 'bg-neutral-50 rounded-xl p-3 flex items-center gap-3';
  const avatarSize = isCard ? 40 : 36;
  const avatarClass = isCard ? 'w-10 h-10' : 'w-9 h-9';

  return (
    <div className={outer}>
      <div className={`relative ${avatarClass} rounded-full bg-neutral-200 flex-shrink-0 overflow-hidden`}>
        {avatarUrl
          ? <Image src={avatarUrl} alt="" fill className="object-cover" sizes={`${avatarSize}px`} />
          : <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-neutral-500">{name.charAt(0).toUpperCase()}</span>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-neutral-900 truncate">{name}</p>
        {subtitle && <p className="text-xs text-neutral-400 truncate">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
