'use client';

import { GraduationCap, MapPin, Pencil, Trash2 } from 'lucide-react';

interface OwnerOfferCardProps {
  title: string;
  status: 'open' | 'closed';
  contractLabel: string;
  jobTypeLabel: string;
  levelLabel?: string;
  city?: string;
  description?: string;
  onToggleStatus?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

/** Carte offre d'emploi — liste recrutement.tsx. */
export default function OwnerOfferCard({
  title, status, contractLabel, jobTypeLabel, levelLabel, city, description,
  onToggleStatus, onEdit, onDelete,
}: OwnerOfferCardProps) {
  return (
    <div className={`bg-white rounded-[22px] shadow-[0_4px_16px_-8px_rgba(10,10,10,0.1)] ring-1 ring-neutral-100 p-4 ${status !== 'open' ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-bold text-neutral-900 truncate">{title}</p>
            <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full flex-shrink-0 ${
              status === 'open' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'
            }`}>
              {status === 'open' ? 'Ouverte' : 'Fermée'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            <span className="text-[10px] font-semibold bg-neutral-900 text-white px-2 py-0.5 rounded-full">{contractLabel}</span>
            <span className="text-[10px] font-semibold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">{jobTypeLabel}</span>
            {levelLabel && (
              <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <GraduationCap size={9} />{levelLabel}
              </span>
            )}
            {city && (
              <span className="text-[10px] text-neutral-400 flex items-center gap-0.5">
                <MapPin size={9} />{city}
              </span>
            )}
          </div>
          {description && <p className="text-xs text-neutral-500 mt-1.5 line-clamp-2">{description}</p>}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onToggleStatus && (
            <button onClick={onToggleStatus} className="text-xs text-neutral-500 border border-neutral-200 px-2.5 py-1.5 rounded-xl hover:bg-neutral-50 transition-colors">
              {status === 'open' ? 'Fermer' : 'Rouvrir'}
            </button>
          )}
          {onEdit && (
            <button onClick={onEdit} aria-label="Modifier" className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors text-neutral-500">
              <Pencil size={13} />
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} aria-label="Supprimer" className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-colors text-neutral-500">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
