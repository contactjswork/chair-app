'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, X, ChevronDown, ChevronUp, ChevronRight, Mail, Phone } from 'lucide-react';

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
  /** Profil public du candidat — navigation interne, jamais un nouvel onglet. */
  profileHref?: string;
  /** Coordonnées transmises par le candidat en postulant. Absentes = état vide honnête. */
  email?: string | null;
  phone?: string | null;
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
  name, avatarUrl, status, subtitle, date, message, profileHref, email, phone,
  expanded = false, onToggleExpand, onAdvance, advanceLabel, onDecline,
}: OwnerApplicantCardProps) {
  const hasContact = Boolean(email || phone);

  return (
    <div className="bg-white rounded-[22px] shadow-[0_4px_16px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-100 overflow-hidden">
      <div className="w-full flex items-start gap-3 p-4">
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
          {profileHref && (
            // Navigation interne : target="_blank" éjecterait vers Safari dans
            // l'app Capacitor, où le gérant n'est pas connecté.
            <Link href={profileHref}
              className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900 mt-1.5 min-h-[24px]">
              Voir le profil<ChevronRight size={12} className="text-neutral-400" />
            </Link>
          )}
        </div>
        {onToggleExpand && (
          <button onClick={onToggleExpand}
            aria-expanded={expanded}
            aria-label={expanded ? 'Masquer les détails' : 'Voir les détails'}
            className="w-11 h-11 -mt-2 -mr-2 flex items-center justify-center text-neutral-400 hover:text-neutral-700 flex-shrink-0">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-3 border-t border-neutral-100 space-y-3">
          {message && <p className="text-xs text-neutral-600 italic">{message}</p>}

          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Contact</p>
            {hasContact ? (
              <div className="flex flex-col gap-1.5">
                {email && (
                  <a href={`mailto:${email}`}
                    className="flex items-center gap-2 min-h-[44px] px-3 rounded-xl bg-neutral-50 text-sm text-neutral-700 hover:bg-neutral-100 transition-colors">
                    <Mail size={13} className="text-neutral-400 flex-shrink-0" />
                    <span className="truncate">{email}</span>
                  </a>
                )}
                {phone && (
                  <a href={`tel:${phone.replace(/\s/g, '')}`}
                    className="flex items-center gap-2 min-h-[44px] px-3 rounded-xl bg-neutral-50 text-sm text-neutral-700 hover:bg-neutral-100 transition-colors">
                    <Phone size={13} className="text-neutral-400 flex-shrink-0" />
                    <span className="truncate">{phone}</span>
                  </a>
                )}
              </div>
            ) : (
              <p className="text-xs text-neutral-400">Le candidat n’a renseigné aucune coordonnée sur son compte.</p>
            )}
          </div>
        </div>
      )}

      {(onAdvance || onDecline) && (
        <div className="flex items-center gap-2 px-4 pb-4">
          {onAdvance && (
            <button onClick={onAdvance}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-neutral-900 text-white min-h-[44px] rounded-xl hover:bg-neutral-700 transition-colors">
              {advanceLabel}<ArrowRight size={12} />
            </button>
          )}
          {onDecline && (
            <button onClick={onDecline}
              className="flex items-center justify-center gap-1.5 text-xs font-semibold text-neutral-500 border border-neutral-200 px-3 min-h-[44px] rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors">
              <X size={12} />Refuser
            </button>
          )}
        </div>
      )}
    </div>
  );
}
