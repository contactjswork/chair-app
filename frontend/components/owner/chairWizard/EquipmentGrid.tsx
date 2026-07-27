'use client';

import {
  Frame, Armchair, Droplets, Wifi, Snowflake, Flame, Car, Coffee,
  Package, CreditCard, Building2, TrainFront, Accessibility, Check,
} from 'lucide-react';
import { CHAIR_EQUIPMENT_LABELS, type ChairEquipmentKey } from '@/lib/types';

const EQUIPMENT_ICONS: Record<ChairEquipmentKey, typeof Frame> = {
  mirror: Frame,
  premium_chair: Armchair,
  sink: Droplets,
  wifi: Wifi,
  ac: Snowflake,
  heating: Flame,
  parking: Car,
  break_room: Coffee,
  products_included: Package,
  card_terminal: CreditCard,
  city_center: Building2,
  near_station: TrainFront,
  pmr: Accessibility,
};

interface Props {
  selected: ChairEquipmentKey[];
  onToggle?: (key: ChairEquipmentKey) => void;
  readOnly?: boolean;
}

/** Grille de grosses cartes équipements — sélection (wizard) ou affichage seul (fiche annonce). */
export default function EquipmentGrid({ selected, onToggle, readOnly }: Props) {
  const keys = readOnly ? selected : (Object.keys(CHAIR_EQUIPMENT_LABELS) as ChairEquipmentKey[]);

  if (readOnly && keys.length === 0) {
    return <p className="text-sm text-neutral-400">Aucun équipement renseigné.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {keys.map((key) => {
        const Icon = EQUIPMENT_ICONS[key];
        const isSelected = selected.includes(key);
        return (
          <button
            key={key}
            type="button"
            disabled={readOnly}
            onClick={() => onToggle?.(key)}
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 py-5 px-2 text-center transition-all ${
              isSelected
                ? 'border-neutral-900 bg-neutral-900 text-white'
                : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
            } ${readOnly ? 'cursor-default' : ''}`}
          >
            <div className="relative">
              <Icon size={22} strokeWidth={1.75} />
              {isSelected && !readOnly && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-neutral-900 flex items-center justify-center">
                  <Check size={10} strokeWidth={3} />
                </span>
              )}
            </div>
            <span className="text-xs font-semibold leading-tight">{CHAIR_EQUIPMENT_LABELS[key]}</span>
          </button>
        );
      })}
    </div>
  );
}
