'use client';

import Image from 'next/image';
import { Camera, ChevronRight, Euro } from 'lucide-react';

export type ChairStatus = 'draft' | 'available' | 'rented' | 'disabled';

const STATUS_STYLES: Record<ChairStatus, string> = {
  draft:     'bg-amber-100 text-amber-700',
  available: 'bg-green-100 text-green-700',
  rented:    'bg-blue-100 text-blue-700',
  disabled:  'bg-neutral-100 text-neutral-500',
};
const STATUS_LABELS: Record<ChairStatus, string> = {
  draft:     'Brouillon',
  available: 'Disponible',
  rented:    'Loué',
  disabled:  'Suspendu',
};

interface OwnerChairCardProps {
  title: string;
  thumbnailUrl?: string | null;
  photoCount?: number;
  pricePerDay?: number | null;
  status: ChairStatus;
  hint?: string;
  onClick?: () => void;
  /** true quand une bande d'actions est ajoutée par l'appelant en dessous — retire le cadre/arrondi propre pour ne pas les dupliquer. */
  bare?: boolean;
}

/** Carte annonce fauteuil — dashboard de gestion côté gérant (fauteuils.tsx). */
export default function OwnerChairCard({ title, thumbnailUrl, photoCount, pricePerDay, status, hint, onClick, bare }: OwnerChairCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white overflow-hidden hover:bg-neutral-50 transition-colors flex ${
        bare ? '' : `rounded-2xl border ${status === 'disabled' ? 'border-neutral-100' : 'border-neutral-100'}`
      } ${status === 'disabled' ? 'opacity-60' : ''}`}
    >
      <div className="w-24 h-24 bg-neutral-100 flex-shrink-0 relative">
        {thumbnailUrl ? (
          <Image src={thumbnailUrl} alt="" fill className="object-cover" sizes="96px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Camera size={20} className="text-neutral-300" />
          </div>
        )}
        {!!photoCount && (
          <span className="absolute bottom-1 right-1 text-[9px] bg-black/50 text-white px-1 rounded font-medium">
            {photoCount}
          </span>
        )}
      </div>
      <div className="flex-1 p-3 min-w-0">
        <div className="flex items-start justify-between gap-1 mb-1">
          <p className="text-sm font-bold text-neutral-900 line-clamp-1">{title}</p>
          <ChevronRight size={14} className="text-neutral-300 flex-shrink-0" />
        </div>
        <div className="flex gap-2 text-xs text-neutral-500 mb-1.5">
          {pricePerDay != null && <span className="flex items-center gap-0.5"><Euro size={9} />{pricePerDay}€/j</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${STATUS_STYLES[status]}`}>
            {STATUS_LABELS[status]}
          </span>
          {hint && <span className="text-[9px] text-amber-600 font-medium">{hint}</span>}
        </div>
      </div>
    </button>
  );
}
