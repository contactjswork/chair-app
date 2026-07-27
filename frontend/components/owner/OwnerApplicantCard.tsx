'use client';

import Image from 'next/image';
import { ArrowRight, X } from 'lucide-react';

export type ApplicantStatus = 'pending' | 'viewed' | 'interview' | 'accepted' | 'declined';

const STATUS_STYLES: Record<ApplicantStatus, string> = {
  pending:   'bg-amber-100 text-amber-700',
  viewed:    'bg-blue-100 text-blue-700',
  interview: 'bg-neutral-900 text-white',
  accepted:  'bg-green-100 text-green-700',
  declined:  'bg-red-100 text-red-600',
};

export const APPLICANT_STATUS_LABELS: Record<ApplicantStatus, string> = {
  pending:   'Nouveau',
  viewed:    'À contacter',
  interview: 'Entretien',
  accepted:  'Accepté',
  declined:  'Refusé',
};

interface OwnerApplicantCardProps {
  name: string;
  avatarUrl?: string | null;
  status: ApplicantStatus;
  subtitle?: string;
  date: string;
  message?: string;
  expanded?: boolean;
  onToggleExpand?: () => void;
  /** Fait avancer d'une étape dans le pipeline (pending→viewed→interview→accepted). Absent = étape terminale. */
  onAdvance?: () => void;
  advanceLabel?: string;
  /** Toujours disponible tant que le statut n'est pas déjà terminal. */
  onDecline?: () => void;
}

/** Carte candidature — pipeline recrutement (Nouveau/À contacter/Entretien/Accepté/Refusé). */
export default function OwnerApplicantCard({
  name, avatarUrl, status, subtitle, date, message,
  expanded = false, onToggleExpand, onAdvance, advanceLabel, onDecline,
}: OwnerApplicantCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
      <div className="w-full flex items-start gap-3 p-4">
        <button onClick={onToggleExpand} className="flex items-start gap-3 flex-1 min-w-0 text-left">
          <div className="relative w-9 h-9 rounded-full bg-neutral-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
            {avatarUrl
              ? <Image src={avatarUrl} alt="" fill className="object-cover" sizes="36px" />
              : <span className="text-sm font-bold text-neutral-500">{name.charAt(0).toUpperCase()}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-neutral-900">{name}</p>
              <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${STATUS_STYLES[status]}`}>
                {APPLICANT_STATUS_LABELS[status]}
              </span>
            </div>
            {subtitle && <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>}
            <p className="text-[10px] text-neutral-400 mt-0.5">{date}</p>
          </div>
        </button>
      </div>
      {(onAdvance || onDecline) && (
        <div className="flex items-center gap-2 px-4 pb-4">
          {onAdvance && (
            <button onClick={onAdvance}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-neutral-900 text-white py-2 rounded-xl hover:bg-neutral-700 transition-colors">
              {advanceLabel}<ArrowRight size={12} />
            </button>
          )}
          {onDecline && (
            <button onClick={onDecline}
              className="flex items-center justify-center gap-1.5 text-xs font-semibold text-neutral-500 border border-neutral-200 px-3 py-2 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors">
              <X size={12} />Refuser
            </button>
          )}
        </div>
      )}
      {expanded && message && (
        <div className="px-4 pb-4 pt-0 border-t border-neutral-100">
          <p className="text-xs text-neutral-600 pt-3 italic">{message}</p>
        </div>
      )}
    </div>
  );
}
